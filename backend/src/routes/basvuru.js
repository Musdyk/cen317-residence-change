const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { HttpError } = require('../utils/yardimci');
const { girisGerekli, rolGerekli } = require('../middleware/auth');
const {
  DURUM,
  BASVURU_DETAY,
  basvuruCiktisi,
  basvuruGetir,
  basvuruOlustur,
  durumDegistir,
} = require('../services/basvuruServisi');

const router = Router();
router.use(girisGerekli);

const GUN_MS = 24 * 60 * 60 * 1000;

// Türkiye saatine göre "YYYY-MM-DD". Sunucu UTC'de çalışsa bile gece 00:00-03:00 arası
// girilen bugünün tarihi "ileri tarih" sayılmasın diye karşılaştırma gün bazında yapılır.
const gunTR = (zaman) => new Date(zaman).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

router.post('/', rolGerekli('VATANDAS'), async (req, res) => {
  const veri = z
    .object({
      adresKodu: z.string().regex(/^\d{10}$/, 'Adres kodu 10 haneli olmalı.'),
      tasinmaTarihi: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı.')
        .refine((t) => t <= gunTR(Date.now()), 'Taşınma tarihi ileri bir tarih olamaz.')
        .refine((t) => t >= gunTR(Date.now() - 30 * GUN_MS), 'Taşınma tarihi 30 günden eski olamaz.')
        .transform((t) => new Date(t)),
      enlem: z.number().min(-90).max(90).optional(),
      boylam: z.number().min(-180).max(180).optional(),
    })
    .parse(req.body);

  const basvuru = await basvuruOlustur(req.kullanici.id, veri);
  res.status(201).json(basvuruCiktisi(basvuru));
});

router.get('/benim', async (req, res) => {
  const basvurular = await prisma.basvuru.findMany({
    where: { kullaniciId: req.kullanici.id },
    orderBy: { olusturma: 'desc' },
    include: BASVURU_DETAY,
  });
  res.json(basvurular.map(basvuruCiktisi));
});

// Vatandaş yalnızca kendi başvurusunu, admin hepsini görebilir.
router.get('/:takipNo', async (req, res) => {
  const basvuru = await basvuruGetir(req.params.takipNo);
  if (req.kullanici.rol !== 'ADMIN' && basvuru.kullaniciId !== req.kullanici.id) {
    throw new HttpError(404, 'Başvuru bulunamadı.');
  }
  res.json(basvuruCiktisi(basvuru));
});

router.post('/:takipNo/iptal', rolGerekli('VATANDAS'), async (req, res) => {
  const basvuru = await durumDegistir({
    takipNo: req.params.takipNo,
    yeniDurum: DURUM.IPTAL,
    aciklama: 'Başvuru sahibi tarafından iptal edildi.',
    yapan: req.kullanici,
  });
  res.json(basvuruCiktisi(basvuru));
});

module.exports = router;
