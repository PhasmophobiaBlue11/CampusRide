# 🚌 CampusRide — Next-Gen Campus Transportation Management System

> **A modern, secure campus transit system built to replace Base44 limitations.**
> 100% self-hosted, zero credit constraints, zero vendor lock-in, instant startup, and offline-first PWA architecture.

---

## 🌟 Why This Replaces & Improves Upon Base44

| Feature | Old Base44 App | New CampusRide |
| :--- | :--- | :--- |
| **Credits & Cost** | Burned Base44 AI/database credits on every call | **100% Free & Unlimited** (Runs locally or on free hosting) |
| **Backend & Storage** | Proprietary Deno/Base44 functions | **Zero-Dependency SQLite & Node/Python** standard runtimes |
| **Gate Alternation Check** | Occasional lag or dropped socket | **Instant atomic transaction check** (Double entry blocked, exit without entry blocked) |
| **Testing & Grading** | Required physical camera & printed QRs | **Built-in 1-Tap Simulator Tray** (Test entry, exit, invalid QR in 1 second) |
| **Live Map & GPS** | Map lag / cold starts | **Sub-second gliding pin interpolation** via `requestAnimationFrame` + SSE broadcast |
| **Languages (i18n)** | Partial dictionary | **Full 3-Language System** (English, Marathi मराठी, Hindi हिन्दी) with first-run gate |
| **Theming** | Basic toggle | **4 Color Themes** (Ocean, Sunset, Forest, Grape) + Dark/Light mode with persistence |
| **Audio Feedback** | External audio requests | **Zero-latency Web Audio API synthesizer** (Scan chirp, Entry chime, Exit tone, Error buzzer) |

---

## 🚀 Quick Start (1-Click Run)

### Option 1: Double-Click Launcher (Windows)
Double-click **`run_app.bat`** in the project directory.
It automatically:
1. Detects your Node.js or Python runtime.
2. Initializes the embedded SQLite database with pre-populated demo data.
3. Starts the server at `http://localhost:8000`.
4. Automatically opens your default web browser!

### Option 2: Run with Node.js
```bash
# Using Antigravity built-in Node 24:
agy-node server.js

# Or standard Node.js:
node server.js
```

### Option 3: Run with Python 3.14
```bash
python server.py
```

---

## 👑 Permanent Master Administrator Account

The system is hardwired with a permanent, undeletable Super Administrator account:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `Admin2026` | `Parth@123` | Permanent master account. Cannot be deleted or blocked. Has full authority to review staff requests, manage campus fleet, view audit logs, and assign gate operators. |

### 🔒 Device Isolation & 1-Account-Per-Device Policy
- **Maximum 1 Account per role per device** (1 Driver, 1 Parent, 1 Staff).
- Pure **Username + Password** authentication (Zero Google or Email OTP dependency).
- If a new account is needed on the same device, the user can delete their old device account directly from the registration screen or Settings.

Staff, Drivers, and Parents can register their own accounts directly on the respective registration pages:
- **Staff Registration**: `/#/register-staff` (Awaits admin approval before gate access)
- **Driver Registration**: `/#/register-driver` (Auto-allocates sequential vehicle label)
- **Parent Registration**: `/#/register-parent` (Captures live pickup GPS pin for student transit)

---

## 🛠️ Key Capabilities & Features

### 1. Gate Pass Scanner (`/entry-exit-scanner`)
- **Alternation Rule Enforcement**:
  - Scanning `Entry` when already inside campus triggers: `"Already inside campus — scan Exit first."`
  - Scanning `Exit` without entering triggers: `"No active entry — hasn't entered, scan Entry first."`
  - Non-pass QRs are immediately rejected.
- **Feedback**: Web Audio sound effects (welcoming arpeggio on entry, departure tone on exit, double buzzer on error).
- **Automated Alerts**: Entry notifies subscribed parents; Exit clears any pending 12h safety warnings.

### 2. Registration Scanner (`/registration-scanner`)
- Scans plain-text vehicle/staff QRs formatted like:
  ```text
  Name: Ramesh Sharma, Vehicle: MH 12 AB 1234, Type: 4_wheeler, Phone: 9876522222
  ```
