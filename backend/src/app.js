const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { hataYakalayici, bulunamadi } = require('./middleware/hata');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/saglik', (_req, res) => res.json({ durum: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/adres', require('./routes/adres'));
app.use('/api/basvurular', require('./routes/basvuru'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/belge'));
app.use('/api', bulunamadi);

// Ön yüz dosyaları (login.html, verify.html ...) aynı sunucudan servis edilir;
// böylece QR koddaki bağlantı doğrudan çalışır ve CORS ayarı gerekmez.
const ON_YUZ = path.join(__dirname, '..', '..');
// backend/ klasörü (kaynak kod, veritabanı dosyası) aynı dizinde olduğu için dışarıya kapatılır.
app.use('/backend', (_req, res) => res.status(404).end());
app.use(express.static(ON_YUZ, { index: 'login.html', dotfiles: 'ignore' }));

app.use(hataYakalayici);

module.exports = app;
