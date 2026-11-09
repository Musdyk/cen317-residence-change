// Örnek adres verisi ve test kullanıcıları.
// Test hesapları (hepsinin şifresi: Test1234!):
//   Admin     -> TC: 10000000146
//   Vatandaş  -> TC: 12345678950  (Ayşe Yılmaz, mevcut adresi var)
//   Vatandaş  -> TC: 23456789060  (Mehmet Demir, mevcut adresi var)
//   Vatandaş  -> TC: 34567890170  (Zeynep Kaya, henüz kayıtlı adresi yok)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const tc = require('../src/utils/tcKimlik');

const prisma = new PrismaClient();

const VERI = {
  Ankara: {
    'Çankaya': {
      'Kızılay': { merkez: [39.9208, 32.8541], sokaklar: ['Atatürk Bulvarı', 'Meşrutiyet Caddesi', 'Sakarya Caddesi'] },
      'Bahçelievler': { merkez: [39.9235, 32.8236], sokaklar: ['7. Cadde', 'Aşkabat Caddesi', '1. Cadde'] },
    },
    'Keçiören': {
      'Etlik': { merkez: [39.9690, 32.8410], sokaklar: ['Yunus Emre Caddesi', 'Halil Sezai Erkut Caddesi'] },
      'Kalaba': { merkez: [39.9650, 32.8560], sokaklar: ['Kızlarpınarı Caddesi', 'Ahmet Andiçen Sokak'] },
    },
    'Yenimahalle': {
      'Demetevler': { merkez: [39.9670, 32.7990], sokaklar: ['İvedik Caddesi', '402. Cadde'] },
    },
  },
  'İstanbul': {
    'Kadıköy': {
      'Moda': { merkez: [40.9840, 29.0260], sokaklar: ['Moda Caddesi', 'Bahariye Caddesi'] },
    },
  },
};

const BINA_SAYISI = 4; // her sokakta
const DAIRE_SAYISI = 6; // her binada

async function main() {
  // Sıra önemli: önce bağımlı tablolar silinir.
  await prisma.belge.deleteMany();
  await prisma.basvuruGecmisi.deleteMany();
  await prisma.basvuru.deleteMany();
  await prisma.kullanici.deleteMany();
  await prisma.bagimsizBolum.deleteMany();
  await prisma.bina.deleteMany();
  await prisma.sokak.deleteMany();
  await prisma.mahalle.deleteMany();
  await prisma.ilce.deleteMany();
  await prisma.il.deleteMany();

  let binaSayac = 0;
  let bolumSayac = 0;

  for (const [ilAd, ilceler] of Object.entries(VERI)) {
    const il = await prisma.il.create({ data: { ad: ilAd } });
    for (const [ilceAd, mahalleler] of Object.entries(ilceler)) {
      const ilce = await prisma.ilce.create({ data: { ad: ilceAd, ilId: il.id } });
      for (const [mahAd, { merkez, sokaklar }] of Object.entries(mahalleler)) {
        const mahalle = await prisma.mahalle.create({ data: { ad: mahAd, ilceId: ilce.id } });
        for (let s = 0; s < sokaklar.length; s++) {
          const sokak = await prisma.sokak.create({ data: { ad: sokaklar[s], mahalleId: mahalle.id } });
          for (let b = 1; b <= BINA_SAYISI; b++) {
            binaSayac++;
            // Binaları mahalle merkezinin etrafına ~100 m aralıklarla yerleştir.
            const enlem = merkez[0] + (s - 1) * 0.0012;
            const boylam = merkez[1] + (b - 2.5) * 0.0011;
            await prisma.bina.create({
              data: {
                binaNo: String(b * 2 - 1),
                binaKodu: String(10000000 + binaSayac * 37),
                enlem: Number(enlem.toFixed(6)),
                boylam: Number(boylam.toFixed(6)),
                sokakId: sokak.id,
                bolumler: {
                  create: Array.from({ length: DAIRE_SAYISI }, (_, i) => {
                    bolumSayac++;
                    return { daireNo: String(i + 1), adresKodu: String(1000000000 + bolumSayac * 7919) };
                  }),
                },
              },
            });
          }
        }
      }
    }
  }

  const bolumler = await prisma.bagimsizBolum.findMany({ orderBy: { id: 'asc' }, take: 20 });
  const sifreHash = await bcrypt.hash('Test1234!', 10);

  const kullanicilar = [
    { tcNo: tc.uret('100000001'), ad: 'Sistem', soyad: 'Yöneticisi', rol: 'ADMIN' },
    { tcNo: tc.uret('123456789'), ad: 'Ayşe', soyad: 'Yılmaz', eposta: 'ayse@example.com', mevcutBolumId: bolumler[0].id },
    { tcNo: tc.uret('234567890'), ad: 'Mehmet', soyad: 'Demir', eposta: 'mehmet@example.com', mevcutBolumId: bolumler[7].id },
    { tcNo: tc.uret('345678901'), ad: 'Zeynep', soyad: 'Kaya' },
  ];
  for (const k of kullanicilar) {
    await prisma.kullanici.create({ data: { ...k, sifreHash } });
  }

  console.log(`Seed tamam: ${binaSayac} bina, ${bolumSayac} bağımsız bölüm.`);
  console.log('Test kullanıcıları (şifre: Test1234!):');
  for (const k of kullanicilar) console.log(`  ${k.rol || 'VATANDAS'}  ${k.tcNo}  ${k.ad} ${k.soyad}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
