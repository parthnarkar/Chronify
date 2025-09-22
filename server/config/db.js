import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in environment variables');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.log('Server continuing without database...');
    }
};

export default connectDB;