const prisma = require('../db');
const config = require('../config');
const { HttpError, mesafeMetre } = require('../utils/yardimci');

// Bir bağımsız bölümü il'e kadar tüm üst kayıtlarıyla getirmek için.
const BOLUM_DETAY = {
  bina: { include: { sokak: { include: { mahalle: { include: { ilce: { include: { il: true } } } } } } } },
};

function adresOzeti(bolum) {
  if (!bolum) return null;
  const { bina } = bolum;
  const { sokak } = bina;
  const { mahalle } = sokak;
  const { ilce } = mahalle;
  return {
    adresKodu: bolum.adresKodu,
    binaKodu: bina.binaKodu,
    il: ilce.il.ad,
    ilce: ilce.ad,
    mahalle: mahalle.ad,
    sokak: sokak.ad,
    binaNo: bina.binaNo,
    daireNo: bolum.daireNo,
    konum: { enlem: bina.enlem, boylam: bina.boylam },
    metin: `${mahalle.ad} Mah. ${sokak.ad} No:${bina.binaNo} D:${bolum.daireNo} ${ilce.ad}/${ilce.il.ad}`,
  };
}

// Adres kodunun veritabanında olduğunu ve (verildiyse) haritada işaretlenen
// noktanın binaya yeterince yakın olduğunu doğrular. Bölümü detaylarıyla döner.
async function adresDogrula({ adresKodu, enlem, boylam }) {
  const bolum = await prisma.bagimsizBolum.findUnique({ where: { adresKodu }, include: BOLUM_DETAY });
  if (!bolum) throw new HttpError(422, 'Adres kodu kayıtlı bir adrese ait değil.');

  let mesafe = null;
  if (enlem != null && boylam != null) {
    mesafe = Math.round(mesafeMetre(enlem, boylam, bolum.bina.enlem, bolum.bina.boylam));
    if (mesafe > config.maxKonumSapmasiM) {
      throw new HttpError(422, 'Haritada işaretlenen konum seçilen binayla uyuşmuyor.', {
        mesafeMetre: mesafe,
        izinVerilenMetre: config.maxKonumSapmasiM,
      });
    }
  }
  return { bolum, mesafe };
}

module.exports = { BOLUM_DETAY, adresOzeti, adresDogrula };
