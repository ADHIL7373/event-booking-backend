#!/usr/bin/env node

/**
 * Test Booking Creation Script
 * Creates test bookings to populate admin dashboard
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

async function createTestBooking() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-event-booking');
    console.log('✅ Connected to database');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@smartevent.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    console.log(`✅ Found admin: ${admin.email}`);

    // Find a regular user or create one
    let user = await User.findOne({ role: 'user' });
    if (!user) {
      user = await User.create({
        fullName: 'Test User',
        email: 'testuser@example.com',
        password: 'TestUser123!',
        role: 'user',
        phone: '+1-555-0200',
      });
      console.log(`✅ Created test user: ${user.email}`);
    } else {
      console.log(`✅ Found test user: ${user.email}`);
    }

    // Find an upcoming event (date in future)
    const event = await Event.findOne({ date: { $gte: new Date() } }).sort({ date: 1 });
    if (!event) {
      console.log('❌ No upcoming events found. Run seed.js first!');
      process.exit(1);
    }
    console.log(`✅ Found upcoming event: ${event.title} on ${event.date.toDateString()}`);

    // Create test bookings
    const bookings = [];
    for (let i = 0; i < 5; i++) {
      const booking = await Booking.create({
        userId: user._id,
        eventId: event._id,
        numberOfTickets: Math.floor(Math.random() * 4) + 1,
        totalPrice: event.price * (Math.floor(Math.random() * 4) + 1),
        status: i % 2 === 0 ? 'confirmed' : 'pending',
        bookingDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
      bookings.push(booking);
    }

    console.log(`✅ Created ${bookings.length} test bookings`);

    // Display booking stats
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    console.log('\n📊 Booking Statistics:');
    console.log(`   Total Bookings: ${totalBookings}`);
    console.log(`   Confirmed: ${confirmedBookings}`);
    console.log(`   Total Revenue: ₹${totalRevenue[0]?.total || 0}`);

    console.log('\n✨ Test bookings created successfully!');
    console.log('   The admin dashboard will now show Recent Bookings and Top Events data');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test booking:', error.message);
    process.exit(1);
  }
}

createTestBooking();
