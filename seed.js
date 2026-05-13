/**
 * Database Seeding Script
 * Creates sample events in the database
 */

const mongoose = require('mongoose');
const Event = require('./models/Event');
const User = require('./models/User');
require('dotenv').config();

const sampleEvents = [
  {
    title: 'Web Development Workshop',
    description: 'Learn modern web development technologies including React, Node.js, and MongoDB. This comprehensive workshop covers frontend and backend development practices.',
    date: new Date('2026-03-15T10:00:00'),
    time: '10:00 AM - 5:00 PM',
    location: 'Tech Hub, San Francisco, CA',
    category: 'Workshop',
    price: 49,
    totalSeats: 100,
    availableSeats: 100,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
  },
  {
    title: 'AI & Machine Learning Conference',
    description: 'Explore the latest advancements in artificial intelligence and machine learning. Network with industry experts and learn about real-world applications of AI technology.',
    date: new Date('2026-03-20T09:00:00'),
    time: '9:00 AM - 6:00 PM',
    location: 'Convention Center, New York, NY',
    category: 'Conference',
    price: 99,
    totalSeats: 500,
    availableSeats: 500,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
  },
  {
    title: 'JavaScript Bootcamp',
    description: 'Intensive 3-day bootcamp to master JavaScript fundamentals and advanced concepts. Perfect for beginners and intermediate developers looking to level up their skills.',
    date: new Date('2026-04-01T09:30:00'),
    time: '9:30 AM - 4:30 PM',
    location: 'Developer Academy, Austin, TX',
    category: 'Workshop',
    price: 299,
    totalSeats: 50,
    availableSeats: 50,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
  },
  {
    title: 'Full Stack Development Summit',
    description: 'Comprehensive summit covering full stack development with React, Node.js, and cloud technologies. Includes hands-on labs and networking sessions.',
    date: new Date('2026-04-10T08:00:00'),
    time: '8:00 AM - 7:00 PM',
    location: 'Grand Hotel, Seattle, WA',
    category: 'Conference',
    price: 149,
    totalSeats: 200,
    availableSeats: 200,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
  },
  {
    title: 'Cloud Computing Workshop',
    description: 'Prepare for cloud deployments with AWS, Azure, and Google Cloud. Learn deployment, scalability, and security best practices for cloud applications.',
    date: new Date('2026-04-25T10:00:00'),
    time: '10:00 AM - 5:00 PM',
    location: 'Tech Institute, Boston, MA',
    category: 'Workshop',
    price: 79,
    totalSeats: 80,
    availableSeats: 80,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
  },
  {
    title: 'DevOps & CI/CD Workshop',
    description: 'Master DevOps practices with Docker, Kubernetes, and CI/CD pipelines. Learn to automate deployment and improve development workflows.',
    date: new Date('2026-05-05T09:00:00'),
    time: '9:00 AM - 4:00 PM',
    location: 'Innovation Hub, Chicago, IL',
    category: 'Workshop',
    price: 59,
    totalSeats: 60,
    availableSeats: 60,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
  },
  {
    title: 'React Advanced Patterns',
    description: 'Deep dive into advanced React patterns including hooks, context API, and performance optimization. Build scalable React applications with best practices.',
    date: new Date('2026-05-15T10:00:00'),
    time: '10:00 AM - 3:00 PM',
    location: 'Developer Center, Los Angeles, CA',
    category: 'Workshop',
    price: 69,
    totalSeats: 75,
    availableSeats: 75,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
  },
  {
    title: 'Tech Summit 2026',
    description: 'Annual tech summit featuring keynotes from industry leaders, tech talks, workshops, and networking opportunities. Explore the future of technology.',
    date: new Date('2026-06-01T08:30:00'),
    time: '8:30 AM - 6:00 PM',
    location: 'Convention Center, San Jose, CA',
    category: 'Conference',
    price: 199,
    totalSeats: 1000,
    availableSeats: 1000,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-event-booking');
    console.log('✅ Connected to MongoDB');

    // Create or find admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Admin User',
        email: 'admin@smartevent.com',
        password: 'Admin123!',
        role: 'admin',
        phone: '+1234567890',
      });
      console.log('✅ Created admin user');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Clear existing events
    await Event.deleteMany({});
    console.log('✅ Cleared existing events');

    // Add createdBy to each sample event
    const eventsWithUser = sampleEvents.map((event) => ({
      ...event,
      createdBy: adminUser._id,
    }));

    // Insert sample events
    const createdEvents = await Event.insertMany(eventsWithUser);
    console.log(`✅ Successfully created ${createdEvents.length} sample events`);

    // Display created events
    console.log('\n📋 Sample Events Created:');
    createdEvents.forEach((event) => {
      console.log(`- ${event.title} (${event.category}) - $${event.price}`);
    });

    console.log('\n✨ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDatabase();
