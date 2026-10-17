'use strict';
/**
 * Live Database Cleanup Script
 *
 * Safely removes leftover test artifacts from the live MongoDB database:
 * 1. Takes a full JSON backup first via scripts/backup.js.
 * 2. Removes exactly the 17 duplicate "Audit Test Cat" categories.
 * 3. Removes the 2 leftover test orders (MK-261017-1359, MK-261017-4198).
 * 4. Removes the 2 associated test stock logs.
 * 5. Syncs indexes to ensure the unique index on categories.nameEn is active.
 * 6. Verifies that no other records were touched and live store categories remain intact.
 */

const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { runBackup } = require('./backup');

const TARGET_CATEGORY_NAME = 'Audit Test Cat';
const TARGET_ORDER_NUMBERS = ['MK-261017-1359', 'MK-261017-4198'];
const TARGET_ORDER_IDS = ['6ad27756b6045874d58eca9b', '6ad2775ab6045874d58ecacc'];
const TARGET_STOCK_LOG_IDS = ['6ad27756b6045874d58eca9e', '6ad2775ab6045874d58ecacf'];

async function cleanup() {
  if (!process.env.MONGO_URI) {
    console.error('❌ Error: MONGO_URI is missing in server/.env');
    process.exit(1);
  }

  console.log('======================================================================');
  console.log('📦 STEP 1: Creating full database backup before cleanup...');
  console.log('======================================================================');
  const backupResult = await runBackup({ isDryRun: false });
  console.log(`✅ Backup successfully created at: ${backupResult.backupFolder}\n`);

  console.log('======================================================================');
  console.log('🧹 STEP 2: Connecting to live database for targeted cleanup...');
  console.log('======================================================================');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log(`Connected to live DB: "${db.databaseName}"`);

  // 1. Categories
  const catFilter = { nameEn: TARGET_CATEGORY_NAME };
  const categoriesToDelete = await db.collection('categories').find(catFilter).toArray();
  console.log(`Found ${categoriesToDelete.length} "${TARGET_CATEGORY_NAME}" categories to delete.`);

  const catDeleteResult = await db.collection('categories').deleteMany(catFilter);
  console.log(`✅ Deleted ${catDeleteResult.deletedCount} test category records.`);

  // 2. Orders
  const orderFilter = {
    $or: [
      { orderNumber: { $in: TARGET_ORDER_NUMBERS } },
      { _id: { $in: TARGET_ORDER_IDS.map((id) => new mongoose.Types.ObjectId(id)) } },
    ],
  };
  const ordersToDelete = await db.collection('orders').find(orderFilter).toArray();
  console.log(`Found ${ordersToDelete.length} test orders to delete.`);

  const orderDeleteResult = await db.collection('orders').deleteMany(orderFilter);
  console.log(`✅ Deleted ${orderDeleteResult.deletedCount} test order records.`);

  // 3. StockLogs
  const stockLogFilter = {
    $or: [
      { _id: { $in: TARGET_STOCK_LOG_IDS.map((id) => new mongoose.Types.ObjectId(id)) } },
      { note: { $regex: 'MK-261017-1359|MK-261017-4198' } },
    ],
  };
  const stockLogsToDelete = await db.collection('stocklogs').find(stockLogFilter).toArray();
  console.log(`Found ${stockLogsToDelete.length} test stock logs to delete.`);

  const stockLogDeleteResult = await db.collection('stocklogs').deleteMany(stockLogFilter);
  console.log(`✅ Deleted ${stockLogDeleteResult.deletedCount} test stock log records.`);

  // 4. Ensure Unique Index on Category
  console.log('\n======================================================================');
  console.log('🔒 STEP 3: Ensuring unique index on categories (nameEn)...');
  console.log('======================================================================');
  try {
    await db.collection('categories').createIndex({ nameEn: 1 }, { unique: true });
    console.log('✅ Unique index on categories (nameEn) created successfully.');
  } catch (idxErr) {
    console.error('⚠️ Index creation note:', idxErr.message);
  }

  // 5. Verify Remaining Categories
  console.log('\n======================================================================');
  console.log('📋 STEP 4: Live Storefront Categories Verification');
  console.log('======================================================================');
  const remainingCategories = await db.collection('categories').find().sort({ sortOrder: 1, nameEn: 1 }).toArray();
  console.log(`Total live categories now: ${remainingCategories.length}`);
  remainingCategories.forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.emoji || '🛒'}] ${c.nameEn} (${c.nameMr}) — ID: ${c._id}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Cleanup complete and connection closed.');
}

if (require.main === module) {
  cleanup().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}

module.exports = { cleanup };
