// Ardışık adres seçimi (il → ilçe → mahalle → sokak → bina → daire) ve Leaflet haritası.
// Kullanım: const secici = adresSecici({ onDegisim }); secici.secim() → { adresKodu, enlem, boylam } | null

function adresSecici({ onDegisim = () => {} } = {}) {
  const el = (id) => document.getElementById(id);
  const seviyeler = [
    { id: 'il', yol: () => '/adres/iller', ad: (x) => x.ad },
    { id: 'ilce', yol: (u) => `/adres/iller/${u}/ilceler`, ad: (x) => x.ad },
    { id: 'mahalle', yol: (u) => `/adres/ilceler/${u}/mahalleler`, ad: (x) => x.ad },
    { id: 'sokak', yol: (u) => `/adres/mahalleler/${u}/sokaklar`, ad: (x) => x.ad },
    { id: 'bina', yol: (u) => `/adres/sokaklar/${u}/binalar`, ad: (x) => `No: ${x.binaNo} (bina kodu ${x.binaKodu})` },
    { id: 'bolum', yol: (u) => `/adres/binalar/${u}/bolumler`, ad: (x) => `Daire ${x.daireNo}` },
  ];
  const veriler = {}; // seviye id → yüklenen kayıtlar

  // Harita: Türkiye merkezli başlar, sokak seçilince binalara yaklaşır.
  const harita = L.map('harita').setView([39.0, 35.0], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(harita);
  const binaKatmani = L.layerGroup().addTo(harita);
  let isaret = null; // kullanıcının işaretlediği nokta

  function isaretKoy(enlem, boylam) {
    if (isaret) isaret.setLatLng([enlem, boylam]);
    else isaret = L.circleMarker([enlem, boylam], { radius: 9, color: '#c8102e', fillOpacity: 0.6 }).addTo(harita);
  }

  harita.on('click', (e) => {
    if (!el('bina').value) return;
    isaretKoy(e.latlng.lat, e.latlng.lng);
    onDegisim();
  });

  function temizle(baslangic) {
    for (let i = baslangic; i < seviyeler.length; i++) {
      const s = el(seviyeler[i].id);
      s.innerHTML = '<option value="">Seçiniz</option>';
      s.disabled = true;
      veriler[seviyeler[i].id] = [];
    }
  }

  async function yukle(i, ustId) {
    const s = seviyeler[i];
    const kayitlar = await api(s.yol(ustId));
    veriler[s.id] = kayitlar;
    const secim = el(s.id);
    secim.innerHTML = '<option value="">Seçiniz</option>' +
      kayitlar.map((x) => `<option value="${x.id}">${kacis(s.ad(x))}</option>`).join('');
    secim.disabled = false;

    if (s.id === 'bina') binalariCiz(kayitlar);
  }

  function binalariCiz(binalar) {
    binaKatmani.clearLayers();
    for (const b of binalar) {
      L.marker([b.enlem, b.boylam])
        .bindTooltip(`No: ${b.binaNo}`)
        .on('click', () => { el('bina').value = b.id; el('bina').dispatchEvent(new Event('change')); })
        .addTo(binaKatmani);
    }
    if (binalar.length) harita.fitBounds(binalar.map((b) => [b.enlem, b.boylam]), { padding: [40, 40], maxZoom: 17 });
  }

  seviyeler.forEach((s, i) => {
    el(s.id).addEventListener('change', async (e) => {
      temizle(i + 1);
      const deger = e.target.value;
      if (s.id === 'bina' && deger) {
        const b = veriler.bina.find((x) => String(x.id) === deger);
        isaretKoy(b.enlem, b.boylam);
        harita.setView([b.enlem, b.boylam], 18);
      }
      if (deger && i + 1 < seviyeler.length) await yukle(i + 1, deger);
      onDegisim();
    });
  });

  temizle(0);
  yukle(0);

  return {
    secim() {
      const bolum = veriler.bolum?.find((x) => String(x.id) === el('bolum').value);
      if (!bolum) return null;
      const konum = isaret?.getLatLng();
      return { adresKodu: bolum.adresKodu, enlem: konum?.lat, boylam: konum?.lng };
    },
  };
}
