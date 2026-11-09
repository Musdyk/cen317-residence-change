-- CreateTable
CREATE TABLE "Il" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,

    CONSTRAINT "Il_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ilce" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "ilId" INTEGER NOT NULL,

    CONSTRAINT "Ilce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mahalle" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "ilceId" INTEGER NOT NULL,

    CONSTRAINT "Mahalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sokak" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "mahalleId" INTEGER NOT NULL,

    CONSTRAINT "Sokak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bina" (
    "id" SERIAL NOT NULL,
    "binaNo" TEXT NOT NULL,
    "binaKodu" TEXT NOT NULL,
    "enlem" DOUBLE PRECISION NOT NULL,
    "boylam" DOUBLE PRECISION NOT NULL,
    "sokakId" INTEGER NOT NULL,

    CONSTRAINT "Bina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BagimsizBolum" (
    "id" SERIAL NOT NULL,
    "daireNo" TEXT NOT NULL,
    "adresKodu" TEXT NOT NULL,
    "binaId" INTEGER NOT NULL,

    CONSTRAINT "BagimsizBolum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kullanici" (
    "id" SERIAL NOT NULL,
    "tcNo" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "eposta" TEXT,
    "sifreHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'VATANDAS',
    "mevcutBolumId" INTEGER,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basvuru" (
    "id" SERIAL NOT NULL,
    "takipNo" TEXT NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "eskiBolumId" INTEGER,
    "yeniBolumId" INTEGER NOT NULL,
    "tasinmaTarihi" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'BEKLEMEDE',
    "redGerekcesi" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basvuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasvuruGecmisi" (
    "id" SERIAL NOT NULL,
    "basvuruId" INTEGER NOT NULL,
    "eskiDurum" TEXT,
    "yeniDurum" TEXT NOT NULL,
    "degistirenId" INTEGER,
    "aciklama" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasvuruGecmisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Belge" (
    "id" SERIAL NOT NULL,
    "belgeNo" TEXT NOT NULL,
    "basvuruId" INTEGER NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "pdf" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "gecerli" BOOLEAN NOT NULL DEFAULT true,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Belge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Il_ad_key" ON "Il"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "Ilce_ilId_ad_key" ON "Ilce"("ilId", "ad");

-- CreateIndex
CREATE UNIQUE INDEX "Mahalle_ilceId_ad_key" ON "Mahalle"("ilceId", "ad");

-- CreateIndex
CREATE UNIQUE INDEX "Sokak_mahalleId_ad_key" ON "Sokak"("mahalleId", "ad");

-- CreateIndex
CREATE UNIQUE INDEX "Bina_binaKodu_key" ON "Bina"("binaKodu");

-- CreateIndex
CREATE UNIQUE INDEX "Bina_sokakId_binaNo_key" ON "Bina"("sokakId", "binaNo");

-- CreateIndex
CREATE UNIQUE INDEX "BagimsizBolum_adresKodu_key" ON "BagimsizBolum"("adresKodu");

-- CreateIndex
CREATE UNIQUE INDEX "BagimsizBolum_binaId_daireNo_key" ON "BagimsizBolum"("binaId", "daireNo");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_tcNo_key" ON "Kullanici"("tcNo");

-- CreateIndex
CREATE UNIQUE INDEX "Basvuru_takipNo_key" ON "Basvuru"("takipNo");

-- CreateIndex
CREATE INDEX "Basvuru_kullaniciId_idx" ON "Basvuru"("kullaniciId");

-- CreateIndex
CREATE INDEX "Basvuru_durum_idx" ON "Basvuru"("durum");

-- CreateIndex
CREATE INDEX "BasvuruGecmisi_basvuruId_idx" ON "BasvuruGecmisi"("basvuruId");

-- CreateIndex
CREATE UNIQUE INDEX "Belge_belgeNo_key" ON "Belge"("belgeNo");

-- CreateIndex
CREATE UNIQUE INDEX "Belge_basvuruId_key" ON "Belge"("basvuruId");

-- CreateIndex
CREATE INDEX "Belge_kullaniciId_idx" ON "Belge"("kullaniciId");

-- AddForeignKey
ALTER TABLE "Ilce" ADD CONSTRAINT "Ilce_ilId_fkey" FOREIGN KEY ("ilId") REFERENCES "Il"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mahalle" ADD CONSTRAINT "Mahalle_ilceId_fkey" FOREIGN KEY ("ilceId") REFERENCES "Ilce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sokak" ADD CONSTRAINT "Sokak_mahalleId_fkey" FOREIGN KEY ("mahalleId") REFERENCES "Mahalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bina" ADD CONSTRAINT "Bina_sokakId_fkey" FOREIGN KEY ("sokakId") REFERENCES "Sokak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagimsizBolum" ADD CONSTRAINT "BagimsizBolum_binaId_fkey" FOREIGN KEY ("binaId") REFERENCES "Bina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kullanici" ADD CONSTRAINT "Kullanici_mevcutBolumId_fkey" FOREIGN KEY ("mevcutBolumId") REFERENCES "BagimsizBolum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basvuru" ADD CONSTRAINT "Basvuru_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basvuru" ADD CONSTRAINT "Basvuru_eskiBolumId_fkey" FOREIGN KEY ("eskiBolumId") REFERENCES "BagimsizBolum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basvuru" ADD CONSTRAINT "Basvuru_yeniBolumId_fkey" FOREIGN KEY ("yeniBolumId") REFERENCES "BagimsizBolum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasvuruGecmisi" ADD CONSTRAINT "BasvuruGecmisi_basvuruId_fkey" FOREIGN KEY ("basvuruId") REFERENCES "Basvuru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasvuruGecmisi" ADD CONSTRAINT "BasvuruGecmisi_degistirenId_fkey" FOREIGN KEY ("degistirenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_basvuruId_fkey" FOREIGN KEY ("basvuruId") REFERENCES "Basvuru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
