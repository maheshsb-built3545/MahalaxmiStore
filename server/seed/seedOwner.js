'use strict';
/**
 * Seed Owner Account
 *
 * Reads OWNER_PHONE and OWNER_PASSWORD from .env and creates or updates
 * the single owner account with role 'owner'.
 *
 * Usage:
 *   cd server
 *   npm run seed:owner
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { normalizePhone } = require('../src/utils/helpers');

async function seedOwner() {
  const rawPhone = process.env.OWNER_PHONE;
  const rawPassword = process.env.OWNER_PASSWORD;
  const ownerName = process.env.OWNER_NAME || 'Mahalaxmi Kirana Owner';

  if (!rawPhone || !rawPassword) {
    console.error('❌  OWNER_PHONE and OWNER_PASSWORD must be defined in server/.env');
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    console.error('❌  OWNER_PHONE in server/.env is not a valid 10-digit Indian phone number.');
    process.exit(1);
  }

  if (rawPassword.length < 8 || rawPassword.length > 72) {
    console.error('❌  OWNER_PASSWORD must be between 8 and 72 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅  Connected to MongoDB');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    let owner = await User.findOne({ phone });
    if (owner) {
      owner.name = ownerName;
      owner.passwordHash = passwordHash;
      owner.role = 'owner';
      owner.blocked = false;
      await owner.save();
      console.log(`👑  Existing user with phone ${phone} promoted/updated to Owner!`);
    } else {
      owner = await User.create({
        name: ownerName,
        phone,
        passwordHash,
        role: 'owner',
        blocked: false,
      });
      console.log(`👑  Owner account created successfully for phone ${phone}!`);
    }

    console.log('   Owner login ready. Role: owner.');
  } catch (err) {
    console.error('❌  Owner seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedOwner();
