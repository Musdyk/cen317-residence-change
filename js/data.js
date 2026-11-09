// Ekranda gösterilecek sabit metinler.
const DURUM_ETIKET = {
  BEKLEMEDE: 'Beklemede',
  INCELEMEDE: 'İncelemede',
  ONAYLANDI: 'Onaylandı',
  REDDEDILDI: 'Reddedildi',
  IPTAL: 'İptal Edildi',
};

function durumRozeti(durum) {
  return `<span class="rozet ${durum}">${DURUM_ETIKET[durum] || durum}</span>`;
}

function tarihSaat(iso) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

function tarih(iso) {
  return new Date(iso).toLocaleDateString('tr-TR');
}

// Kullanıcıdan gelen metni HTML'e güvenle yazmak için.
function kacis(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
