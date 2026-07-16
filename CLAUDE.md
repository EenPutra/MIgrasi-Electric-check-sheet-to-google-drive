# CLAUDE.md — Migrasi ELECTRIC-7 Check Sheet: Firebase → Google Sheets/Drive

## Konteks Project
Repo lama: https://github.com/EenPutra/CHECK-SHEET-POMI-ELEKTRIK-ONLINE
Repo ini (baru): https://github.com/EenPutra/MIgrasi-Electric-check-sheet-to-google-drive

Tujuan: migrasi backend sistem check sheet maintenance EIC7 PLTU Paiton dari
Firebase Firestore ke Google Sheets + Google Drive (via Google Apps Script),
tanpa mengganggu repo/sistem lama yang masih berjalan.

## Latar Belakang Sistem Lama
Sistem lama adalah portal HTML statis (15+ file checksheet berbeda per asset:
motor HV/LV, trafo, ESP, UPS, battery charger, MCC, hoist, generator brush
gear, dll) yang menyimpan data ke Firebase Firestore lewat `db-helper.js` +
`firebase-config.js`.

### Struktur data lama (Firestore)
- Collection `checksheets`: header flat (assetTag, woNumber, executionDate,
  checkedBy, nik, reviewedBy, shift) + field nested/dinamis:
  - `items[]` — hasil cek per baris (label, result OK/NG/NA, id, column)
  - `measurements[]` — hasil pengukuran (id, label, value, unit, column)
  - `toggleStates{}` dan `inputValues{}` — object dengan key dinamis,
    beda-beda tiap jenis checksheet
- Collection `dashboard_users`: username, password (SHA-256 hash), role
- Fitur foto (`PHOTOS[]`, base64, drag-drop, rotate) sudah ada di frontend
  tiap checksheet TAPI **belum pernah dikirim/disimpan ke Firestore** —
  cuma dipakai untuk print/PDF lokal di browser. Ini fitur baru yang perlu
  dibangun dari nol di sistem baru, bukan migrasi data yang sudah ada.

## Keputusan Arsitektur (sudah disepakati dengan user)

### Struktur folder Google Drive
```
📁 EIC7 CheckSheets (root)
 ├── 📁 HV_Motor_6Monthly/
 │    ├── 📄 HV_Motor_6Monthly_Data  (Google Sheet native)
 │    └── 📁 Photos/
 ├── 📁 Transformer_Weekly/
 │    ├── 📄 Transformer_Weekly_Data
 │    └── 📁 Photos/
 ... (1 folder per jenis checksheet, ±15 total — lihat daftar file HTML lama)
 └── 📄 MASTER_INDEX  ← index ringkas semua submission lintas asset
```

Alasan pakai `MASTER_INDEX`: dashboard tidak perlu buka 15 Sheet berbeda
untuk render list — cukup baca 1 sheet index (id, assetTag, tanggal,
status, jumlah foto, referensi sheet detail). Saat user klik salah satu
baris, baru Apps Script buka sheet detail asset yang bersangkutan.

### Format file: Google Sheets native (BUKAN .xlsx biner)
Dipilih karena jauh lebih mudah ditulis/dibaca via `SpreadsheetApp` di
Apps Script, tetap bisa di-export ke `.xlsx` kapan saja dari Drive UI.

### Foto: disimpan sebagai file Drive, BUKAN base64 di dalam sel
Alasan: 1 sel Google Sheets punya batas ±50.000 karakter, base64 foto dari
HP bisa jauh lebih besar dari itu. Alur yang benar:
1. Browser kirim foto (base64) ke Apps Script via `doPost()`
2. Apps Script decode base64 → `DriveApp.createFile()` → simpan ke folder
   `Photos/` milik asset tersebut
3. Simpan HANYA file ID/link ke kolom sheet (JSON array `[{fileId, caption}]`)
4. Saat render detail, pakai `https://drive.google.com/thumbnail?id={fileId}`

### Alur dashboard click-to-expand
1. Dashboard fetch `MASTER_INDEX` → tampilkan list
2. Klik baris → kirim `id` + `assetTag` ke Apps Script `doGet()`
3. Apps Script cari sheet detail sesuai `assetTag` → cari baris `id` →
   parse `items`, `measurements`, `toggleStates`, `inputValues`, `photos`
   (semua JSON string di kolom) → return 1 objek JSON lengkap
4. Frontend render ulang: header, tabel item OK/NG/NA, measurement, galeri foto

