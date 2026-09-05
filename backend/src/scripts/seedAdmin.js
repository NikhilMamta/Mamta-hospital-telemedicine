import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';

// Resolve paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mamtahospital.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'MamtaHospital@2026';

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin user with email ${adminEmail} already exists.`);
      process.exit(0);
    }

    const newAdmin = new Admin({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // will be hashed by mongoose pre-save hook
      role: 'super_admin',
      isActive: true,
    });

    await newAdmin.save();
    console.log('----------------------------------------------------');
    console.log('Admin user seeded successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
