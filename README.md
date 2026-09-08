# NetTopology 🌐

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/shahbazimasoud/NetTopology)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/shahbazimasoud/NetTopology)
[![Node](https://img.shields.io/badge/node-20%2B%20%7C%2022%20LTS-brightgreen.svg)](https://nodejs.org)

سامانه جامع مدیریت، مانیتورینگ توپولوژی شبکه و مدیریت تجهیزات سیسکو (سویچ و روتر) - نسخه ۱.۱.۰
A Comprehensive Network Topology, Cisco Switch/Router Management & Visual Configuration Platform - Version 1.1.0

---

## 📑 فهرست مطالب / Table of Contents
- [بخش اول: راهنمای فارسی (Persian)](#بخش-اول-راهنمای-فارسی)
  - [معرفی پروژه](#معرفی-پروژه)
  - [ویژگی‌ها و قابلیت‌های کلیدی](#ویژگیها-و-قابلیتهای-کلیدی)
  - [ساختار معماری و تکنولوژی‌ها](#ساختار-معماری-و-تکنولوژیها)
  - [راهنمای نصب و راه‌اندازی](#راهنمای-نصب-و-راهاندازی)
  - [اسکریپت‌های سیستمی](#اسکریپتهای-سیستمی)
  - [دستورالعمل توسعه و مشارکت هوش مصنوعی](#دستورالعمل-توسعه-و-مشارکت-هوش-مصنوعی)
- [Part 2: English Documentation](#part-2-english-documentation)
  - [Project Overview](#project-overview)
  - [Key Features](#key-features)
  - [System Architecture & Stack](#system-architecture--stack)
  - [Installation & Setup](#installation--setup)
  - [System Scripts](#system-scripts)
  - [AI Agent Instructions](#ai-agent-instructions)

---

# بخش اول: راهنمای فارسی

## معرفی پروژه
**NetTopology** یک پلتفرم یکپارچه و پیشرفته برای مدیریت زیرساخت‌های شبکه محلی (LAN)، پایش وضعیت سوئیچ‌ها و روترهای سیسکو، بازرسی بصری پورت‌ها و رک‌ها، و اجرای دستورات خط فرمان (CLI) به صورت تعاملی و هوشمند است. این نرم‌افزار به مهندسان شبکه و مدیران سیستم امکان می‌دهد بدون نیاز به کنسول‌های سنتی و پراکنده، تمامی سویچ‌های سازمان را از طریق یک داشبورد مدرن، تعاملی و مجهز به گرافیک فیس‌پلیت سخت‌افزاری مدیریت نمایند.

---

## ویژگی‌ها و قابلیت‌های کلیدی

### ۱. بازرسی گرافیکی پورت‌ها با فیس‌پلیت واقعی RJ-45 (Switch Faceplate)
- **شبیه‌سازی دقیق سخت‌افزاری:** نمایش پورت‌های سوئیچ با کامپوننت گرافیکی وکتور (SVG) کانکتور شبکه RJ-45 شامل پین‌های طلایی، ضامن سوکت و پین‌اوت‌های استاندارد.
- **چراغ‌های وضعیت LED:** پایش وضعیت فیزیکی پورت (Up، Down، Administratively Disabled) همراه با افکت‌های نوری و پالس آنلاین.
- **نشان‌های هوشمند مود و VLAN:** تفکیک پورت‌های Access و Trunk با تگ‌های رنگی پرکنتراست و نمایش آنی شماره VLAN.
- **تغییرات بلادرنگ پورت:** امکان ویرایش نام، وضعیت فعال/غیرفعال، جابجایی بین مدهای اکسس و ترانک، و تعیین Allowed VLANs با ارائه پیش‌نمایش تفاوت‌ها (Diff Preview) قبل از اعمال.

### ۲. امنیت پورت لایه ۲ سیسکو (Cisco Port Security)
- **فعال‌سازی با کلید تعاملی با کنتراست بالا:** اعمال پیکربندی `switchport port-security` روی پورت‌های اکسس.
- **حالت‌های یادگیری مک‌آدرس (MAC Learning):**
  - حالت داینامیک چسبنده (**Sticky MAC**): یادگیری خودکار مک‌آدرس‌های فعال و ثبت آن‌ها در پیکربندی.
  - حالت پیکربندی دستی (**Configured MAC**): وارد کردن مک‌آدرس‌های اختصاصی و مجاز.
- **تنظیم حداکثر مجاز مک‌آدرس‌ها (Maximum MACs):** جلوگیری از حملات MAC Flooding.
- **اکشن‌های تخطی امنیتی (Violation Actions):**
  - **Shutdown:** خاموش شدن آنی پورت و ورود به وضعیت `err-disabled`.
  - **Restrict:** ارسال پکت هشدار لاگ SNMP و بلاک کردن ترافیک مک غیرمجاز.
  - **Protect:** متوقف‌سازی بسته‌ها در سکوت بدون ارسال Trap.

### ۳. ترمینال تعاملی خط فرمان سیسکو (Interactive Cisco CLI Terminal)
- **شبیه‌ساز قدرتمند IOS-XE:** پشتیبانی از مدهای استاندارد سیسکو:
  - `USER_EXEC` (`Switch>`)
  - `PRIVILEGED_EXEC` (`Switch#`)
  - `GLOBAL_CONFIG` (`Switch(config)#`)
  - `INTERFACE_CONFIG` (`Switch(config-if)#`)
  - `VLAN_CONFIG` (`Switch(config-vlan)#`)
- **سایدبار راهنمای هوشمند دستورات مرحله:** نمایش دستورات متناسب با مد جاری همراه با توضیحات فارسی، امکان درج دستور در خط فرمان با یک کلیک و اجرای آنی با دکمه اختصاصی.
- **قابلیت‌های کاربردی CLI:** تاریخچه دستورات با کلیدهای جهت‌نما (Arrow Up/Down)، تکمیل خودکار با کلید Tab، و راهنمای دستور با علامت سوال (`?`).
- **کنتراست فوق‌العاده و تمیز:** متن فیروزه‌ای، مکان‌نمای سبز زمردی و متن‌های لاگ سیستم بدون افتادگی رنگ در هر دو تم روشن و تاریک.

### ۴. مدیریت تغییرات ذخیره‌نشده و رایت در حافظه (NVRAM Write Memory)
- **شناسایی تغییرات رایت‌نشده:** تشخیص عدم تطابق بین `running-config` و `startup-config` با نمایش بج هشدار زرد رنگ.
- **کلید مستقیم Write:** امکان اجرای بلادرنگ دستور `write memory` / `copy run start` مستقیماً از هدر مدال پورت‌ها، ترمینال و داشبورد بدون نیاز به تایپ دستی.

### ۵. موتور قالب‌های کانفیگ و کلونینگ تعاملی (Config Templates & Cloning)
- **تمپلیت‌های ماژولار:** ذخیره و اعمال کانفیگ‌های استاندارد (نظیر سکیوریتی اولیه، تنطیمات SSH، کانفیگ VLANها و ترانک‌ها).
- **پارامترهای متغیر پویا:** درج متغیرهایی مانند `{{HOSTNAME}}` و `{{IP_ADDRESS}}` و جایگزینی هوشمند آن‌ها قبل از ارسال به دیوایس.
- **تست و بررسی Diff قبل از اعمال:** مشاهده خط‌به‌خط تغییرات ارسالی به سوئیچ برای پیشگیری از اختلال در شبکه.

### ۶. نقشه توپولوژی شبکه و مدیریت رک‌ها (Topology & Rack Layout)
- **پایش مکانی:** دسته‌بندی تجهیزات بر اساس ساختمان، طبقه، واحد و رک فیزیکی.
- **پایش وضعیت اتصال:** نمایش وضعیت آنلاین/آفلاین بودن هر سوئیچ و روتر با پینگ و تله‌متری دوره‌ای.
- **فیلترهای پیشرفته:** جستجوی آنی بر اساس آی‌پی، نام سوئیچ، مدل و پورت‌های فعال.

### ۷. استایل مدرن شیشه‌ای تیره (Spatial Dark Glassmorphism)
- تمامی پنجره‌های پاپ‌آپ و مودال‌های سیستم از افکت تیره شیشه‌ای بلور (`backdrop-filter: blur(14px)`) بهره می‌برند تا تمرکز کاربر حفظ شده و هیچ‌گونه تداخل بصری با هدر یا بدنه رخ ندهد.
- پشتیبانی کامل از **Dark Mode** و **Light Mode** با کنتراست اصلاح‌شده و تاییدیه استانداردهای دسترس‌پذیری.

---

## ساختار معماری و تکنولوژی‌ها
- **Front-End:** React 18+، TypeScript، Tailwind CSS v4، Lucide React، Motion
- **Back-End:** Node.js، Express، Bun / Tsx Runtime
- **شبکه و ارتباطات:** RESTful APIs، شبیه‌ساز پایپ‌لاین Cisco IOS-XE CLI
- **ذخیره‌سازی و پایداری:** ساختار داده‌های جیسون ماژولار و هماهنگ با سرویس‌های ابری

---

## راهنمای نصب و راه‌اندازی

### ۱. نصب خودکار روی سرور و لینوکس با یک دستور (پیشنهادی / One-Liner Setup)
دقیقاً مشابه سیستم Matrix Stack Manager، می‌توانید این سامانه را با یک خط دستور به صورت خودکار، کامل و بی‌نقص روی سرورهای ابری، VPS یا ماشین‌های لینوکسی (Ubuntu 20.04/22.04/24.04 یا Debian 11/12) نصب و پیکربندی کنید:

```bash
curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/setup-panel.sh | sudo bash
```

#### قابلیت‌های اسکریپت نصب `setup-panel.sh`:
- **پیکربندی هوشمند دوپورت (Dual-Port Architecture) و پل ارتباطی خودکار (Interconnection Bridge)**:
  - دریافت پورت فرانت‌اند (رابط وب و داشبورد مدیریتی - پیش‌فرض: `3000`).
  - دریافت پورت بک‌اند (موتور پایتون سیسکو و اندپوینت‌های API - پیش‌فرض: `5001`).
  - بررسی عدم تداخل پورت‌ها و برقراری ارتباط خودکار دوطرفه از طریق Reverse-Proxy داخلی اکسپرس (تمامی درخواست‌های `/api/*` از پورت فرانت‌اند به پورت بک‌اند فوروارد می‌شوند تا در مرورگر کاربر هیچ‌گونه خطای CORS یا تداخل پورتی پیش نیاید).
- بررسی و نصب خودکار وابستگی‌های سیستمی (`curl`, `git`, `python3`, `openssl`, `build-essential`, `ufw`).
- شناسایی هوشمند یا دانلود و نصب باینری نسخه رسمی `Node.js 22 LTS`.
- دریافت کدهای پروژه از GitHub با مکانیزم‌های آینه (Proxy Mirror) و بک‌آپ ZIP در صورت وجود اختلال اینترنت.
- بازیابی خودکار دیتابیس توپولوژی و کانفیگ‌ها در صورت نصب مجدد (`/etc/nettopology-backup`).
- ساخت فایل `.env` و انتقال متغیرهای `PORT`، `FRONTEND_PORT`، `BACKEND_PORT` به سرویس‌ها.
- نصب پکیج‌های NPM با تنظیمات Timeout پایدار و ریجستری‌های آینه در صورت نیاز.
- کامپایل و بیلد نسخه نهایی (Production Vite & TypeScript).
- ساخت و فعال‌سازی دائمی سرویس Daemon در Systemd (`nettopology.service`) با قابلیت راه‌اندازی خودکار پس از بوت سرور.
- امکان راه‌اندازی خودکار ریورس‌پروکسی Nginx با گواهی SSL خودامضا (Self-Signed) و پشتیبانی از استریم و وب‌سوکت خط فرمان سیسکو.
- باز کردن خودکار پورت‌های فرانت‌اند و بک‌اند در فایروال UFW.

### ۲. حذف کامل یا پاک‌سازی پنل (Uninstaller)
برای حذف کامل پنل به همراه بک‌آپ‌گیری امن از داده‌های شبکه:
```bash
curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/uninstall-panel.sh | sudo bash
```

---

### ۳. نصب دستی از طریق سورس‌کد
```bash
# کلون کردن ریپازیتوری
git clone https://github.com/shahbazimasoud/NetTopology.git
cd NetTopology

# اجرای اسکریپت راه‌اندازی محلی
sudo bash setup-panel.sh
# یا نصب دستی:
npm install
npm run build
npm start
```
برنامه روی آدرس `http://localhost:3000` اجرا خواهد شد.

---

## اسکریپت‌های سیستمی
در ریشه پروژه اسکریپت‌های کمکی زیر برای مدیریت سرویس در محیط لینوکس قرار دارند:
- `start.sh`: اجرای خودکار سرور در پس‌زمینه
- `stop.sh`: متوقف‌سازی سرویس در حال اجرا
- `restart.sh`: راه‌اندازی مجدد سرور و اعمال تغییرات
- `install.sh`: نصب کامل پکیج‌ها و تنظیمات محیطی

---

## دستورالعمل توسعه و مشارکت هوش مصنوعی
برای هر هوش مصنوعی (AI Coding Agent) یا توسعه‌دهنده‌ای که بر روی این پروژه کد می‌زند:
> ۱. **قانون به‌روزرسانی README**: هر قابلیت، ماژول یا بهینه‌سازی جدیدی که به پروژه اضافه می‌شود **باید بلافاصله در فایل `README.md` (هم در بخش فارسی و هم انگلیسی)** مستند و ثبت گردد.
> ۲. **قانون الزامی ثبت نسخه (Versioning)**: بعد از هر بار تغییر، رفع باگ یا اصلاح اسکریپت‌ها، هوش مصنوعی **موظف است نسخه پروژه را بر اساس استاندارد Semantic Versioning ارتقا دهد** (`package.json`، `setup-panel.sh`، `install.sh`، `README.md` و پیام‌های کامیت Git).
> ۳. **گیت و کامیت خودکار**: تمامی تغییرات باید خودکار همراه با پیام توصیفی دوزبانه روی برنچ `master` مخزن گیت‌هاب کامیت و پوش شوند. جزئیات بیشتر در فایل `AGENTS.md` درج شده است.

### تاریخچه نسخه‌ها و رفع مشکلات (Release Notes & Troubleshooting)
- **نسخه ۱.۱.۰ (v1.1.0 - رفع مشکل عدم نمایش صفحه وب)**:
  - **ریشه‌یابی باگ قبلی:** در نسخه‌های پیشین، استفاده از متغیر `import.meta.url` درون باندل CommonJS (`dist/server.cjs`) منجر به خطای مهلک زمان اجرا (`TypeError [ERR_INVALID_ARG_TYPE]`) می‌شد و پراسس نود در ابتدای شروع به کار کرش می‌کرد. همچنین اسکریپت پایتون به اشتباه در مسیر `dist/backend/server.py` جستجو می‌شد.
  - **اصلاحات اعمال‌شده:** 
    - پیاده‌سازی متد ایمن شناسایی مسیر ریشه پروژه (`projectRoot`) سازگار با هر دو محیط توسعه TSX و کامپایل CJS.
    - تصحیح مسیر لودینگ موتور پایتون سیسکو و سرو فایل‌های استاتیک ریکت.
    - پیکربندی Nginx برای شنود بر روی هر دو پروتکل HTTP استاندارد (پورت ۸۰) و HTTPS رمزنگاری‌شده با گواهی خودکار SSL.
    - اضافه شدن مکانیزم بررسی زنده پاسخ‌دهی HTTP (Health Check Verification) پس از نصب سرویس.

---
---

# Part 2: English Documentation

## Project Overview
**NetTopology** is a comprehensive, production-ready web platform engineered for enterprise Local Area Network (LAN) management, Cisco switch and router topology visualization, visual rack faceplate inspection, and interactive command-line interface (CLI) administration. It eliminates the need for scattered terminal windows and archaic console cables by providing an integrated, stateful, and visually rich management environment.

---

## Key Features

### 1. Visual Switch Faceplate with True RJ-45 Vector Jack (`NetworkPortSvg`)
- **Hardware-Accurate Visualization:** High-fidelity SVG rendering of physical 8P8C (RJ-45) modular ports with gold contacts, latch tabs, and realistic socket housing.
- **Dynamic Port Status LEDs:** Real-time visual feedback reflecting operational states (Up, Down, Administratively Disabled) with pulsating glow effects.
- **VLAN & Mode Indicators:** Distinct visual badges for Access vs. Trunk modes, with high-contrast VLAN tags readable in both light and dark aesthetics.
- **Interactive Port Inspector:** One-click modal to inspect port parameters, toggle operational states, reassign VLANs, and preview configuration diffs before execution.

### 2. Cisco Layer-2 Port Security Management
- **One-Touch Port Security Toggle:** Effortlessly apply `switchport port-security` with dedicated high-contrast controls.
- **MAC Address Learning Modes:**
  - **Sticky MAC (`switchport port-security mac-address sticky`):** Automatically captures and converts dynamically learned MACs into secure running-config entries.
  - **Configured MAC:** Specify authorized hardware addresses manually.
- **Maximum MAC Limit (`maximum <1-1024>`):** Guards against MAC address table overflow attacks.
- **Violation Action Policies:**
  - **Shutdown:** Immediately sets interface to `err-disabled` state upon unauthorized access.
  - **Restrict:** Drops violating traffic, increments counter, and sends SNMP trap.
  - **Protect:** Drops unauthorized packets without logging.

### 3. Interactive Cisco IOS-XE Terminal Emulator
- **Context-Aware CLI Hierarchy:** Seamlessly switches execution modes:
  - `USER_EXEC` (`Switch>`)
  - `PRIVILEGED_EXEC` (`Switch#`)
  - `GLOBAL_CONFIG` (`Switch(config)#`)
  - `INTERFACE_CONFIG` (`Switch(config-if)#`)
  - `VLAN_CONFIG` (`Switch(config-vlan)#`)
- **Stage-Aware Command Helper Sidebar:** Dynamically presents valid commands for the active prompt mode with explanatory descriptions, one-click insertion, and direct execution buttons.
- **CLI Usability Enhancements:** Tab completion, history navigation via Up/Down arrow keys, and standard Cisco `?` help querying.
- **High-Contrast Terminal Palette:** Cyan input font, emerald blinking cursor, and legible slate system text engineered to prevent low-contrast washout in light mode.

### 4. Unsaved Configuration Detection & NVRAM Write
- **Startup vs. Running-Config Tracking:** Detects unsaved volatile memory changes and triggers warning badges.
- **Direct Write Action:** One-click `write memory` / `copy running-config startup-config` triggers from the port inspector, terminal header, or dashboard.

### 5. Config Templates & Interactive Cloning Engine
- **Reusable Configuration Templates:** Create standard templates for base hardening, SSH, banner, NTP, and VLAN assignments.
- **Dynamic Parameter Replacement:** Interpolates template placeholders (e.g. `{{HOSTNAME}}`, `{{IP_ADDRESS}}`) before pushing to target appliances.
- **Diff & Validation View:** Visual comparison of running configurations vs. target states before deployment.

### 6. Topology Mapping & Rack Hierarchy
- **Physical Organization:** Hierarchical grouping by building, floor, room, and rack unit.
- **Real-Time Health Monitoring:** Visual indicators for device reachability, uptime, and firmware versions.
- **Fast Search & Filtering:** Filter devices by IP, model, location, or active port status.

### 7. Dark Glassmorphism Modal Architecture
- Universal backdrop blur (`.modal-backdrop-blur`, `backdrop-filter: blur(14px)`) ensures focus and eliminates color clashing with headers and backgrounds.
- High-contrast accessibility compliance across both Dark and Light themes.

---

## System Architecture & Stack
- **Client Framework:** React 18+, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Server Runtime:** Node.js, Express, Bun / Tsx
- **Protocols & Simulation:** RESTful API with simulated Cisco IOS-XE parser engine
- **Style System:** Tailored CSS custom properties with strict light/dark theme overrides

---

## Installation & Setup

### 1. Automated VPS / Server Deployment (Recommended One-Liner)
Just like Matrix Stack Manager, you can deploy NetTopology to any Ubuntu 20.04/22.04/24.04 or Debian 11/12 VPS/Dedicated server with a single terminal command:

```bash
curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/setup-panel.sh | sudo bash
```

#### Installer Features:
- **Dual-Port Engine Architecture & Automated Interconnection Bridge**:
  - Prompts for Frontend Port (Web UI & Network Management Dashboard - default: `3000`).
  - Prompts for Backend Port (Python Cisco Topology & Switch API Engine - default: `5001`).
  - Automatically validates that ports do not collide and configures an internal Express reverse proxy that seamlessly forwards all `/api/*` requests from the frontend port to the backend port, preventing browser CORS or cross-port issues.
- Automatically detects or installs `Node.js 22 LTS` via official binaries or NodeSource.
- Multi-mirror git clone & fallback ZIP download resilience for constrained network environments.
- Installs all system dependencies (`git`, `curl`, `python3`, `openssl`, `ufw`, `nginx`).
- Generates `.env` file with `PORT`, `FRONTEND_PORT`, and `BACKEND_PORT` definitions.
- Persistent database backup & auto-recovery (`/etc/nettopology-backup/network_data.json`).
- Builds and packages production Vite + TypeScript server assets.
- Creates and activates a self-healing Systemd daemon service (`nettopology.service`).
- Optional Nginx reverse proxy integration with automated 10-year TLS/SSL certificates and Cisco CLI WebSocket streaming support.
- Automatically configures UFW firewall rules for both frontend and backend ports.

### 2. Complete Uninstallation & Cleanup
To cleanly remove NetTopology while safeguarding database backups:
```bash
curl -sSL https://raw.githubusercontent.com/shahbazimasoud/NetTopology/master/uninstall-panel.sh | sudo bash
```

---

### 3. Manual Local Installation
```bash
# Clone the repository
git clone https://github.com/shahbazimasoud/NetTopology.git
cd NetTopology

# Run automated local setup:
sudo bash setup-panel.sh

# Or start manually:
npm install
npm run build
npm start
```
Open `http://localhost:3000` in your web browser.

---

## System Scripts
- `start.sh`: Launches server process in background
- `stop.sh`: Terminates active server instances
- `restart.sh`: Restarts server and reloads configuration
- `install.sh`: Performs environment setup and dependency installation

---

## AI Agent Instructions
Any AI assistant, coding agent, or human contributor working on this repository MUST follow the guidelines defined in `AGENTS.md`:
1. **README Maintenance:** Whenever new features, tools, endpoints, or UI capabilities are introduced, you **MUST** update `README.md` (both the Persian and English sections) to document the additions.
2. **Mandatory Semantic Versioning:** After every change, bugfix, or script update, you **MUST** increment the project version across `package.json`, `setup-panel.sh`, `install.sh`, `README.md`, and Git commit tags.
3. **Git Workflow:** Automatically commit all changes with descriptive commit messages and push to `origin master`.

### Release Notes & Bug Fixes
- **Version 1.1.0 (Web UI Display & Daemon Fix)**:
  - **Root Cause of Web UI Failure:** In previous versions, the bundled CommonJS output (`dist/server.cjs`) crashed at launch because `import.meta.url` evaluates to `undefined` in CommonJS, triggering `TypeError [ERR_INVALID_ARG_TYPE]`. Furthermore, the Python Cisco engine path was incorrectly queried in `dist/backend/server.py`.
  - **Applied Resolution:**
    - Replaced `import.meta.url` with a dual-mode environment detector (`projectRoot`) safe for both TSX (dev) and compiled CJS (production).
    - Fixed directory resolution for Python backend process spawning and static assets delivery.
    - Updated Nginx configuration to listen on both standard HTTP (Port 80) and HTTPS (Port 8443) with seamless Reverse Proxying.
    - Added automatic live HTTP health check verification (polling for HTTP 200 OK) at the end of installation.

---
*Maintained with ❤️ by Masoud Shahbazi*