## Yang Belum Diputuskan / Perlu Ditanyakan ke User
- Nama pasti tiap folder/sheet per asset (bisa ikut nama file HTML lama)
- Skema sharing permission folder Drive (siapa saja yang boleh akses)
- Apakah `dashboard_users` (auth) tetap pakai pendekatan sederhana
  (hash password di sheet terpisah) atau diganti mekanisme lain

## Non-negotiables (preferensi kerja user — WAJIB diikuti)
- **Selalu tanya dulu sebelum mengasumsikan format/data** — jangan langsung
  generate struktur akhir tanpa konfirmasi kalau ada keputusan baru yang
  belum eksplisit disetujui.
- **Ikuti template/format checksheet yang sudah ada persis** — jangan
  mengubah tampilan/struktur checksheet HTML yang sudah baku kecuali diminta.
- Semua approval perubahan besar melalui supervisor Fajar DS (untuk hal
  yang menyangkut proses kerja EIC7, bukan hanya kode).

## Struktur Drive yang sudah dibuat (2026-07-16)
Root folder `EIC7 CheckSheets`: https://drive.google.com/drive/folders/1FxT9LM6ABuNnD6KFWwTWCsTWGBYMEC_r
`MASTER_INDEX`: https://docs.google.com/spreadsheets/d/1D_-B7Z2MzQxx1ML69iSNIW1jPcnx6dLmVzWQ1Taj5us

13 subfolder (masing-masing punya `{Nama}_Data` sheet + folder `Photos/`), nama ikut
file HTML lama persis: `7EPLCB4_Maintenance`, `7EPMCC_Maintenance`,
`Battery_7EB-BY-125-250`, `DRY_TRAFO_PM`, `ESP_7BGPCP800A_B`,
`GEN_BrushGear_PM_Checksheet`, `HV_Motor_6Monthly_PM`, `HV_Motor_SWGR`,
`Hoist_Inspection_Maintenance`, `LV_Motor_MCC`, `PM_CheckSheet_BYC125`,
`Transformer_Weekly_Inspection`, `Work_Activity_Record`.

Semua ID sheet/folder per asset ada di `CHECKSHEETS` map dalam `Code.gs`.

Dikecualikan dari migrasi: `esp_checksheet.html` (versi lama "V1", tidak
di-link dari `index.html` yang aktif — dianggap usang, duplikat dari
`ESP_7BGPCP800A_B`).

Catatan: `Work_Activity_Record.html` sebelumnya cuma nyimpan draft ke
`localStorage` (gak pernah ke Firestore) — folder+sheet-nya sudah dibuat,
tapi ini pada dasarnya fitur baru (belum ada data lama yang dimigrasi).

## Progress
- [x] Analisa struktur data & kode repo lama
- [x] Sepakati arsitektur folder + master index + penyimpanan foto
- [x] Buat repo baru (kosong) di GitHub, clone history dari repo lama
- [x] Setup struktur folder + sheet awal di Drive (13 subfolder + MASTER_INDEX)
- [x] Tulis `Code.gs` (doGet, doPost, LockService) — belum di-deploy, lihat
      langkah manual di bawah
- [ ] Jalankan `setupHeaders()` sekali dari Apps Script editor (perbaiki
      posisi header yang kegeser ke baris 2 akibat import CSV)
- [ ] Deploy `Code.gs` sebagai Web App, catat URL-nya
- [ ] Ganti `firebase-config.js` + `db-helper.js` jadi wrapper `fetch()` ke Apps Script Web App
- [ ] Tambah pengiriman foto (`PHOTOS[]`) ke backend — fitur baru, belum ada di sistem lama
- [ ] Bangun dashboard baru (baca `MASTER_INDEX`, klik → detail + foto)
- [ ] Testing paralel dengan sistem lama sebelum cutover

## Cara deploy Code.gs (manual, belum bisa diotomasi dari sini)
Google Drive connector yang dipakai Claude cuma bisa create file/folder,
BUKAN Apps Script API — jadi bagian ini wajib manual:
1. Buka https://script.google.com → New project
2. Hapus isi default, paste seluruh isi `Code.gs` dari repo ini
3. Jalankan fungsi `setupHeaders` sekali (pilih dari dropdown function →
   Run) untuk membetulkan header yang kegeser ke baris 2
4. Deploy → New deployment → type "Web app", execute as "Me", access
   "Anyone" (atau sesuai kebutuhan sharing) → Deploy
5. Copy Web App URL, dipakai nanti sebagai endpoint `fetch()` pengganti
   Firebase di frontend
