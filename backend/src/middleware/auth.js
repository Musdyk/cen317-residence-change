const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils/yardimci');

// "Authorization: Bearer <token>" başlığını doğrular, req.kullanici = { id, rol } yapar.
function girisGerekli(req, _res, next) {
  const [tur, token] = (req.headers.authorization || '').split(' ');
  if (tur !== 'Bearer' || !token) throw new HttpError(401, 'Giriş yapmanız gerekiyor.');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.kullanici = { id: payload.sub, rol: payload.rol };
  } catch {
    throw new HttpError(401, 'Oturum geçersiz veya süresi dolmuş.');
  }
  next();
}

function rolGerekli(...roller) {
  return (req, _res, next) => {
    if (!roller.includes(req.kullanici?.rol)) throw new HttpError(403, 'Bu işlem için yetkiniz yok.');
    next();
  };
}

module.exports = { girisGerekli, rolGerekli };
