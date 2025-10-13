import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URL as string;
    if (!uri) throw new Error('DATABASE_URL no definida en .env');
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');
  } catch (err: any) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

export default connectDB;
