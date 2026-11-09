// Backend ile konuşan ortak yardımcılar. Tüm sayfalar bu dosyayı yükler.
const API = '/api';

const oturum = {
  get token() { return localStorage.getItem('token'); },
  get kullanici() {
    try { return JSON.parse(localStorage.getItem('kullanici')); } catch { return null; }
  },
  kaydet(token, kullanici) {
    localStorage.setItem('token', token);
    localStorage.setItem('kullanici', JSON.stringify(kullanici));
  },
  cikis() {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    location.href = 'login.html';
  },
};

// fetch sarmalayıcı: JSON gövde gönderir, token ekler, hata mesajını fırlatır.
async function api(yol, { method = 'GET', govde } = {}) {
  const headers = {};
  if (govde !== undefined) headers['Content-Type'] = 'application/json';
  if (oturum.token) headers.Authorization = `Bearer ${oturum.token}`;

  const yanit = await fetch(API + yol, { method, headers, body: govde === undefined ? undefined : JSON.stringify(govde) });
  const veri = yanit.headers.get('content-type')?.includes('json') ? await yanit.json() : null;

  // Süresi dolmuş oturumda giriş sayfasına dön; giriş/kayıt isteğinin kendi 401'i ise ekranda hata olarak gösterilir.
  if (yanit.status === 401 && oturum.token && !yol.startsWith('/auth/giris')) oturum.cikis();
  if (!yanit.ok) {
    const detay = Array.isArray(veri?.detay) ? ' (' + veri.detay.map((d) => d.mesaj).join(', ') + ')' : '';
    throw new Error((veri?.hata || `İstek başarısız (${yanit.status})`) + detay);
  }
  return veri;
}

// Token gerektirdiği için PDF doğrudan bağlantıyla açılamaz; blob olarak alıp yeni sekmede açılır.
async function pdfAc(belgeNo) {
  const sekme = window.open('', '_blank');
  const yanit = await fetch(`${API}/belgeler/${encodeURIComponent(belgeNo)}/pdf`, {
    headers: { Authorization: `Bearer ${oturum.token}` },
  });
  if (!yanit.ok) { sekme?.close(); alert('Belge açılamadı.'); return; }
  const url = URL.createObjectURL(await yanit.blob());
  if (sekme) sekme.location.href = url; else location.href = url;
}

function mesajGoster(el, metin, tur = 'hata') {
  el.className = `mesaj ${tur} goster`;
  el.textContent = metin;
}

function mesajGizle(el) {
  el.className = 'mesaj';
}

// Giriş yapılmamışsa veya rol uymuyorsa yönlendirir; üst menüyü çizer.
function sayfaHazirla({ rol } = {}) {
  const k = oturum.kullanici;
  if (!oturum.token || !k) { location.href = 'login.html'; return null; }
  if (rol && k.rol !== rol) { location.href = k.rol === 'ADMIN' ? 'admin.html' : 'tracking.html'; return null; }

  const sayfa = location.pathname.split('/').pop();
  const baglantilar = k.rol === 'ADMIN'
    ? [['admin.html', 'Başvurular'], ['verify.html', 'Belge Doğrula']]
    : [['application.html', 'Yeni Başvuru'], ['tracking.html', 'Başvurularım'], ['verify.html', 'Belge Doğrula']];

  document.querySelector('header').innerHTML = `
    <span class="logo">İkametgâh Adres Değişikliği</span>
    ${baglantilar.map(([href, ad]) => `<a href="${href}" class="${href === sayfa ? 'aktif' : ''}">${ad}</a>`).join('')}
    <span class="kucuk" style="color:#fff">${kacis(k.ad)} ${kacis(k.soyad)}</span>
    <button id="cikisBtn">Çıkış</button>`;
  document.getElementById('cikisBtn').onclick = () => oturum.cikis();
  return k;
}
