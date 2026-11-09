const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { girisGerekli, rolGerekli } = require('../middleware/auth');
const { DURUM, BASVURU_DETAY, basvuruCiktisi, durumDegistir } = require('../services/basvuruServisi');

const router = Router();
router.use(girisGerekli, rolGerekli('ADMIN'));

// GET /api/admin/basvurular?durum=BEKLEMEDE&sayfa=1&boyut=20&ara=AD-XXXX
router.get('/basvurular', async (req, res) => {
  const { durum, sayfa, boyut, ara } = z
    .object({
      durum: z.nativeEnum(DURUM).optional(),
      sayfa: z.coerce.number().int().min(1).default(1),
      boyut: z.coerce.number().int().min(1).max(100).default(20),
      ara: z.string().trim().optional(),
    })
    .parse(req.query);

  const where = {
    ...(durum && { durum }),
    ...(ara && {
      OR: [
        { takipNo: { contains: ara, mode: 'insensitive' } },
        { kullanici: { tcNo: { contains: ara } } },
        { kullanici: { soyad: { contains: ara, mode: 'insensitive' } } },
      ],
    }),
  };
  const [toplam, basvurular] = await Promise.all([
    prisma.basvuru.count({ where }),
    prisma.basvuru.findMany({
      where,
      include: BASVURU_DETAY,
      orderBy: { olusturma: 'asc' }, // en eski başvuru önce incelenir
      skip: (sayfa - 1) * boyut,
      take: boyut,
    }),
  ]);
  res.json({ toplam, sayfa, boyut, kayitlar: basvurular.map(basvuruCiktisi) });
});

// Panelin üstündeki sayaçlar için.
router.get('/istatistik', async (_req, res) => {
  const gruplar = await prisma.basvuru.groupBy({ by: ['durum'], _count: { _all: true } });
  const sonuc = Object.fromEntries(Object.values(DURUM).map((d) => [d, 0]));
  for (const g of gruplar) sonuc[g.durum] = g._count._all;
  res.json(sonuc);
});

// PATCH /api/admin/basvurular/:takipNo/durum  { durum: "INCELEMEDE" | "ONAYLANDI" | "REDDEDILDI", aciklama? }
router.patch('/basvurular/:takipNo/durum', async (req, res) => {
  const { durum, aciklama } = z
    .object({
      durum: z.enum([DURUM.INCELEMEDE, DURUM.ONAYLANDI, DURUM.REDDEDILDI]),
      aciklama: z.string().trim().max(500).optional(),
    })
    .parse(req.body);

  const basvuru = await durumDegistir({ takipNo: req.params.takipNo, yeniDurum: durum, aciklama, yapan: req.kullanici });
  res.json(basvuruCiktisi(basvuru));
});

module.exports = router;
