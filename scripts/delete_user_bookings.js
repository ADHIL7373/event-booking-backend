require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');

async function deleteBookingsByUsername(username) {
  await connectDB();

  // Find users matching username (case-insensitive, partial)
  const users = await User.find({ fullName: { $regex: username, $options: 'i' } }).lean();

  if (!users.length) {
    console.log(`No users found matching '${username}'. Exiting.`);
    process.exit(0);
  }

  console.log(`Found ${users.length} user(s):`);
  users.forEach(u => console.log(` - ${u._id} : ${u.fullName} <${u.email}>`));

  // Confirm deletion (simple safety prompt)
  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  readline.question(`
This will delete ALL bookings for the above user(s). Type YES to confirm: `, async (answer) => {
    readline.close();
    if (answer !== 'YES') {
      console.log('Aborted by user. No changes made.');
      process.exit(0);
    }

    // Collect userIds
    const userIds = users.map(u => u._id);

    try {
      const result = await Booking.deleteMany({ userId: { $in: userIds } });
      console.log(`Deleted ${result.deletedCount} booking(s).`);
    } catch (err) {
      console.error('Error deleting bookings:', err);
    } finally {
      mongoose.connection.close();
      process.exit(0);
    }
  });
}

const username = process.argv[2] || 'rahim';
deleteBookingsByUsername(username).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
