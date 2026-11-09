const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { adresDogrula, adresOzeti } = require('../services/adresServisi');

// Ön yüzdeki ardışık açılır listeler için: il → ilçe → mahalle → sokak → bina → daire.
const router = Router();

const id = z.coerce.number().int().positive();
const adSirali = { orderBy: { ad: 'asc' }, select: { id: true, ad: true } };

router.get('/iller', async (_req, res) => {
  res.json(await prisma.il.findMany(adSirali));
});

router.get('/iller/:id/ilceler', async (req, res) => {
  res.json(await prisma.ilce.findMany({ where: { ilId: id.parse(req.params.id) }, ...adSirali }));
});

router.get('/ilceler/:id/mahalleler', async (req, res) => {
  res.json(await prisma.mahalle.findMany({ where: { ilceId: id.parse(req.params.id) }, ...adSirali }));
});

router.get('/mahalleler/:id/sokaklar', async (req, res) => {
  res.json(await prisma.sokak.findMany({ where: { mahalleId: id.parse(req.params.id) }, ...adSirali }));
});

// Haritada işaretlemek için koordinatlar da döner.
router.get('/sokaklar/:id/binalar', async (req, res) => {
  const binalar = await prisma.bina.findMany({
    where: { sokakId: id.parse(req.params.id) },
    select: { id: true, binaNo: true, binaKodu: true, enlem: true, boylam: true },
    orderBy: { id: 'asc' },
  });
  res.json(binalar);
});

router.get('/binalar/:id/bolumler', async (req, res) => {
  const bolumler = await prisma.bagimsizBolum.findMany({
    where: { binaId: id.parse(req.params.id) },
    select: { id: true, daireNo: true, adresKodu: true },
    orderBy: { id: 'asc' },
  });
  res.json(bolumler);
});

// GET /api/adres/dogrula?adresKodu=...&enlem=...&boylam=...
router.get('/dogrula', async (req, res) => {
  const sorgu = z
    .object({
      adresKodu: z.string().regex(/^\d{10}$/, 'Adres kodu 10 haneli olmalı.'),
      enlem: z.coerce.number().min(-90).max(90).optional(),
      boylam: z.coerce.number().min(-180).max(180).optional(),
    })
    .parse(req.query);
  const { bolum, mesafe } = await adresDogrula(sorgu);
  res.json({ gecerli: true, adres: adresOzeti(bolum), mesafeMetre: mesafe });
});

module.exports = router;
