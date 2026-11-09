# İkametgâh Adres Değişikliği Sistemi

CEN317 ders projesi, Takım 29. Vatandaşların adres değişikliği bildirimini çevrimiçi yapıp onay sürecini
takip ettiği e-Devlet tarzı bir modül.

- Yeni adres, veritabanındaki il / ilçe / mahalle / sokak / bina / daire kayıtları ve harita konumu üzerinden doğrulanır.
- Başvuru onaylandığında barkodlu ve QR kodlu, benzersiz numaralı bir PDF belge üretilir.
- Belge, numarası girilerek veya QR kodu okutularak herkese açık sayfadan doğrulanabilir.

## Yapı

| Klasör / dosya | İçerik |
|---|---|
| `backend/` | Node.js + Express + Prisma + PostgreSQL API. Kurulum ve API listesi: [backend/README.md](backend/README.md) |
| `*.html`, `css/`, `js/` | Geçici basit ön yüz (backend tarafından `http://localhost:3000` adresinde sunulur) |

## Hızlı başlangıç

```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL içindeki şifreyi düzenleyin
npm run setup
npm run dev
```

Ardından tarayıcıda `http://localhost:3000` adresini açın. Test hesapları `backend/README.md` içinde.
