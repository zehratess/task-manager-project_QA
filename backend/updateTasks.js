const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); // .env dosyasını oku

// Task modelinizi import edin - path'i kontrol edin
const Task = require('./models/Task');

// MongoDB bağlantı string'ini .env'den al
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

console.log('\n🔍 Bağlantı Bilgileri:');
console.log('   .env dosyası:', path.resolve('.env'));
console.log('   MongoDB URI:', MONGODB_URI ? '✅ Bulundu' : '❌ Bulunamadı');

if (!MONGODB_URI) {
  console.error('\n❌ HATA: MongoDB bağlantı string\'i bulunamadı!');
  console.log('\n📝 .env dosyanızda şunlardan birinin olduğundan emin olun:');
  console.log('   MONGODB_URI=your-connection-string');
  console.log('   MONGO_URI=your-connection-string');
  console.log('   DATABASE_URL=your-connection-string');
  process.exit(1);
}

async function updateExistingTasks() {
  try {
    // MongoDB'ye bağlan
    console.log('\n🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı!');
    console.log('   Database:', mongoose.connection.name);

    // Kategorisi olmayan görevleri kontrol et
    const tasksWithoutCategory = await Task.countDocuments({ 
      category: { $exists: false } 
    });
    
    console.log(`\n📊 Kategorisi olmayan görev sayısı: ${tasksWithoutCategory}`);

    if (tasksWithoutCategory === 0) {
      console.log('✅ Tüm görevlerde zaten category alanı mevcut!');
      
      // Mevcut kategori dağılımını göster
      const workCount = await Task.countDocuments({ category: 'Work' });
      const schoolCount = await Task.countDocuments({ category: 'School' });
      const personalCount = await Task.countDocuments({ category: 'Personal' });
      const otherCount = await Task.countDocuments({ category: 'Other' });
      const totalTasks = await Task.countDocuments({});

      console.log('\n📈 Mevcut Kategori Dağılımı:');
      console.log(`   Work: ${workCount}`);
      console.log(`   School: ${schoolCount}`);
      console.log(`   Personal: ${personalCount}`);
      console.log(`   Other: ${otherCount}`);
      console.log(`   Toplam: ${totalTasks}`);
      
      mongoose.connection.close();
      return;
    }

    // Kategorisi olmayan tüm görevlere 'Other' kategorisi ekle
    console.log('\n⏳ Görevler güncelleniyor...');
    const result = await Task.updateMany(
      { category: { $exists: false } },
      { $set: { category: 'Other' } }
    );

    console.log(`\n✅ ${result.modifiedCount} görev başarıyla güncellendi!`);
    console.log(`✅ Tüm görevlere 'Other' kategorisi eklendi.`);

    // Güncellenmiş verileri kontrol et
    const workCount = await Task.countDocuments({ category: 'Work' });
    const schoolCount = await Task.countDocuments({ category: 'School' });
    const personalCount = await Task.countDocuments({ category: 'Personal' });
    const otherCount = await Task.countDocuments({ category: 'Other' });
    const totalTasks = await Task.countDocuments({});

    console.log('\n📈 Güncellenmiş Kategori Dağılımı:');
    console.log(`   Work: ${workCount}`);
    console.log(`   School: ${schoolCount}`);
    console.log(`   Personal: ${personalCount}`);
    console.log(`   Other: ${otherCount}`);
    console.log(`   Toplam: ${totalTasks}`);

    // Bağlantıyı kapat
    await mongoose.connection.close();
    console.log('\n✅ İşlem tamamlandı. MongoDB bağlantısı kapatıldı.');
    console.log('🎉 Artık backend sunucunuzu başlatabilirsiniz!\n');
    
  } catch (error) {
    console.error('\n❌ Hata oluştu:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n💡 Çözüm önerileri:');
      console.log('   1. .env dosyanızda MONGODB_URI doğru mu kontrol edin');
      console.log('   2. MongoDB Atlas kullanıyorsanız, IP adresinizi whitelist\'e ekleyin');
      console.log('   3. İnternet bağlantınızı kontrol edin');
      console.log('   4. MongoDB Atlas\'ta cluster\'ınız çalışıyor mu kontrol edin');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Script'i çalıştır
console.log('\n🚀 Task Migration Script Başlatılıyor...');
console.log('================================================\n');
updateExistingTasks();