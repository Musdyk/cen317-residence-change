const prisma = require('../db');
const { HttpError, rastgeleKod, sha256 } = require('../utils/yardimci');
const { BOLUM_DETAY, adresOzeti, adresDogrula } = require('./adresServisi');
const { belgePdfUret } = require('./belgeServisi');

const DURUM = {
  BEKLEMEDE: 'BEKLEMEDE',
  INCELEMEDE: 'INCELEMEDE',
  ONAYLANDI: 'ONAYLANDI',
  REDDEDILDI: 'REDDEDILDI',
  IPTAL: 'IPTAL',
};
const ACIK_DURUMLAR = [DURUM.BEKLEMEDE, DURUM.INCELEMEDE];

// Hangi durumdan hangisine, kim geçebilir.
const GECISLER = {
  [DURUM.BEKLEMEDE]: { [DURUM.INCELEMEDE]: 'ADMIN', [DURUM.REDDEDILDI]: 'ADMIN', [DURUM.IPTAL]: 'VATANDAS' },
  [DURUM.INCELEMEDE]: { [DURUM.ONAYLANDI]: 'ADMIN', [DURUM.REDDEDILDI]: 'ADMIN' },
};

const BASVURU_DETAY = {
  kullanici: { select: { id: true, tcNo: true, ad: true, soyad: true } },
  eskiBolum: { include: BOLUM_DETAY },
  yeniBolum: { include: BOLUM_DETAY },
  gecmis: { orderBy: { tarih: 'asc' }, include: { degistiren: { select: { ad: true, soyad: true, rol: true } } } },
  belge: { select: { belgeNo: true, gecerli: true, olusturma: true } },
};

function basvuruCiktisi(b) {
  return {
    takipNo: b.takipNo,
    durum: b.durum,
    redGerekcesi: b.redGerekcesi,
    tasinmaTarihi: b.tasinmaTarihi,
    olusturma: b.olusturma,
    guncelleme: b.guncelleme,
    basvuran: b.kullanici,
    eskiAdres: adresOzeti(b.eskiBolum),
    yeniAdres: adresOzeti(b.yeniBolum),
    gecmis: b.gecmis?.map((g) => ({
      eskiDurum: g.eskiDurum,
      yeniDurum: g.yeniDurum,
      aciklama: g.aciklama,
      tarih: g.tarih,
      degistiren: g.degistiren ? { ad: `${g.degistiren.ad} ${g.degistiren.soyad}`, rol: g.degistiren.rol } : null,
    })),
    belge: b.belge,
  };
}

async function basvuruGetir(takipNo) {
  const b = await prisma.basvuru.findUnique({ where: { takipNo }, include: BASVURU_DETAY });
  if (!b) throw new HttpError(404, 'Başvuru bulunamadı.');
  return b;
}

async function basvuruOlustur(kullaniciId, { adresKodu, enlem, boylam, tasinmaTarihi }) {
  const kullanici = await prisma.kullanici.findUnique({ where: { id: kullaniciId } });
  if (!kullanici) throw new HttpError(404, 'Kullanıcı bulunamadı.');

  const { bolum } = await adresDogrula({ adresKodu, enlem, boylam });
  if (bolum.id === kullanici.mevcutBolumId) {
    throw new HttpError(422, 'Yeni adres mevcut adresinizle aynı.');
  }

  const acik = await prisma.basvuru.findFirst({ where: { kullaniciId, durum: { in: ACIK_DURUMLAR } } });
  if (acik) throw new HttpError(409, `Sonuçlanmamış bir başvurunuz var (${acik.takipNo}).`);

  const basvuru = await prisma.basvuru.create({
    data: {
      takipNo: `AD-${rastgeleKod(10)}`,
      kullaniciId,
      eskiBolumId: kullanici.mevcutBolumId,
      yeniBolumId: bolum.id,
      tasinmaTarihi,
      gecmis: { create: { yeniDurum: DURUM.BEKLEMEDE, degistirenId: kullaniciId, aciklama: 'Başvuru oluşturuldu.' } },
    },
  });
  return basvuruGetir(basvuru.takipNo);
}

async function durumDegistir({ takipNo, yeniDurum, aciklama, yapan }) {
  const basvuru = await basvuruGetir(takipNo);

  if (yapan.rol === 'VATANDAS' && basvuru.kullaniciId !== yapan.id) {
    throw new HttpError(404, 'Başvuru bulunamadı.');
  }
  const gerekenRol = GECISLER[basvuru.durum]?.[yeniDurum];
  if (!gerekenRol) {
    throw new HttpError(409, `${basvuru.durum} durumundaki başvuru ${yeniDurum} yapılamaz.`);
  }
  if (gerekenRol !== yapan.rol) throw new HttpError(403, 'Bu işlem için yetkiniz yok.');
  if (yeniDurum === DURUM.REDDEDILDI && !aciklama) {
    throw new HttpError(400, 'Reddetmek için gerekçe yazılmalı.');
  }

  // Onayda belge PDF'i işlemden önce üretilir; böylece veritabanı işlemi kısa kalır.
  let belgeVerisi = null;
  if (yeniDurum === DURUM.ONAYLANDI) {
    const belgeNo = `YRL-${new Date().getFullYear()}-${rastgeleKod(8)}`;
    const tarih = new Date();
    const pdf = await belgePdfUret({
      belgeNo,
      tarih,
      kullanici: basvuru.kullanici,
      yeniAdres: adresOzeti(basvuru.yeniBolum),
      eskiAdres: adresOzeti(basvuru.eskiBolum),
      basvuru,
    });
    belgeVerisi = { belgeNo, pdf, sha256: sha256(pdf), olusturma: tarih };
  }

  // Durum güncellemesi, geçmiş kaydı, adres güncellemesi ve belge oluşturma
  // tek bir transaction içinde yapılır: ya hepsi olur ya hiçbiri.
  await prisma.$transaction(async (tx) => {
    // Aynı anda iki işlem aynı başvuruyu değiştirmeye çalışırsa yalnızca biri başarılı olur.
    const { count } = await tx.basvuru.updateMany({
      where: { id: basvuru.id, durum: basvuru.durum },
      data: { durum: yeniDurum, ...(yeniDurum === DURUM.REDDEDILDI && { redGerekcesi: aciklama }) },
    });
    if (count === 0) throw new HttpError(409, 'Başvuru bu sırada başka biri tarafından güncellendi, sayfayı yenileyin.');

    await tx.basvuruGecmisi.create({
      data: { basvuruId: basvuru.id, eskiDurum: basvuru.durum, yeniDurum, degistirenId: yapan.id, aciklama },
    });

    if (yeniDurum === DURUM.ONAYLANDI) {
      await tx.kullanici.update({ where: { id: basvuru.kullaniciId }, data: { mevcutBolumId: basvuru.yeniBolumId } });
      // Kişinin önceki adres belgeleri artık geçerli değil.
      await tx.belge.updateMany({ where: { kullaniciId: basvuru.kullaniciId, gecerli: true }, data: { gecerli: false } });
      await tx.belge.create({ data: { ...belgeVerisi, basvuruId: basvuru.id, kullaniciId: basvuru.kullaniciId } });
    }
  });

  return basvuruGetir(takipNo);
}

module.exports = { DURUM, basvuruCiktisi, basvuruGetir, basvuruOlustur, durumDegistir, BASVURU_DETAY };
