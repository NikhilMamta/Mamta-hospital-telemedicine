import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedDoctors = async () => {
  try {
    await connectDB();

    // Clear existing doctors and availabilities to start fresh
    await Doctor.deleteMany({});
    await Availability.deleteMany({});
    console.log('Cleared existing doctors and availabilities.');

    // 1. Doctor Sharma
    const sharma = new Doctor({
      name: 'Dr. Mamta Sharma',
      email: 'mamta.sharma@mamtahospital.com',
      phone: '9876543210',
      specialization: 'Cardiologist',
      qualification: 'MBBS, MD Cardiology',
      experience: 15,
      bio: 'Senior consultant cardiologist with over 15 years of experience in treating complex cardiovascular conditions and remote heart monitoring.',
      profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
      consultationFee: 800,
      consultationDuration: 30,
      isActive: true,
    });

    const savedSharma = await sharma.save();
    console.log(`Doctor created: ${savedSharma.name}`);

    // 2. Doctor Patel
    const patel = new Doctor({
      name: 'Dr. Rajesh Patel',
      email: 'rajesh.patel@mamtahospital.com',
      phone: '9876543211',
      specialization: 'Pediatrician',
      qualification: 'MBBS, DCH Pediatric Medicine',
      experience: 10,
      bio: 'Compassionate and dedicated pediatrician specializing in childhood growth development, nutrition, and remote infant healthcare consults.',
      profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      consultationFee: 600,
      consultationDuration: 30,
      isActive: true,
    });

    const savedPatel = await patel.save();
    console.log(`Doctor created: ${savedPatel.name}`);

    // Add 7-day recurring availability for both doctors
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      await Availability.create({
        doctorId: savedSharma._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        bufferTime: 5,
        isActive: true,
      });

      await Availability.create({
        doctorId: savedPatel._id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '16:00',
        slotDuration: 30,
        bufferTime: 5,
        isActive: true,
      });
    }

    console.log('Seeded doctor availabilities for all days successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding doctors: ${error.message}`);
    process.exit(1);
  }
};

seedDoctors();
