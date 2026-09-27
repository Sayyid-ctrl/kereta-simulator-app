# 🚆 ID-RailSim 3D - Simulator Kereta Api Indonesia (Hemat Resource)

Simulator Kereta Api Indonesia 3D interaktif berbasis WebGL / Three.js yang dirancang dengan sistem modular hemat credit/resource, visual PBR realistis, fisika pengereman KAI, semboyan persinyalan resmi, dan kontrol kabin masinis autentik.

---

## 🎮 Cara Menjalankan

### Cara 1: Menggunakan Python Server (Otomatis Buka Browser)
Jalankan perintah berikut di PowerShell / Command Prompt:
```powershell
python server.py
```
Aplikasi akan membuka browser secara otomatis pada `http://localhost:8080/index.html`.

### Cara 2: Langsung Buka File HTML
Buka file [`index.html`](file:///c:/Users/LENOVO/Desktop/kereta%20simolator%20app/index.html) langsung dengan klik ganda di browser modern (Chrome, Edge, Firefox).

---

## 🕹️ Panduan Kontrol & Tombol Masinis

| Tombol Keyboard | Tombol UI | Fungsi |
| :--- | :--- | :--- |
| **W** | `▲` Throttle | Menaikkan Notch Tenaga (Notch 0 - 8) |
| **S** | `▼` Throttle | Menurunkan Notch Tenaga |
| **A** | `▲` Rem Kereta | Menambah Tekanan Rem Udara (0% - 100%) |
| **Q** | `▼` Rem Kereta | Melepas Tekanan Rem Udara (*Release*) |
| **R** | `FWD/REV` | Mengubah Arah Laju (*Reverser* Maju/Mundur) |
| **H** | `📢 SEMBOYAN 35` | Membunyikan Klakson 5-Chime Nathan/Leslie |
| **Spasi / D** | `⚠️ SIAP MASINIS` | Menekan Pedal Deadman / Konfirmasi Masinis Siap |

---

## 🌟 Fitur Utama Simulator

1. **Armada Kereta Api Indonesia**:
   - **CC 206 (GE CM20EMP)**: Lokomotif KAJJ Double-Cab livery KAI putih-oranye-biru + 6 Kereta Eksekutif K1 Stainless Steel.
   - **KRL Seri JR 205**: Rangkaian Commuter Line Jabodetabek striping merah-kuning dengan pantograf atap aktif.
2. **Lingkungan & Landmark Nusantara**:
   - Lintas ganda terelektrifikasi (LAA 1500V DC).
   - Peron Stasiun tipe Manggarai/Gambir dengan atap shelter.
   - Terowongan Sasaksaat (jalur pegunungan Priangan).
   - Jembatan Rangka Baja Tinggi Cikubang (warna merah KAI).
   - Pepohonan tropis kelapa sawit & jati.
3. **Persinyalan Semboyan KAI**:
   - **Semboyan 5** (Lampu Hijau: Berjalan aman).
   - **Semboyan 6** (Lampu Kuning: Hati-hati / jalur belok).
   - **Semboyan 7** (Lampu Merah: Berhenti).
4. **Sintesis Suara Prosedural (Web Audio API)**:
   - Suara mesin diesel bertenaga yang naik-turun sesuai notch.
   - Klakson Semboyan 35 multi-chime harmonis.
   - Suara ritme sambungan rel (*clickety-clack*) proporsional dengan kecepatan.
   - Desis rem udara (*air release hiss*) saat pengereman dilepas.
   - Buzzer alarm pengingat deadman masinis.
5. **Mode Kamera Real-Time**:
   - **Cab POV**: Sudut pandang masinis di dalam kabin lokomotif.
   - **Chase View**: Kamera pihak ketiga mengorbit rangkaian kereta.
   - **Trackside View**: Sudut pandang railfans dari pinggir rel saat kereta melintas.
   - **Gerbong K1**: Sudut pandang penumpang di samping jendela kereta eksekutif.
6. **Cuaca Tropis Dinamis & Siklus Siang/Malam**:
   - Tombol toggle hujan tropis & kabut atmosfer.
   - Tombol toggle siang / malam dengan lampu sorot utama lokomotif.