- Validates required fields and auto-allocates the next sequential label (`Van 1`, `Van 2`... or `Staff 1`, `Staff 2`).
- Rejects pass QRs to prevent mix-ups.

### 3. Interactive Live Radar & Gliding Map (`/live-map`)
- Custom HTML Leaflet bus divIcons:
  - **Live En Route**: Pulsing emerald green bus pin with live beacon.
  - **Idle / Last Known**: Neutral slate grey bus pin.
- Smooth marker gliding: Coordinates interpolate smoothly over 1.8s via `requestAnimationFrame`.
- **Privacy Scoping**: Parents only see their children's vans; gate staff can switch to "Parent Directions Mode" to view student home address pins with turn-by-turn Google Maps links.

### 4. Safety Net (12h Entry Without Journey Warning)
- Detects vans that entered campus in the past 12 hours without starting a journey or exiting.
- Generates a warning alert delivered to the driver and admin.
- Automatically clears when the driver starts their journey or exits the gate!

### 5. Multi-Language (i18n) & Visual Theming
- **Languages**: English, Marathi (मराठी), Hindi (हिन्दी) with first-run modal and localStorage persistence.
- **Themes**: Ocean (Deep Blue), Sunset (Coral Amber), Forest (Emerald), Grape (Purple) + Light/Dark mode.

---

## 🌐 Deploying to the Cloud

### Deploy to Render or Railway
- Build Command: *(None needed — zero dependencies)*
- Start Command: `node server.js` or `python server.py`
- Port: Uses `process.env.PORT` automatically.

### Deploy to Vercel or Netlify
- For static frontend deployment, you can point the build directory to `public/`.
- For serverless functions, the REST routes in `server.js` map 1:1 to Vercel Serverless Functions.

---

## 📁 Project Structure

```text
campusride/
├── server.js              # Node.js 24 SQLite Backend with SSE & REST API
├── server.py              # Python 3.14 SQLite Backend with SSE & REST API
├── run_app.bat            # 1-Click launcher for Windows
├── README.md              # Project documentation
└── public/
    ├── index.html         # Responsive, mobile-first PWA HTML shell
    ├── manifest.json      # PWA Web App Manifest
    ├── sw.js              # Service Worker for offline capability
    ├── css/
    │   └── app.css        # HSL design tokens, themes, cards, animations
    ├── assets/
    │   ├── icon-192.png   # PWA App Icon (192px)
    │   └── icon-512.png   # PWA App Icon (512px)
    └── js/
        ├── sounds.js      # Web Audio API sound synthesizer
        ├── i18n.js        # English, Marathi, Hindi dictionaries
        ├── api.js         # API client with token & SSE listener
        ├── qr.js          # QR Pass generator, scanner modal & simulator
        ├── app.js         # Master router, auth guard & state container
        ├── components/
        │   ├── Header.js          # Sticky nav, theme swatches, alerts bell, demo switcher
        │   ├── LiveMap.js         # Leaflet live map with gliding pin interpolation
        │   └── LanguageGate.js    # First-run full screen language selector
        └── pages/
            ├── Login.js               # Sign in with instant 1-tap demo pills
            ├── StaffRegister.js       # Gate staff onboarding (awaits approval)
            ├── DriverRegister.js      # Driver self-registration & auto van allocation
            ├── ParentRegister.js      # Parent registration with address
            ├── ForgotPassword.js      # Password recovery
            ├── AdminDashboard.js      # Staff approval tabs (approve/reject/promote/block)
            ├── StaffHome.js           # Gate coordinator dispatch dashboard
            ├── EntryExitScanner.js    # Gate pass scanner with alternation check
            ├── RegistrationScanner.js # Vehicle QR onboarding scanner
            ├── VanRegister.js         # Daily entry/exit audit log
            ├── DriversRegistry.js     # Vans & staff registry with printable passes
            ├── DriverHome.js          # Driver journey toggle & student route directions
            ├── ParentHome.js          # Parent live status & Children Manager (up to 5)
            ├── LiveMapPage.js         # Fullscreen transit radar
            ├── Directories.js         # Tap-to-call staff & parent contacts
            └── Settings.js            # Language, theme, address, and account deletion
```
