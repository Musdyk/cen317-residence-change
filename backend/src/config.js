require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
  maxKonumSapmasiM: Number(process.env.MAX_KONUM_SAPMASI_M) || 150,
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET tanımlı değil. .env.example dosyasını .env olarak kopyalayın.');
}

module.exports = config;
