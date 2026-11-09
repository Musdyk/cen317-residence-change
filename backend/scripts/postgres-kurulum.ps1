# PostgreSQL 17'yi Windows'a kurar ve servisini başlatır.
#
# Neden gerekli: Türkçe Windows'ta bölge adı "Turkish_Türkiye.1254" olduğu için resmi
# kurulum programı initdb adımında "locale name contains non-ASCII characters" hatasıyla
# yarıda kalır. Bu betik o durumda veritabanı kümesini ICU tr-TR ile kendisi oluşturur.
#
# Kullanım (PowerShell'de, backend klasöründeyken):
#   powershell -ExecutionPolicy Bypass -File scripts\postgres-kurulum.ps1 -Sifre "postgres-icin-bir-sifre"
# Yönetici izni (UAC) penceresi çıkarsa "Evet" deyin. Sonra .env içindeki DATABASE_URL'e aynı şifreyi yazın.

param([Parameter(Mandatory = $true)][string]$Sifre)

$ErrorActionPreference = 'Stop'
$pg = 'C:\Program Files\PostgreSQL\17'
$data = "$pg\data"
$servis = 'postgresql-x64-17'

# Yönetici değilse kendini yönetici olarak yeniden başlat
$yonetici = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $yonetici) {
  Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Sifre', "`"$Sifre`"")
  Get-Service $servis -ErrorAction SilentlyContinue | Format-Table -AutoSize Name, Status
  exit
}

if (Get-Service $servis -ErrorAction SilentlyContinue) {
  Write-Host "PostgreSQL servisi zaten var ($servis). Bir şey yapılmadı."
  Start-Service $servis
  Read-Host 'Kapatmak için Enter'
  exit
}

if (-not (Test-Path "$pg\bin\initdb.exe")) {
  Write-Host 'PostgreSQL 17 indiriliyor ve kuruluyor (birkaç dakika sürebilir)...'
  winget install --id PostgreSQL.PostgreSQL.17 --source winget --exact --silent `
    --accept-package-agreements --accept-source-agreements `
    --override "--mode unattended --unattendedmodeui none --superpassword $Sifre --serverport 5432 --disable-components stackbuilder"
}

# Kurulum programı kümeyi oluşturabildiyse servis vardır; yoksa (Türkçe Windows) elle oluşturulur.
if (-not (Get-Service $servis -ErrorAction SilentlyContinue)) {
  Write-Host 'Veritabanı kümesi ICU tr-TR ile oluşturuluyor...'
  if (Test-Path $data) { Remove-Item $data -Recurse -Force }
  New-Item -ItemType Directory $data | Out-Null
  icacls $data /grant '*S-1-5-20:(OI)(CI)F' | Out-Null          # NetworkService
  icacls $data /grant "${env:USERNAME}:(OI)(CI)F" | Out-Null

  $pwfile = New-TemporaryFile
  try {
    Set-Content -Path $pwfile -Value $Sifre -Encoding ascii -NoNewline
    & "$pg\bin\initdb.exe" -D $data -U postgres -E UTF8 --pwfile=$pwfile --auth=scram-sha-256 `
        --locale-provider=icu --icu-locale=tr-TR --locale=C
    if ($LASTEXITCODE -ne 0) { throw "initdb başarısız (çıkış kodu $LASTEXITCODE)" }
  } finally {
    Remove-Item $pwfile -Force
  }

  & "$pg\bin\pg_ctl.exe" register -N $servis -U 'NT AUTHORITY\NetworkService' -D $data -S auto -o '-p 5432'
  if ($LASTEXITCODE -ne 0) { throw "Servis kaydedilemedi (çıkış kodu $LASTEXITCODE)" }
}

Start-Service $servis
Write-Host "Tamam: $servis çalışıyor. .env içindeki DATABASE_URL'e bu şifreyi yazın."
Read-Host 'Kapatmak için Enter'
