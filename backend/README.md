# İkametgâh Adres Değişikliği Sistemi — Backend

CEN317 Takım 29. Node.js + Express 5 + Prisma + PostgreSQL 17.

## Kurulum

Gerekenler: **Node.js 20+** ve **PostgreSQL** (sürüm 17 önerilir).

**1. PostgreSQL** (kuruluysa atlayın)

- Windows: `backend` klasöründe şunu çalıştırın. Türkçe Windows'ta resmi kurulum programı
  "locale name contains non-ASCII characters" hatasıyla yarıda kalıyor; betik bunu da düzeltir.
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\postgres-kurulum.ps1 -Sifre "kendi-sifreniz"
  ```
- macOS: `brew install postgresql@17 && brew services start postgresql@17`
  (kullanıcı adı genelde Mac kullanıcı adınızdır ve şifre gerekmez).

**2. Proje**

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

`.env` içindeki `DATABASE_URL` satırında `SIFRENIZ` yerine PostgreSQL şifrenizi yazın. Sonra:

```bash
npm run setup               # ikametgah veritabanını oluşturur, tabloları kurar, örnek veriyi yükler
npm run dev                 # http://localhost:3000
```

Sunucu, üst klasördeki HTML dosyalarını da servis eder: `http://localhost:3000/login.html`.
Ön yüzden API'ye `fetch('/api/...')` ile göreli adresle istek atın.

Faydalı komutlar: `npm run db:reset` (veritabanını sıfırla ve seed et), `npm run db:studio` (tabloları tarayıcıda gör).

### Test hesapları (şifre: `Test1234!`)

| Rol | T.C. Kimlik No | Ad |
|---|---|---|
| ADMIN | 10000000146 | Sistem Yöneticisi |
| VATANDAS | 12345678950 | Ayşe Yılmaz (adresi var) |
| VATANDAS | 23456789060 | Mehmet Demir (adresi var) |
| VATANDAS | 34567890170 | Zeynep Kaya (adresi yok) |

## İş akışı

```
BEKLEMEDE ──(admin)──> INCELEMEDE ──(admin)──> ONAYLANDI  → belge (PDF) üretilir, kullanıcının adresi güncellenir
    │                       └──────(admin)──> REDDEDILDI (gerekçe zorunlu)
    ├──(admin)──> REDDEDILDI
    └──(vatandaş)─> IPTAL
```

Onay işlemi tek bir transaction içindedir: durum güncellemesi, geçmiş kaydı, kullanıcının
mevcut adresinin değişmesi, eski belgelerin geçersiz sayılması ve yeni belgenin kaydı birlikte yapılır.

## API

Tüm yanıtlar JSON. Hatalar `{ "hata": "...", "detay"?: ... }` biçimindedir.
🔒 = `Authorization: Bearer <token>` başlığı gerekir.

### Kimlik

| Metot | Yol | Gövde / Açıklama |
|---|---|---|
| POST | `/api/auth/giris` | `{ tcNo, sifre }` → `{ token, kullanici }` |
| POST | `/api/auth/kayit` | `{ tcNo, ad, soyad, eposta?, sifre }` → `{ token, kullanici }` |
| GET 🔒 | `/api/auth/ben` | Giriş yapan kullanıcı ve `mevcutAdres` |

### Adres (herkese açık)

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/api/adres/iller` | `[{ id, ad }]` |
| GET | `/api/adres/iller/:id/ilceler` | |
| GET | `/api/adres/ilceler/:id/mahalleler` | |
| GET | `/api/adres/mahalleler/:id/sokaklar` | |
| GET | `/api/adres/sokaklar/:id/binalar` | `[{ id, binaNo, binaKodu, enlem, boylam }]`, harita için |
| GET | `/api/adres/binalar/:id/bolumler` | `[{ id, daireNo, adresKodu }]` |
| GET | `/api/adres/dogrula?adresKodu=&enlem=&boylam=` | Adres kodu var mı, işaretlenen nokta binaya yakın mı (varsayılan en çok 150 m) |

### Başvuru

| Metot | Yol | Açıklama |
|---|---|---|
| POST 🔒 | `/api/basvurular` | Vatandaş. `{ adresKodu, tasinmaTarihi: "YYYY-MM-DD", enlem?, boylam? }` |
| GET 🔒 | `/api/basvurular/benim` | Kendi başvuruları |
| GET 🔒 | `/api/basvurular/:takipNo` | Detay + `gecmis` (zaman çizelgesi) + `belge` |
| POST 🔒 | `/api/basvurular/:takipNo/iptal` | Yalnızca BEKLEMEDE iken |

Başvuru kuralları: adres kodu kayıtlı olmalı, yeni adres mevcut adresle aynı olamaz, aynı anda tek açık
başvuru olabilir, taşınma tarihi ileri bir tarih olamaz ve 30 günden eski olamaz.

### Admin 🔒 (rol: ADMIN)

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/api/admin/basvurular?durum=&ara=&sayfa=&boyut=` | `{ toplam, sayfa, boyut, kayitlar }`. `ara`: takip no, TC veya soyad |
| GET | `/api/admin/istatistik` | Duruma göre başvuru sayıları |
| PATCH | `/api/admin/basvurular/:takipNo/durum` | `{ durum: "INCELEMEDE" \| "ONAYLANDI" \| "REDDEDILDI", aciklama? }` |

### Belge

| Metot | Yol | Açıklama |
|---|---|---|
| GET 🔒 | `/api/belgeler/:belgeNo/pdf` | PDF (sahibi veya admin). Token gerektiği için ön yüzde `fetch` + `blob` ile açın |
| GET | `/api/dogrula/:belgeNo` | Herkese açık. `{ bulundu, gecerli, durumMesaji, kisi (maskeli), adres, sha256, ... }` |

PDF'teki QR kod `PUBLIC_URL/verify.html?no=<belgeNo>` adresini taşır. `verify.html`, `no` parametresini
okuyup `/api/dogrula/:belgeNo` çağırmalı. Kullanıcı PDF dosyasını yüklerse, tarayıcıda
`crypto.subtle.digest('SHA-256', ...)` ile hesaplanan özet yanıttaki `sha256` ile karşılaştırılarak
belgenin değiştirilmediği gösterilebilir.

## Klasörler

```
prisma/schema.prisma    veritabanı şeması
prisma/seed.js          örnek il/ilçe/mahalle/sokak/bina/daire verisi + test kullanıcıları
src/routes/             HTTP uçları
src/services/           iş kuralları (adres doğrulama, durum geçişleri, PDF)
src/middleware/         JWT doğrulama, rol kontrolü, hata yakalama
src/utils/              TC kimlik algoritması, Haversine mesafe, maskeleme
```
