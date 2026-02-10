

# Panduan Deployment Xeenaps PKM

Aplikasi ini menggunakan arsitektur **Hybrid Cloud**:
- **Frontend**: Vercel (React + Vite)
- **Backend & API Proxy**: Google Apps Script
- **Database**: Google Sheets (Private)

## A. Setup Google Apps Script (Backend) - SANGAT PENTING
1. Buka [Google Apps Script](https://script.google.com/).
2. Buat project baru dan tempelkan kode dari `backend.gs`.
3. Klik **Deploy** -> **New Deployment**.
4. Pilih **Web App**. 
   - Execute as: **Me**
   - Who has access: **Anyone** (WAJIB: Pilih "Anyone" untuk menghindari masalah CORS).
5. Salin **Web App URL**.

## B. Setup Vercel (Frontend)
1. Push kode Anda ke GitHub.
2. Login ke [Vercel](https://vercel.com/) dan impor repositori tersebut.
3. Pada **Environment Variables**, tambahkan:
   - Key: `VITE_GAS_URL`
   - Value: `[URL_DARI_LANGKAH_A_DI_ATAS]`
4. Klik **Deploy**.

## C. Pengelolaan API KEY Gemini
Terdapat dua cara untuk menginput API KEY agar fitur AI aktif:
1. **Melalui UI Aplikasi (Rekomendasi)**:
   - Buka menu **Settings** di Xeenaps.
   - Masukkan Key dan Label pada form "Add New Gemini API Key".
   - Klik "Register Key to Rotation".
2. **Melalui Spreadsheet Langsung**:
   - Klik tombol "Audit Key Database" di menu Settings.
   - Buka sheet **ApiKeys**.
   - Input manual dengan format: `id`, `key`, `label`, `status` (active), `addedAt`.

## D. Pemecahan Masalah (Troubleshooting)
- **Error CORS**: Pastikan di setelan Deployment GAS, bagian "Who has access" adalah "Anyone". Jika masih error, buat Deployment baru.
- **AI Tidak Merespon**: Pastikan minimal ada satu API Key dengan status `active` di sheet **ApiKeys**. Periksa juga kuota free tier pada Google AI Studio.
- **Error 404**: Pastikan variabel `VITE_GAS_URL` di Vercel sudah sesuai dengan URL Web App GAS terbaru.

## E. Mencegah Supabase Pause (Keep-Alive)
Supabase Free Tier akan melakukan "Pause Project" jika tidak ada aktivitas selama 7 hari. Untuk mencegahnya secara otomatis:

1.  **Buka Project Google Apps Script** Anda.
2.  Masuk ke **Project Settings** (ikon roda gigi).
3.  Scroll ke **Script Properties**, lalu tambahkan dua properti baru:
    *   **Property**: `SUPABASE_URL` | **Value**: (URL Project Supabase Anda, misal: `https://xyz.supabase.co`)
    *   **Property**: `SUPABASE_KEY` | **Value**: (Anon Key atau Service Role Key Anda)
4.  Masuk ke menu **Triggers** (ikon jam di sidebar kiri).
5.  Klik **+ Add Trigger**.
    *   Choose which function to run: `keepSupabaseAlive`
    *   Select event source: `Time-driven`
    *   Select type of time based trigger: `Day timer`
    *   Select time of day: (Pilih jam bebas, misal `6am to 7am`)
6.  Klik **Save**.

Script ini sekarang akan otomatis "membangunkan" Supabase setiap hari sehingga project tidak akan pernah di-pause.