const { Router } = require('express');
const prisma = require('../db');
const { HttpError, maskeleIsim, maskeleTc } = require('../utils/yardimci');
const { girisGerekli } = require('../middleware/auth');
const { BOLUM_DETAY, adresOzeti } = require('../services/adresServisi');

const router = Router();

// Belgenin PDF'ini indirir (sahibi veya admin).
router.get('/belgeler/:belgeNo/pdf', girisGerekli, async (req, res) => {
  const belge = await prisma.belge.findUnique({ where: { belgeNo: req.params.belgeNo } });
  if (!belge || (req.kullanici.rol !== 'ADMIN' && belge.kullaniciId !== req.kullanici.id)) {
    throw new HttpError(404, 'Belge bulunamadı.');
  }
  res
    .type('application/pdf')
    .set('Content-Disposition', `inline; filename="${belge.belgeNo}.pdf"`)
    .send(Buffer.from(belge.pdf));
});

// Herkese açık doğrulama: belge no ile geçerliliği ve maskelenmiş bilgileri döner.
// Ön yüz, yüklenen PDF'in SHA-256 özetini (WebCrypto ile) hesaplayıp `sha256` ile karşılaştırabilir.
router.get('/dogrula/:belgeNo', async (req, res) => {
  const belge = await prisma.belge.findUnique({
    where: { belgeNo: req.params.belgeNo.trim().toUpperCase() },
    include: {
      kullanici: { select: { tcNo: true, ad: true, soyad: true } },
      basvuru: { select: { takipNo: true, tasinmaTarihi: true, yeniBolum: { include: BOLUM_DETAY } } },
    },
  });
  if (!belge) return res.status(404).json({ bulundu: false, hata: 'Bu numarayla üretilmiş bir belge yok.' });

  const adres = adresOzeti(belge.basvuru.yeniBolum);
  res.json({
    bulundu: true,
    gecerli: belge.gecerli,
    durumMesaji: belge.gecerli
      ? 'Belge geçerlidir.'
      : 'Belge sahibinin daha sonra adres değişikliği yapılmıştır; bu belge artık geçerli değildir.',
    belgeNo: belge.belgeNo,
    olusturma: belge.olusturma,
    sha256: belge.sha256,
    kisi: { adSoyad: maskeleIsim(`${belge.kullanici.ad} ${belge.kullanici.soyad}`), tcNo: maskeleTc(belge.kullanici.tcNo) },
    adres: { il: adres.il, ilce: adres.ilce, mahalle: adres.mahalle },
    tasinmaTarihi: belge.basvuru.tasinmaTarihi,
  });
});

module.exports = router;
