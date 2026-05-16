const mongoose = require("mongoose");
const path     = require("path");
require("dotenv").config();

const Task = require("./models/Task");

// ─── SABİTLER ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["Work", "School", "Personal", "Other"];
const DEFAULT_CATEGORY = "Other";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI   ||
  process.env.DATABASE_URL;

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────

/**
 * Tüm kategorilerin görev sayısını tek Promise.all çağrısıyla alır.
 * S4123: Sıralı await countDocuments çağrıları Promise.all ile paralele alındı.
 */
const getCategoryCounts = async () => {
  const [total, ...categoryCounts] = await Promise.all([
    Task.countDocuments({}),
    ...CATEGORIES.map((cat) => Task.countDocuments({ category: cat })),
  ]);

  const counts = {};
  CATEGORIES.forEach((cat, i) => { counts[cat] = categoryCounts[i]; });
  counts.total = total;
  return counts;
};

/**
 * Kategori dağılımını konsola yazdırır.
 */
const logCategoryCounts = (counts) => {
  console.log("\nKategori Dagılımı:");
  CATEGORIES.forEach((cat) => console.log(`  ${cat}: ${counts[cat]}`));
  console.log(`  Toplam: ${counts.total}`);
};

// ─── ANA FONKSİYON ───────────────────────────────────────────────────────────

async function updateExistingTasks() {
  try {
    console.log("\nBaglantı Bilgileri:");
    console.log("  .env dosyası:", path.resolve(".env"));
    console.log("  MongoDB URI:", MONGODB_URI ? "Bulundu" : "Bulunamadı");

    if (!MONGODB_URI) {
      console.error("\nHATA: MongoDB baglantı string'i bulunamadı!");
      console.log("  .env dosyanızda su degiskenlerden biri olmalı:");
      console.log("  MONGODB_URI, MONGO_URI veya DATABASE_URL");
      process.exit(1);
    }

    console.log("\nMongoDB baglantısı kuruluyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB baglantısı basarılı!");
    console.log("  Database:", mongoose.connection.name);

    // S4123: Tek await ile paralel sorgu
    const missingCount = await Task.countDocuments({ category: { $exists: false } });
    console.log(`\nKategorisi olmayan görev sayısı: ${missingCount}`);

    if (missingCount === 0) {
      console.log("Tüm görevlerde zaten category alanı mevcut.");
      logCategoryCounts(await getCategoryCounts());
      await mongoose.connection.close();
      return;
    }

    console.log("\nGörevler güncelleniyor...");
    const result = await Task.updateMany(
      { category: { $exists: false } },
      { $set: { category: DEFAULT_CATEGORY } }
    );

    console.log(`${result.modifiedCount} görev basarıyla güncellendi.`);
    console.log(`Tüm görevlere '${DEFAULT_CATEGORY}' kategorisi eklendi.`);

    // S4123: Kategori sayımları Promise.all ile paralel alınıyor
    logCategoryCounts(await getCategoryCounts());

    await mongoose.connection.close();
    console.log("\nIslem tamamlandı. MongoDB baglantısı kapatıldı.");
  } catch (error) {
    console.error("\nHata olustu:", error.message);

    if (error.name === "MongooseServerSelectionError") {
      console.log("\nOlası nedenler:");
      console.log("  - MONGODB_URI yanlış veya eksik");
      console.log("  - MongoDB Atlas IP whitelist kontrolü");
      console.log("  - Internet baglantısı");
      console.log("  - Atlas cluster'ı çalışmıyor");
    }

    await mongoose.connection.close();
    process.exit(1);
  }
}

console.log("\nTask Migration Script Baslatılıyor...");
console.log("=".repeat(48));
updateExistingTasks();