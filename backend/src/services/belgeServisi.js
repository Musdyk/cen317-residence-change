const path = require('node:path');
const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const config = require('../config');
const { maskeleTc } = require('../utils/yardimci');

// Standart PDF fontları Türkçe karakterleri (ş, ğ, ı, İ) içermediği için DejaVu kullanılır.
const FONT_DIZINI = path.dirname(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
const FONT = path.join(FONT_DIZINI, 'DejaVuSans.ttf');
const FONT_KALIN = path.join(FONT_DIZINI, 'DejaVuSans-Bold.ttf');

function dogrulamaAdresi(belgeNo) {
  return `${config.publicUrl}/verify.html?no=${encodeURIComponent(belgeNo)}`;
}

function tarihMetni(tarih) {
  return new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Yerleşim yeri (ikametgâh) belgesini üretir ve PDF'i Buffer olarak döner.
async function belgePdfUret({ belgeNo, tarih, kullanici, yeniAdres, eskiAdres, basvuru }) {
  const [barkod, qr] = await Promise.all([
    bwipjs.toBuffer({ bcid: 'code128', text: belgeNo, scale: 2, height: 12, includetext: true, textxalign: 'center' }),
    bwipjs.toBuffer({ bcid: 'qrcode', text: dogrulamaAdresi(belgeNo), scale: 3 }),
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: `Yerleşim Yeri Belgesi ${belgeNo}`, Author: 'İkametgâh Adres Değişikliği Sistemi', CreationDate: tarih },
  });
  const parcalar = [];
  doc.on('data', (p) => parcalar.push(p));
  const bitti = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(parcalar))));

  doc.registerFont('normal', FONT);
  doc.registerFont('kalin', FONT_KALIN);

  doc.font('kalin').fontSize(16).text('T.C.', { align: 'center' });
  doc.fontSize(14).text('YERLEŞİM YERİ VE DİĞER ADRES BELGESİ', { align: 'center' });
  doc.moveDown(0.3).font('normal').fontSize(9).fillColor('#555')
    .text('(Bu belge CEN317 ders projesi kapsamında üretilmiş örnek bir belgedir.)', { align: 'center' });
  doc.fillColor('#000').moveDown(1.5);

  const satir = (etiket, deger) => {
    doc.font('kalin').fontSize(10).text(etiket, { continued: true, width: 495 });
    doc.font('normal').text(` ${deger}`);
    doc.moveDown(0.4);
  };

  satir('Belge No:', belgeNo);
  satir('Düzenlenme Tarihi:', tarihMetni(tarih));
  satir('Başvuru Takip No:', basvuru.takipNo);
  doc.moveDown(0.5);
  satir('T.C. Kimlik No:', maskeleTc(kullanici.tcNo));
  satir('Adı Soyadı:', `${kullanici.ad} ${kullanici.soyad}`);
  doc.moveDown(0.5);
  satir('Yerleşim Yeri Adresi:', yeniAdres.metin);
  satir('Adres Kodu:', yeniAdres.adresKodu);
  satir('Bina Kodu:', yeniAdres.binaKodu);
  satir('Adrese Taşınma Tarihi:', tarihMetni(basvuru.tasinmaTarihi));
  if (eskiAdres) satir('Önceki Adres:', eskiAdres.metin);

  doc.moveDown(2);
  const y = doc.y;
  doc.image(barkod, 50, y, { width: 250 });
  doc.image(qr, 425, y - 10, { width: 110 });
  doc.font('normal').fontSize(8).fillColor('#333')
    .text('Belgenin geçerliliğini QR kodu okutarak veya aşağıdaki adreste belge numarasını girerek doğrulayabilirsiniz:', 50, y + 120, { width: 495 })
    .text(dogrulamaAdresi(belgeNo), { link: dogrulamaAdresi(belgeNo), underline: true });

  doc.end();
  return bitti;
}

module.exports = { belgePdfUret, dogrulamaAdresi };
