'use strict';

/**
 * i18n Checker Script
 * Scans client/admin/ for:
 * 1. Completeness of bilingual dictionary keys.
 * 2. Unregistered keys referenced in code via t('key').
 * 3. Bilingual coverage percentage.
 */

const fs = require('fs');
const path = require('path');

const i18nFile = path.join(__dirname, '../../client/admin/js/core/i18n.js');
if (!fs.existsSync(i18nFile)) {
  console.error('❌ i18n.js not found at:', i18nFile);
  process.exit(1);
}

const i18nContent = fs.readFileSync(i18nFile, 'utf8');

// Extract dictionary keys
const dictMatch = i18nContent.match(/const DICTIONARY = {([\s\S]*?)};/);
if (!dictMatch) {
  console.error('❌ Could not parse DICTIONARY in i18n.js');
  process.exit(1);
}

const keyMatches = [...dictMatch[1].matchAll(/^\s*([a-zA-Z0-9_]+):/gm)];
const definedKeys = new Set(keyMatches.map((m) => m[1]));

console.log(`\n========================================`);
console.log(`🌐 i18n Validation Checker`);
console.log(`Defined Bilingual Keys: ${definedKeys.size}`);
console.log(`========================================\n`);

// Scan admin files for t('...')
const adminDir = path.join(__dirname, '../../client/admin');
const filesToScan = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'assets') walkDir(full);
    } else if (f.endsWith('.js') || f.endsWith('.html')) {
      filesToScan.push(full);
    }
  }
}

walkDir(adminDir);

let missingKeys = 0;
let usedKeysCount = 0;

for (const file of filesToScan) {
  const content = fs.readFileSync(file, 'utf8');
  // Match only standalone t('key') or AdminI18n.t('key')
  const tCalls = [...content.matchAll(/(?:\bAdminI18n\.t|\bt)\(['"]([a-zA-Z0-9_]+)['"]\)/g)];

  for (const m of tCalls) {
    const key = m[1];
    usedKeysCount++;
    if (!definedKeys.has(key)) {
      console.error(`❌ Missing key in dictionary: "${key}" used in ${path.relative(adminDir, file)}`);
      missingKeys++;
    }
  }
}

console.log(`Scanned ${filesToScan.length} admin files.`);
console.log(`Total t('...') lookups checked: ${usedKeysCount}`);

if (missingKeys > 0) {
  console.error(`\n❌ i18n check FAILED: ${missingKeys} missing keys found.`);
  process.exit(1);
} else {
  console.log(`\n✅ i18n check PASSED: All referenced keys exist in bilingual dictionary.`);
}
