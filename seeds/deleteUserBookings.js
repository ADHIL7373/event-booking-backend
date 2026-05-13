#!/usr/bin/env node

/**
 * Delete Bookings by User
 * Deletes all bookings made by a specific user
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../models/User');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

async function deleteUserBookings() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-event-booking');
    console.log('✅ Connected to database');

    // Find user by name
    const user = await User.findOne({ fullName: 'Dharaneesh' });
    if (!user) {
      console.log('❌ User "Dharaneesh" not found');
      
      // Show all users
      const allUsers = await User.find({}, 'fullName email role').lean();
      console.log('\n📋 Available users:');
      allUsers.forEach(u => {
        console.log(`   - ${u.fullName} (${u.email})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.fullName} (${user.email})`);

    // Find bookings by this user
    const bookings = await Booking.find({ userId: user._id });
    console.log(`📊 Found ${bookings.length} bookings by ${user.fullName}`);

    if (bookings.length === 0) {
      console.log('ℹ️  No bookings to delete');
      process.exit(0);
    }

    // Display bookings before deletion
    console.log('\n📋 Bookings to be deleted:');
    for (const booking of bookings) {
      const event = await booking.populate('eventId', 'title date');
      console.log(`   - Booking ID: ${booking._id}`);
      console.log(`     Event: ${event.eventId?.title}`);
      console.log(`     Date: ${event.eventId?.date}`);
      console.log(`     Tickets: ${booking.numberOfTickets}`);
      console.log(`     Status: ${booking.status}\n`);
    }

    // Delete bookings
    const deleteResult = await Booking.deleteMany({ userId: user._id });
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} bookings`);

    console.log('\n✨ All bookings by Dharaneesh have been deleted!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteUserBookings();
