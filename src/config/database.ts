import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI as string;  // Cambiado de DATABASE_URL a MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI no definida en .env');
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');
  } catch (err: any) {
    console.error('❌ Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

export default connectDB;
