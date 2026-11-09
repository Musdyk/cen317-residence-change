const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, mesaj, detay) {
    super(mesaj);
    this.status = status;
    this.detay = detay;
  }
}

// İki koordinat arasındaki mesafe (metre), Haversine formülü.
function mesafeMetre(enlem1, boylam1, enlem2, boylam2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(enlem2 - enlem1);
  const dLon = rad(boylam2 - boylam1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(enlem1)) * Math.cos(rad(enlem2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Karışmaması için 0/O, 1/I gibi karakterler alfabeden çıkarıldı.
const ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function rastgeleKod(uzunluk) {
  const bytes = crypto.randomBytes(uzunluk);
  let s = '';
  for (let i = 0; i < uzunluk; i++) s += ALFABE[bytes[i] % ALFABE.length];
  return s;
}

function maskeleIsim(ad) {
  return ad
    .split(' ')
    .map((p) => (p.length <= 1 ? p : p[0] + '*'.repeat(p.length - 1)))
    .join(' ');
}

function maskeleTc(tcNo) {
  return tcNo.slice(0, 3) + '******' + tcNo.slice(-2);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { HttpError, mesafeMetre, rastgeleKod, maskeleIsim, maskeleTc, sha256 };
