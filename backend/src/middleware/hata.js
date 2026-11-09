const { ZodError } = require('zod');
const { HttpError } = require('../utils/yardimci');

// Tüm hatalar { hata: "...", detay?: ... } biçiminde döner.
// eslint-disable-next-line no-unused-vars
function hataYakalayici(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      hata: 'Geçersiz istek verisi.',
      detay: err.issues.map((i) => ({ alan: i.path.join('.'), mesaj: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ hata: err.message, ...(err.detay && { detay: err.detay }) });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'Gövde geçerli bir JSON değil.' });
  }
  console.error(err);
  res.status(500).json({ hata: 'Sunucu hatası.' });
}

function bulunamadi(_req, res) {
  res.status(404).json({ hata: 'Uç nokta bulunamadı.' });
}

module.exports = { hataYakalayici, bulunamadi };
