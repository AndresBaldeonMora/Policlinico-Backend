import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const col = db.collection("especialidades");

  const res = await col.deleteMany({
    _id: {
      $in: [
        new mongoose.Types.ObjectId("6a3cb96a91827c73e491f7c1"),
        new mongoose.Types.ObjectId("6a3cb97091827c73e491f7c4"),
      ],
    },
  });

  console.log(`Eliminados: ${res.deletedCount} duplicados de Cardiología`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
