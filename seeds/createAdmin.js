#!/usr/bin/env node

/**
 * Admin Account Creation Script
 * Creates an initial admin user in the database
 * 
 * Usage:
 *   node backend/seeds/createAdmin.js
 * 
 * This creates an admin with:
 *   Email: admin@example.com
 *   Password: AdminPassword123
 *   Role: admin
 */

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const User = require('../models/User');

// Admin credentials
const ADMIN_CREDENTIALS = {
  fullName: 'System Administrator',
  email: 'admin@example.com',
  password: 'AdminPassword123',
  phone: '+1-555-0100',
  role: 'admin',
};

async function createAdmin() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-booking');
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_CREDENTIALS.email });
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // Option to update password
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\nWould you like to update the admin password? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          const salt = await bcryptjs.genSalt(10);
          existingAdmin.password = await bcryptjs.hash(ADMIN_CREDENTIALS.password, salt);
          await existingAdmin.save();
          console.log('✅ Admin password updated successfully!');
          console.log(`   Password: ${ADMIN_CREDENTIALS.password}`);
        }
        rl.close();
        process.exit(0);
      });
      return;
    }

    // Create new admin user
    console.log('\n🔐 Creating admin account...');
    const admin = await User.create({
      fullName: ADMIN_CREDENTIALS.fullName,
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      phone: ADMIN_CREDENTIALS.phone,
      role: ADMIN_CREDENTIALS.role,
      isEmailVerified: true,
    });

    console.log('\n✅ Admin account created successfully!\n');
    console.log('🎯 LOGIN CREDENTIALS:');
    console.log(`   Email:    ${ADMIN_CREDENTIALS.email}`);
    console.log(`   Password: ${ADMIN_CREDENTIALS.password}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   ID:       ${admin._id}\n`);

    console.log('📋 NEXT STEPS:');
    console.log('   1. Start the backend: npm run server');
    console.log('   2. Login at http://localhost:3000');
    console.log('   3. Use above credentials');
    console.log('   4. Dashboard should redirect to /admin/dashboard\n');

    console.log('⚠️  IMPORTANT - CHANGE PASSWORD IN PRODUCTION:');
    console.log('   1. Login with above credentials');
    console.log('   2. Go to Profile page');
    console.log('   3. Change password to secure value');
    console.log('   4. Store securely (password manager, etc.)\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating admin account:');
    console.error(`   ${error.message}\n`);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`   Duplicate error: ${field} already exists`);
    }

    if (!process.env.MONGODB_URI) {
      console.error('\n⚠️  No MONGODB_URI in .env file');
      console.error('   Make sure your .env file has: MONGODB_URI=mongodb://...\n');
    }

    process.exit(1);
  }
}

// Run script
createAdmin();
