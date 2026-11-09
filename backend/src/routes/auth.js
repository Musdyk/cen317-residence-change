const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../db');
const config = require('../config');
const tc = require('../utils/tcKimlik');
const { HttpError } = require('../utils/yardimci');
const { girisGerekli } = require('../middleware/auth');
const { BOLUM_DETAY, adresOzeti } = require('../services/adresServisi');

const router = Router();

const tcAlani = z.string().refine(tc.gecerliMi, 'Geçersiz T.C. Kimlik No.');

function tokenUret(kullanici) {
  return jwt.sign({ sub: kullanici.id, rol: kullanici.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function kullaniciCiktisi(k) {
  return {
    id: k.id,
    tcNo: k.tcNo,
    ad: k.ad,
    soyad: k.soyad,
    eposta: k.eposta,
    rol: k.rol,
    mevcutAdres: adresOzeti(k.mevcutBolum),
  };
}

router.post('/giris', async (req, res) => {
  const { tcNo, sifre } = z.object({ tcNo: z.string(), sifre: z.string() }).parse(req.body);
  const kullanici = await prisma.kullanici.findUnique({ where: { tcNo }, include: { mevcutBolum: { include: BOLUM_DETAY } } });
  if (!kullanici || !(await bcrypt.compare(sifre, kullanici.sifreHash))) {
    throw new HttpError(401, 'T.C. Kimlik No veya şifre hatalı.');
  }
  res.json({ token: tokenUret(kullanici), kullanici: kullaniciCiktisi(kullanici) });
});

router.post('/kayit', async (req, res) => {
  const veri = z
    .object({
      tcNo: tcAlani,
      ad: z.string().trim().min(2),
      soyad: z.string().trim().min(2),
      eposta: z.string().email().optional(),
      sifre: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
    })
    .parse(req.body);

  if (await prisma.kullanici.findUnique({ where: { tcNo: veri.tcNo } })) {
    throw new HttpError(409, 'Bu T.C. Kimlik No ile kayıtlı bir kullanıcı var.');
  }
  const kullanici = await prisma.kullanici.create({
    data: {
      tcNo: veri.tcNo,
      ad: veri.ad,
      soyad: veri.soyad,
      eposta: veri.eposta,
      sifreHash: await bcrypt.hash(veri.sifre, 10),
    },
  });
  res.status(201).json({ token: tokenUret(kullanici), kullanici: kullaniciCiktisi(kullanici) });
});

router.get('/ben', girisGerekli, async (req, res) => {
  const kullanici = await prisma.kullanici.findUnique({
    where: { id: req.kullanici.id },
    include: { mevcutBolum: { include: BOLUM_DETAY } },
  });
  if (!kullanici) throw new HttpError(404, 'Kullanıcı bulunamadı.');
  res.json(kullaniciCiktisi(kullanici));
});

module.exports = router;
