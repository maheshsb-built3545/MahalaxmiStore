'use strict';
/**
 * Daily Automatic MongoDB Backup & Restore Script (Playbook Pass 4.3 & Audit Improvements)
 *
 * Capabilities:
 *  1. One-shot backup: dumps database collections into JSON files.
 *  2. Retention policy: automatically purges local backup snapshots older than 7 days.
 *  3. Continuous daily schedule: run with `--daemon` to run automatically every 24 hours.
 *  4. Safe restore mode: run with `--restore <folderName>`:
 *     - Prints target database name and collection document counts.
 *     - Requires typing the database name to confirm restore (unless --yes / CONFIRM_RESTORE=true).
 *  5. Dry-run mode: run with `--dry-run` to simulate backup or restore without altering data.
 *  6. Off-server storage: uploads snapshots to Backblaze B2 / S3-compatible storage or secondary offsite path.
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');
const https = require('https');
const readline = require('readline');

// Fallback DNS for Atlas on restrictive ISP connections
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

const BACKUP_DIR = path.join(__dirname, '../backups');
const RETENTION_DAYS = 7;

function getTimestampStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `${y}-${m}-${d}_${h}-${min}-${s}`;
}

async function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

async function purgeOldBackups() {
  try {
    const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('backup-')) {
        const fullPath = path.join(BACKUP_DIR, entry.name);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          console.log(`🧹  Purging expired local backup snapshot (> ${RETENTION_DAYS} days): ${entry.name}`);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Warning during backup cleanup:', err.message);
  }
}

// ── S3-Compatible / Backblaze B2 Offsite Cloud Uploader (Native SigV4) ──────────
function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmacSha256('AWS4' + key, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, 'aws4_request');
}

async function uploadToS3(bucket, endpoint, keyId, secretKey, region, objectKey, fileBuffer) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const host = endpoint.includes('://') ? new URL(endpoint).host : endpoint;
    const pathUri = `/${bucket}/${encodeURI(objectKey)}`;
    const payloadHash = sha256Hex(fileBuffer);

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${pathUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
    const signingKey = getSignatureKey(secretKey, dateStamp, region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${keyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const req = https.request(
      {
        method: 'PUT',
        hostname: host,
        path: pathUri,
        headers: {
          Host: host,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          Authorization: authorization,
          'Content-Length': fileBuffer.length,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            reject(new Error(`S3 upload failed with HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function uploadOffsite(snapshotDir, snapshotName, isDryRun = false) {
  const bucket = process.env.BACKUP_S3_BUCKET;
  const endpoint = process.env.BACKUP_S3_ENDPOINT || 's3.us-west-004.backblazeb2.com';
  const keyId = process.env.BACKUP_S3_KEY;
  const secretKey = process.env.BACKUP_S3_SECRET;
  const region = process.env.BACKUP_S3_REGION || 'us-west-004';
  const offsiteLocalPath = process.env.BACKUP_OFFSITE_PATH;

  let uploadedCount = 0;

  if (bucket && keyId && secretKey) {
    console.log(`\n☁️  Uploading snapshot to Backblaze B2 / S3 storage (bucket: ${bucket})...`);
    if (isDryRun) {
      console.log('  [DRY-RUN] S3 upload simulated successfully.');
      return;
    }

    const files = fs.readdirSync(snapshotDir);
    for (const file of files) {
      const fullPath = path.join(snapshotDir, file);
      const buffer = fs.readFileSync(fullPath);
      const objectKey = `backups/${snapshotName}/${file}`;
      await uploadToS3(bucket, endpoint, keyId, secretKey, region, objectKey, buffer);
      console.log(`  ✓ Uploaded to cloud: ${objectKey}`);
      uploadedCount++;
    }
    console.log(`☁️  Successfully uploaded ${uploadedCount} snapshot files to cloud.`);
  }

  if (offsiteLocalPath) {
    console.log(`\n💾 Copying snapshot to offsite destination: ${offsiteLocalPath}`);
    if (isDryRun) {
      console.log('  [DRY-RUN] Offsite directory copy simulated successfully.');
      return;
    }
    const destDir = path.join(offsiteLocalPath, snapshotName);
    fs.mkdirSync(destDir, { recursive: true });
    const files = fs.readdirSync(snapshotDir);
    for (const file of files) {
      fs.copyFileSync(path.join(snapshotDir, file), path.join(destDir, file));
    }
    console.log(`  ✓ Mirrored snapshot to ${destDir}`);
  }

  if (!bucket && !offsiteLocalPath) {
    console.log(`\nℹ️  Off-server storage not configured.`);
    console.log(`   To enable Backblaze B2 / S3 offsite backups, configure in .env:`);
    console.log(`   BACKUP_S3_BUCKET, BACKUP_S3_ENDPOINT, BACKUP_S3_KEY, BACKUP_S3_SECRET`);
    console.log(`   Or set BACKUP_OFFSITE_PATH for a mounted secondary drive.`);
  }
}

// ── Interactive Prompt Helper ──────────────────────────────────────────────────
function askConfirmation(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Core Backup Routine ────────────────────────────────────────────────────────
async function runBackup(options = {}) {
  const isDryRun = Boolean(options.isDryRun);

  console.log(`\n======================================================`);
  console.log(`📦  Starting Mahalaxmi Kirana DB Backup [${new Date().toISOString()}]`);
  if (isDryRun) console.log(`🔍  [DRY-RUN MODE ACTIVE — No files will be written]`);
  console.log(`======================================================`);

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables (.env).');
  }

  if (!isDryRun) {
    await ensureBackupDirectory();
  }

  const isAlreadyConnected = mongoose.connection.readyState === 1;
  if (!isAlreadyConnected) {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const snapshotName = `backup-${getTimestampStr()}`;
  const targetDir = path.join(BACKUP_DIR, snapshotName);
  if (!isDryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const summary = {
    snapshotName,
    createdAt: new Date().toISOString(),
    collections: {},
    totalDocuments: 0,
    isDryRun,
  };

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const collection = db.collection(colName);
    const count = await collection.countDocuments({});

    if (!isDryRun) {
      const docs = await collection.find({}).toArray();
      const filePath = path.join(targetDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    }

    summary.collections[colName] = count;
    summary.totalDocuments += count;

    console.log(`  ✓ ${colName.padEnd(25)} : ${count} documents ${isDryRun ? '(simulated)' : 'saved'}`);
  }

  if (!isDryRun) {
    const metaPath = path.join(targetDir, 'metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log(`\n🎉  Backup successful!`);
    console.log(`📁  Location : ${targetDir}`);
    console.log(`📊  Total docs: ${summary.totalDocuments} across ${Object.keys(summary.collections).length} collections`);

    await purgeOldBackups();
    await uploadOffsite(targetDir, snapshotName, false);
  } else {
    console.log(`\n🎉  [DRY-RUN] Backup simulation completed!`);
    console.log(`📊  Total docs found: ${summary.totalDocuments} across ${Object.keys(summary.collections).length} collections`);
    await uploadOffsite(targetDir, snapshotName, true);
  }

  return summary;
}

// ── Core Restore Routine ───────────────────────────────────────────────────────
async function runRestore(targetFolder, options = {}) {
  const isDryRun = Boolean(options.isDryRun);
  const forceYes = Boolean(options.forceYes || process.env.CONFIRM_RESTORE === 'true');

  console.log(`\n======================================================`);
  console.log(`♻️   Starting Database Restore from: ${targetFolder}`);
  if (isDryRun) console.log(`🔍  [DRY-RUN MODE ACTIVE — No database changes will be made]`);
  console.log(`======================================================`);

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_RESTORE) {
    throw new Error('Restore is safety-blocked in production. Set ALLOW_PROD_RESTORE=true if intentional.');
  }

  let folderPath = targetFolder;
  if (!path.isAbsolute(folderPath)) {
    const cwdRelative = path.resolve(process.cwd(), folderPath);
    const backupDirRelative = path.join(BACKUP_DIR, folderPath);
    if (fs.existsSync(cwdRelative)) {
      folderPath = cwdRelative;
    } else if (fs.existsSync(backupDirRelative)) {
      folderPath = backupDirRelative;
    } else {
      folderPath = backupDirRelative; // default for clear error message
    }
  }

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Backup folder not found: ${folderPath}`);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  const db = mongoose.connection.db;
  const targetDbName = db.databaseName;
  const files = fs.readdirSync(folderPath);

  // Calculate document counts from snapshot files
  const snapshotCounts = {};
  let totalDocsInSnapshot = 0;

  for (const file of files) {
    if (file === 'metadata.json' || !file.endsWith('.json')) continue;
    const colName = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));
    const docCount = Array.isArray(content) ? content.length : 0;
    snapshotCounts[colName] = docCount;
    totalDocsInSnapshot += docCount;
  }

  console.log(`\n🎯  Target Database     : "${targetDbName}"`);
  console.log(`📁  Snapshot Folder     : "${folderPath}"`);
  console.log(`📊  Snapshot Collections & Document Counts:`);
  for (const [col, cnt] of Object.entries(snapshotCounts)) {
    console.log(`    - ${col.padEnd(22)}: ${cnt} documents`);
  }
  console.log(`    Total documents to restore: ${totalDocsInSnapshot}`);

  if (isDryRun) {
    console.log(`\n✅  [DRY-RUN] Restore simulation finished. Database "${targetDbName}" was NOT modified.`);
    return { targetDbName, snapshotCounts, totalDocsInSnapshot, isDryRun: true };
  }

  // Mandatory confirmation by typing target database name
  if (!forceYes) {
    console.log(`\n⚠️  WARNING: Restoring will DELETE all existing data in "${targetDbName}" and overwrite with snapshot!`);
    const prompt = `To confirm, please type the database name ("${targetDbName}"): `;
    const confirmation = await askConfirmation(prompt);

    if (confirmation !== targetDbName) {
      throw new Error(`Restore aborted: Typed "${confirmation}" does not match target database "${targetDbName}".`);
    }
    console.log('✓ Confirmation verified. Proceeding with restore...');
  }

  for (const file of files) {
    if (file === 'metadata.json' || !file.endsWith('.json')) continue;
    const colName = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(folderPath, file), 'utf8'));

    if (Array.isArray(content) && content.length > 0) {
      const col = db.collection(colName);
      await col.deleteMany({});
      await col.insertMany(content);
      console.log(`  ✓ Restored ${colName.padEnd(25)} : ${content.length} docs`);
    } else {
      console.log(`  ℹ ${colName.padEnd(25)} : 0 docs (skipped)`);
    }
  }

  console.log(`\n✅  Restore completed successfully into "${targetDbName}"!`);
  return { targetDbName, snapshotCounts, totalDocsInSnapshot, isDryRun: false };
}

// ── Execution Entrypoint ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const forceYes = args.includes('--yes') || args.includes('-y');

  try {
    if (args.includes('--restore')) {
      const folderIdx = args.indexOf('--restore') + 1;
      const folderName = args[folderIdx];
      if (!folderName || folderName.startsWith('--')) {
        console.error('❌  Error: Specify backup folder name: node backup.js --restore <folder> [--dry-run] [--yes]');
        process.exit(1);
      }
      await runRestore(folderName, { isDryRun, forceYes });
    } else if (args.includes('--daemon')) {
      console.log('⏰  Backup daemon active. Running initial backup, then every 24 hours...');
      await runBackup({ isDryRun });
      setInterval(async () => {
        try {
          await runBackup({ isDryRun });
        } catch (e) {
          console.error('❌  Scheduled backup error:', e.message);
        }
      }, 24 * 60 * 60 * 1000);
      return; // Keep daemon process alive
    } else {
      await runBackup({ isDryRun });
    }
  } catch (err) {
    console.error('❌  Backup/Restore failed:', err.message);
    process.exit(1);
  } finally {
    if (!args.includes('--daemon')) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { runBackup, runRestore };
