# NetTopology 🌐

[![Version](https://img.shields.io/badge/version-1.10.0-blue.svg)](https://github.com/shahbazimasoud/NetTopology)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/shahbazimasoud/NetTopology)
[![Node](https://img.shields.io/badge/node-20%2B%20%7C%2022%20LTS-brightgreen.svg)](https://nodejs.org)

سامانه جامع مدیریت، مانیتورینگ توپولوژی شبکه و مدیریت تجهیزات سیسکو (سویچ و روتر) - نسخه ۱.۱۰.۰
A Comprehensive Network Topology, Cisco Switch/Router Management & Visual Configuration Platform - Version 1.10.0

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
- **منوی راست‌کلیک پورت‌ها (Right-Click Context Menu):** کلیک راست روی هر پورت فیزیکی جهت نمایش منوی اختصاصی عملیات سوئیچ شامل خاموش/روشن کردن پورت (`shutdown` / `no shutdown`)، جابجایی سریع حالت `Trunk` و `Access`، فعال‌سازی پورت سکیوریتی و تنظیم مستقیم VLAN بدون نیاز به ورود به فرم‌های تو در تو.

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

### ۶. نقشه استقرار فیزیکی، درگ اند دراپ و سلسله‌مراتب ساختمان/طبقه/بخش/رک (Physical Placement & Hierarchy)
- **ساختار سلسله‌مراتبی کامل فیزیکی:** گروه‌بندی ساختاریافته تجهیزات در چهار سطح استاندارد: ساختمان (Building) > طبقه (Floor) > واحد/بخش (Unit/Room) > رک سرور (Server Rack).
- **کشیدن و رها کردن تعاملی (Drag & Drop):** جابجایی آسان و بصری هر سوئیچ و روتر بین طبقات، ساختمان‌های مختلف، واحدها یا رک‌های اختصاصی با درگ ان دراپ و بازخورد زنده‌ی دراپ‌زون.
- **مدیریت کامل و ویرایش/حذف (Full CRUD):** امکان افزودن ساختمان، طبقه، بخش/اتاق و رک، به همراه امکان ویرایش نام (Rename) و حذف (Delete) در تمامی سطوح سلسله‌مراتب فیزیکی.
- **جابجایی دستی (Manual Relocation Modal):** مودال جابجایی دقیق برای انتقال تجهیزات به مکان‌های دلخواه بدون نیاز به درگ.
- **پایش وضعیت اتصال:** نمایش وضعیت آنلاین/آفلاین بودن هر سوئیچ و روتر با پینگ و تله‌متری دوره‌ای.
- **فیلترهای پیشرفته:** جستجوی آنی بر اساس آی‌پی، نام سوئیچ، مدل و پورت‌های فعال.

### ۷. استایل مدرن و هماهنگ مودال‌ها در تم تاریک و روشن (Modal Harmonization & Light Theme Standards)
- تمامی پنجره‌های پاپ‌آپ و مودال‌های سیستم (استخراج کانفیگ زنده، اعمال تمپلیت، کلون‌گیری، ویرایشگر و ترمینال) از افکت شیشه‌ای بلور استاندارد (`.modal-backdrop-blur` با `data-modal-backdrop="true"`) بهره می‌برند.
- **اصلاح کامل تم روشن (Light Mode):** طراحی کادرهای مودال بر اساس استاندارد مودال کلون‌گیری با بدنه سفید خالص (`#ffffff`)، حاشیه‌های نرم اسلیت (`#e2e8f0`)، حذف گرادیانت‌های نامناسب آبی-بنفش، و سطوح خنثی و تمیز در سربرگ‌ها.
- **حل قطعی مشکل تکست‌باکس‌ها:** تمامی فیلدهای ورودی، سلکت‌باکس‌ها و متغیرها در تم روشن دارای پس‌زمینه سفید، متن تیره پرکنتراست (`#0f172a`) و کادرهای مشخص بوده و از هرگونه ناخوانایی متن سفید روی پس‌زمینه سفید یا خاکستری‌های تیره کدر جلوگیری شده است.
- خوانایی تضمین‌شده بلاک‌های کد و خروجی‌های ترمینال با پس‌زمینه تیره خوانا و کنتراست رنگی تفکیک‌شده در هر دو تم.

### ۸. استخراج هوشمند و تبدیل خودکار کانفیگ تجهیز زنده به الگو (Live Device Config Extraction & Auto-Parameterization)
- **دریافت مشخصات اتصال به صورت مستقیم:** پشتیبانی از ارتباط SSH v2 و Telnet با دریافت آدرس IP، پورت، یوزرنیم، پسورد ورود و پسورد Enable Secret سیسکو.
- **اتصال به تجهیزات ثبت‌شده یا هاست دلخواه:** امکان انتخاب فوری سوئیچ یا روتر از دیتابیس پنل با لود شدن خودکار پارامترها، یا اتصال به هر IP خارج از شبکه ثبت‌شده.
- **موتور پارامتریک‌سازی خودکار (Auto-Parameterization Engine):** جایگزینی خودکار مقادیر وابسته به تجهیز مانند Hostname با `{{DEVICE_NAME}}`، آدرس IP با `{{IP_ADDRESS}}`، ماسک با `{{SUBNET_MASK}}`، گیت‌وی با `{{DEFAULT_GATEWAY}}` و DNS با `{{DNS_SERVERS}}`.
- **پاکسازی امنیتی و ماسک کردن داده‌های حساس (Sanitize Secrets):** شناسایی و جایگزینی رمزهای عبور، رکوردهای Secret سیسکو، رشته‌های SNMP Community و هش‌ها با متغیرهای امنیتی جهت جلوگیری از نشت اطلاعات در زمان اشتراک‌گذاری الگو.
- **حذف داده‌های ناپایدار (Strip Ephemeral Data):** پاکسازی خطوط تاریخ/ساعت استخراج و کامنت‌های موقت برای دستیابی به یک تمپلیت کاملاً تکرارپذیر.
- **پشتیبانی تخصصی از میکروتیک و سیسکو:** استخراج با دستورات بهینه Cisco IOS (`show running-config`) و دستور فشرده میکروتیک (`/export compact`) برای خروجی گرفتن تمیز تنها از تغییرات کاربری.
- **پیش‌نمایش دو مرحله‌ای و تنظیم نام الگو:** بررسی سطر به سطر کانفیگ، لیست متغیرهای پویای کشف‌شده، امکان درج کلیکی تگ‌های متغیر، تعیین نام دلخواه تمپلیت و ذخیره در دیتابیس یا اعمال مستقیم بر روی تجهیز دیگر.

### ۹. تثبیت منوی دسترسی سایدبار راست هنگام اسکرول صفحات (Sticky Sidebar Navigation)
- **تثبیت کامل موقعیت سایدبار:** رفع جابجایی ناخواسته منوی ناوبری راست هنگام اسکرول صفحات طولانی (نظیر لیست بلند تجهیزات، ویجت‌های داشبورد، مدیریت پورت‌ها و کاتالوگ الگوها).
- **جداسازی کامل کانتینر اسکرول:** استفاده از ساختار کانتینر مستقل در `App.tsx` با کنترل سرریز و اسکرول داخلی (`overflow-y-auto`) در محدوده محتوا (`<main>`) و پین شدن سایدبار در ارتفاع کامل نما (`h-full sticky top-14`).
- **اسکرول‌بار اختصاصی و ظریف (`custom-scrollbar`):** اسکرول روان و مینی‌مال در منوی سایدبار برای نمایش بدون نقص در مانیتورها و تبلت‌های با ابعاد عمودی فشرده.
- **کنتراست استاندارد در تم لایت:** استایل‌دهی شفاف به آیتم‌های فعال و هاور سایدبار در تم روشن با رنگ‌بندی دقیق و خوانا.

### ۱۰. حالت تمام‌صفحه نقشه شماتیک توپولوژی (Fullscreen Topology Mode)
- **دکمه اختصاصی در بالا سمت چپ نقشه:** دکمه شناور با ترنزیشن نرم و افکت نورانی که در زمان هاور با برچسب «حالت فول» راهنمای کاربر است.
- **مخفی‌سازی کامل هدر اصلی، سایدبار و فوتر:** با فعال‌سازی حالت فول، تمامی عناصر محیط کاربری شامل هدر فوقانی نرم‌افزار (نام پورتال، دکمه داده‌های نمونه، پویش سریع، تم و...)، سایدبار دسترسی راست و فوتر وضعیت شبکه به‌طور کامل از DOM خارج و مخفی شده و نقشه ۱۰۰٪ مساحت صفحه نمایش را اشغال می‌کند.
- **طراحی بهینه و شناور راهنمای نقشه (Collapsible Floating Legend):** رفع کامل مشکل قرارگیری راهنما در زیر فوتر و انتقال آن به مختصات استاندارد و امن پایین سمت چپ (`bottom-5 left-5`) با قابلیت باز و بسته شدن هوشمند (Toggle / Collapse) جهت ایجاد دسترسی آسان بدون اشغال فضای ترسیم نودها.
- **پشتیبانی از کلید میانبر Esc:** امکان خروج آنی و روان از حالت تمام‌صفحه با فشردن کلید Escape یا کلیک مجدد روی دکمه.
- **مدیریت نوار ابزار در حالت فول:** دکمه سوئیچ سریع جهت مخفی‌سازی یا آشکارسازی نوار ابزار نقشه برای دستیابی به ۱۰۰٪ مساحت خالص نقشه شبکه.

### ۱۱. معماری انحصاری و امن Self-Signed SSL (Strict HTTPS Setup)
- **فعال‌سازی اختصاصی SSL با پورت دلخواه:** در پروسه نصب سروری، سامانه صرفاً بر روی پورت انتخابی شما با گواهی معتبر ۱۰ ساله Self-Signed SSL بر بستر امن HTTPS کانفیگ می‌شود.
- **حذف کامل پورت‌های ناامن HTTP:** پورت 80 و پورت‌های مستقیم وب و بک‌اند کاملاً از اینترنت و شبکه عمومی حذف شده و صرفاً بر روی لوپ‌بک داخلی سرور (`127.0.0.1`) بایند می‌شوند.
- **بازهدایت هوشمند خطای 497:** در صورت تلاش اشتباه برای باز کردن پورت امن با پروتکل `http://`، وب‌سرور Nginx به صورت خودکار درخواست را به `https://` بازهدایت می‌کند.
- **ایزوله‌سازی فایروال UFW:** مسدودسازی پورت‌های داخلی 3000 و 5001 و باز نگه‌داشتن صرف پورت امن SSL تعیین‌شده توسط ادمین.

### ۱۲. سیستم جامع چندزبانگی (i18n)، منوی آکاردئونی تاشو سایدبار و هماهنگ‌سازی دکمه‌ها
- **پیش‌فرض زبان انگلیسی (English Default) و زبان دوم فارسی (Persian):** پشتیبانی کامل دوزبانه در تمام صفحات، داشبورد، جداول، فیلترها، مودال‌ها، راهنماها و توابع با پایبندی به قانون عدم نمایش هرگونه متن فارسی در زمان فعال بودن زبان انگلیسی.
- **تغییر پویا و آنی چیدمان (LTR / RTL):** سوئیچر زبان هدر با تغییر بلادرنگ جهت چیدمان و هم‌ترازی المان‌ها و دکمه‌ها بدون نیاز به رفرش صفحه و ذخیره دائم در حافظه مرورگر.
- **منوی سایدبار آکاردئونی با والدهای مجزا (Accordion Sidebar):** دسته‌بندی و گروه‌بندی ساختاریافته منوها به صورت والدهای مشخص با آیکون تاشو، حالت پیش‌فرض باز، و رفتار جمع‌شدن سایر والدها با کلیک روی والد جدید.
- **یکپارچه‌سازی ابعاد دکمه‌ها:** هماهنگی کامل سایز، پدینگ و تایپوگرافی دکمه‌های اکشن در بالای صفحه مدیریت الگوها و تمپلیت‌ها با صفحه موجودی و مدیریت تجهیزات شبکه (`px-3.5 py-1.5 rounded-xl text-xs font-medium`).

### ۱۳. اصلاح ریسپانسیو مودال‌ها در صفحات کوچک و ترجمه کامل انگلیسی (Responsive Modals & Localization)
- **مقیاس‌پذیری دقیق در مانیتورها و لپ‌تاپ‌های کوچک:** حل ریشه‌ای مشکل بیرون زدن مودال‌ها از صفحه با محدودیت هوشمند ارتفاع (`max-h-[92vh] sm:max-h-[90vh]`) و تفکیک اسکرول عمودی داخلی برای محتوا.
- **ترجمه ۱۰۰٪ انگلیسی در تمام مودال‌ها:** حذف کامل تمام متون و عبارات فارسی هاردکد شده در مودال‌های «ثبت تجهیز جدید»، «کلون‌گیری تمپلیت»، «اعمال تعاملی تمپلیت»، «بازرسی پورت»، «استخراج زنده کانفیگ»، «ترمینال سیسکو» و «تاریخچه نسخه‌ها» در زمان انتخاب زبان انگلیسی.
- **تثبیت هدر و فوتر عملیاتی (Pinned Header & Footer):** سربرگ و دکمه‌های تایید/لغو در فوتر مودال‌ها همواره ثابت و در دسترس کاربر باقی می‌مانند بدون آنکه به زیر صفحه یا خارج از کادر بروند.

### ۱۴. خلوت‌سازی هدر، افزودن منوی دراپ‌داون پروفایل و سازگاری کامل تم‌ها در پورت‌ها و اسکنر CDP/LLDP
- **منوی اختصاصی پروفایل در هدر (Profile Dropdown Menu):** تجمیع و انتقال تنظیمات تیم و سازمان، سوئیچر زبان به همراه اطلاعات کاربری درون یک منوی دراپ‌داون شیک و بازشونده در گوشه هدر.
- **خلوت‌سازی و مینیمال کردن هدر (Header Decluttering):** حذف نشانگرهای شلوغ تعداد تجهیزات آنلاین و کریتیکال جهت ارائه نمایی خلوت، خلوت‌تر شدن نوار بالایی و تمرکز بر ابزارهای اصلی.
- **کوچک‌سازی بج نسخه (Compact Version Badge):** کاهش چشمگیر ابعاد برچسب نسخه در هدر به یک برچسب ظریف و مینی‌مال.
- **سازگاری کامل رنگی صفحه مدیریت پورت‌ها (Port Management Theme Harmony):** بازطراحی و رفع کامل استایل‌های سفید استاتیک (`bg-white` و `border-slate-200`) در صفحه پورت‌ها و هماهنگ‌سازی پوسته سخت‌افزاری فیس‌پلیت، فرم ویرایش و جدول پورت‌ها با تمامی تم‌های نرم‌افزار (Obsidian, Emerald, Cobalt, Rose, Amber, Light).
- **سازگاری تم در اسکنر لایه ۲ همسایگی CDP/LLDP:** استایل‌دهی مدرن شیشه‌ای `spatial-glass` برای کارت‌های آمار، راهنمای پروتکل و جدول همسایگان.

### ۱۵. تست و عیب‌یابی سوئیچ‌های شبکه محلی در لینوکس (Linux Local Switch Testing & Live Diagnostics)
- **پایش واقعی شبکه محلی روی سیستم لینوکس:** با نصب روی سیستم عامل یا سرور لینوکس متصل به سوئیچ‌های شبکه محلی (LAN/VLAN)، سیستم از طریق ابزارهای واقعی ICMP ping و سوکت‌های سیستمی TCP، تجهیزات سخت‌افزاری واقعی را مورد ارزیابی قرار می‌دهد.
- **مودال جامع عیب‌یابی و پایش پورت‌ها (TestConnectionModal):** پنجره اختصاصی جهت تست بلادرنگ پینگ، محاسبه دقیق زمان تأخیر رفت‌وبرگشت پکت (Latency برحسب ms)، بررسی باز بودن پورت SSH (22)، پورت Telnet (23) و وب مدیریتی (HTTP/HTTPS) و دریافت بنر نرم‌افزاری سوئیچ.
- **تست بلادرنگ IP قبل از ثبت تجهیز (AddDeviceModal):** دکمه اختصاصی «تست اتصال آی‌پی» در فرم ثبت سوئیچ جدید برای اطمینان از در دسترس بودن و باز بودن پورت ۲۲ یا پینگ تجهیز قبل از ثبت در موجودی.
- **ترمینال سیسکو با پینگ زنده:** اجرای دستور `ping <IP>` در کنسول ترمینال شبیه‌ساز سیسکو به صورت زنده پاکت‌های ICMP واقعی لینوکس را ارسال کرده و نتایج را در قالب استاندارد Cisco IOS نمایش می‌دهد.

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
- **نسخه ۱.۷.۰ (v1.7.0 - تاییدیه هوشمند دستورات سیسکو سویچ/روتر، مودال تخصیص ویلن، رنگ‌بندی وضعیت پورت‌ها و هدایت پورت سکیوریتی)**:
  - **مودال تایید تعاملی بله/خیر (Cisco Command Confirmation Modal):** اضافه شدن مودال تایید با تولید و نمایش بلادرنگ دستورات دقیق Cisco IOS متناسب با نوع تجهیز (Switch یا Router) برای تمامی اکشن‌های تغییر وضعیت پورت (`shutdown` / `no shutdown`، تغییر مد `trunk` / `access` و غیرفعال‌سازی `port-security`).
  - **مودال اختصاصی تخصیص ویلن دسترسی (Assign Access VLAN Modal):** باز شدن پنجره مستقل با نمایش لیست ویلن‌های موجود تجهیز در بالای کادر همراه با فیلد جستجو و کادر ورودی شماره دلخواه VLAN جهت تغییر امن پورت به مد Access و تخصیص VLAN با پیش‌نمایش کامند.
  - **هدایت هوشمند فعال‌سازی Port Security:** انتخاب «فعال‌سازی پورت سکیوریتی» از منوی راست‌کلیک پورت، مستقیماً پنجره را به بخش ویرایش پورت هدایت کرده و تیک پورت سکیوریتی را به صورت خودکار فعال می‌کند تا مدیر شبکه پارامترهای مک‌آدرس و Violation را مطابق نیاز شخصی‌سازی کند.
  - **رنگ‌بندی بصری وضعیت پورت‌ها در Switch Faceplate:** رنگ پس‌زمینه پورت‌های خاموش به قرمز ملایم و پورت‌های غیرفعال/قطع به نارنجی ملایم تغییر یافته تا خطای فیزیکی در یک نگاه قابل تشخیص باشد.
  - **کنتراست بالای بج‌های VLAN:** ارتقای بج‌های شماره ویلن (v1, v10, ...) با متن سفید پررنگ (Bold White) بر روی پس‌زمینه بنفش در تمام صفحات و مودال‌ها.

- **نسخه ۱.۶.۱ (v1.6.1 - منوی راست‌کلیک پورت‌های فیس‌پلیت، رفع مشکل دراپ‌داون اینترفیس‌های ترمینال و کنتراست بالای لیبل‌ها در تم روشن)**:
  - **منوی راست‌کلیک پورت‌های سوئیچ (Cisco Port Context Menu):** افزودن قابلیت راست‌کلیک روی پورت‌های فیزیکی سوئیچ در فیس‌پلیت جهت اعمال دستورات shutdown / no shutdown، تغییر حالت Trunk/Access، فعال‌سازی پورت سکیوریتی و تنظیم سریع شماره VLAN.
  - **رفع مشکل خروج لیست اینترفیس‌های ترمینال از کادر:** اصلاح موقعیت‌دهی، محدودسازی ارتفاع، اسکرول روان و بسته‌شدن هوشمند با کلیک در بیرون کادر.
  - **اصلاح کنتراست تگ‌های Trunk و Access:** تغییر استایل برچسب‌های ترانک و اکسس در تم روشن به متن سفید کاملاً بولد و خوانا بر روی پس‌زمینه بنفش و نیلی پررنگ.
  - **اصلاح رنگ بنر لاگین ترمینال در تم روشن:** تغییر رنگ پیام‌های User Access Verification، نام کاربری و رمز عبور و کادر ستاره‌ها در تم روشن به خاکستری تیره استاندارد و باکنتراست.
  - **کنتراست بالای کادر Layer 2 Security:** تثبیت جهانی متن مشکی و فونت بولد برای برچسب لایه ۲ در تمامی تم‌ها.

- **نسخه ۱.۶.۰ (v1.6.0 - مدیریت سلسله‌مراتبی پیشرفته استقرار فیزیکی ساختمان > طبقه > بخش > رک با درگ اند دراپ و پورت سفارشی بک‌اند)**:
  - **ساختار سلسله‌مراتبی کامل فیزیکی:** پیاده‌سازی سطوح ساختمانی، طبقات، بخش‌ها/اتاق‌ها و رک‌های سرور.
  - **پشتیبانی درگ اند دراپ بین تمامی سطوح:** جابجایی بصری تجهیزات بین ساختمان‌ها، طبقات، بخش‌ها و رک‌ها با بازخورد زنده.
  - **مدیریت کامل (CRUD):** قابلیت ایجاد، ویرایش نام (Rename) و حذف (Delete) در تمامی سطوح سلسله‌مراتب فیزیکی.
  - **پورت سفارشی بک‌اند در نصب خودکار:** امکان وارد کردن پورت سفارشی برای پنل در `install.sh` و `setup-panel.sh`.

- **نسخه ۱.۵.۰ (v1.5.0 - قابلیت کشیدن و رها کردن تجهیزات بین طبقات و ساختمان‌ها در نقشه استقرار فیزیکی)**:
  - **قابلیت درگ اند دراپ (Drag & Drop):** پشتیبانی کامل از کشیدن و رها کردن تعاملی تجهیزات شبکه بین طبقات مختلف یک ساختمان و یا انتقال به ساختمان‌های دیگر در نمای شماتیک فیزیکی (`Physical Placement`).
  - **به‌روزرسانی آنی و زنده (Optimistic UI):** جابجایی بلافاصله در رابط کاربری منعکس شده و درخواست ویرایش مشخصات فیزیکی به اندپوینت `PUT /api/devices/:id` ارسال می‌شود؛ در صورت بروز خطا وضعیت به طور خودکار بازگردانی (Rollback) می‌شود.
  - **تعریف پویا ساختمان و طبقه جدید:** افزودن دکمه‌های «افزودن ساختمان» و «افزودن طبقه» با مودال‌های مدرن و استایل هماهنگ شیشه‌ای `spatial-glass` جهت ساخت فضاهای فیزیکی جدید و رها کردن تجهیزات در آن‌ها.
  - **جابجایی دستی (Manual Relocate Modal):** امکان انتخاب ساختمان و طبقه مقصد به صورت دستی از طریق فرم انتخابی با پشتیبانی از تعریف نام سفارشی بدون نیاز به ژست درگ.
  - **نواحی هدف هوشمند (Drop Zones):** انیمیشن‌های هایلایت فیروزه‌ای، نشانگر متحرک، پیام‌های وضعیت و بازخورد زنده.

- **نسخه ۱.۴.۴ (v1.4.4 - سازگاری کامل مودال بازرسی پورت با تمامی تم‌ها و خلوت‌سازی نوار کناری و پروفایل)**:
  - **سازگاری ۱۰۰٪ تم در مودال بازرسی پورت (Port Inspector Modal):** اصلاح کلیه بخش‌های مودال شامل جدول پورت‌ها، فیلترها، فرم ویرایش و پنجره تایید نهایی تغییرات (Confirmation Summary) با کلاس‌های شیشه‌ای و تم‌پذیر `spatial-glass` بدون پس‌زمینه سفید ثابت.
  - **خلوت‌سازی سایدبار:** حذف باکس هشدار قطعی تجهیزات (Outage Alert) و شماره نسخه از پاورقی سایدبار ناوبری.
  - **مینیمال‌سازی نشانگر نشست فعال:** تبدیل برچسب شلوغ Active Session در منوی پروفایل به یک نقطه پالس‌زننده ظریف.

- **نسخه ۱.۴.۳ (v1.4.3 - خلوت‌سازی هدر، منوی پروفایل و سازگاری کامل تم‌ها در پورت‌ها و CDP/LLDP)**:
  - **منوی اختصاصی پروفایل:** انتقال گزینه‌های تیم/سازمان و سوئیچر زبان به منوی پاپ‌آپ جدید پروفایل.
  - **مینیمال کردن هدر:** حذف تگ‌های شمارنده آنلاین و کریتیکال و کوچک‌سازی چشمگیر نمایشگر نسخه در هدر.
  - **سازگاری کامل تم در صفحه مدیریت پورت‌ها:** اصلاح تمامی بک‌گراندها و بردرهای سفید هاردکد شده به کلاس‌های پویا و شیشه‌ای `spatial-glass` سازگار با کلیه تم‌ها (Obsidian, Emerald, Cobalt, Rose, Amber, Light).
  - **سازگاری تم در اسکنر لایه ۲ CDP/LLDP:** هماهنگ‌سازی جدول، کارت‌ها و راهنماها با تم انتخابی کاربر.

- **نسخه ۱.۴.۲ (v1.4.2 - فاوآیکون شبکه و بومی‌سازی کامل انگلیسی صفحات توپولوژی، پورت‌ها، اسکنر و قالب‌ها)**:
  - **طراحی فاوآیکون جدید:** ایجاد آیکون مدرن شبکه بر پایه وکتور SVG شامل نودهای شبکه و سوئیچ متمرکز.
  - **بومی‌سازی کامل صفحه نقشه توپولوژی:** رفع کلمات فارسی مانند «پورت»، راهنمای نقشه، هدر، سرچ‌باکس و دراور مشخصات تجهیز در حالت انگلیسی.
  - **مودال ویرایش قالب‌های پیکربندی:** انگلیسی‌سازی فیلدهای برچسب نمایش (Display Label) و پلیس‌هولدرها در مودال Edit Configuration Template.
  - **مدیریت و پایش پورت‌ها:** ترجمه کامل چیدمان فیزیکی پورت‌ها (Faceplate)، کنترل‌ها و جدول پورت‌ها.
  - **اسکنر لایه ۲ CDP/LLDP:** ترجمه ۱۰۰٪ کارت‌های آماری، جداول همسایگی و پیام‌های اسکن.

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
- **Right-Click Port Context Menu (`CiscoPortContextMenu`):** Right-click any physical port on the Switch Faceplate for instant operational control: shutdown/no-shutdown, switch between Trunk and Access mode, enable Port Security, or assign VLAN directly without nested menus.

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

### 6. Physical Placement Topology, Drag & Drop & Multi-Level Hierarchy
- **Comprehensive Physical Hierarchy:** Full 4-tier structural grouping: Building > Floor > Unit/Section > Server Rack.
- **Interactive Drag & Drop:** Intuitive drag-and-drop mechanics to move any switch or router across floors, into custom buildings, or into specific units and server racks with animated drop-zone guidance.
- **Full Hierarchy Management (CRUD):** Add, rename, and delete buildings, floors, units/sections, and racks directly from the UI with cascading device handling.
- **Manual Relocation Modal:** Accessible alternative allowing precision assignment of building, floor, unit, and rack without drag gestures.
- **Real-Time Health Monitoring:** Visual indicators for device reachability, uptime, and firmware versions.
- **Fast Search & Filtering:** Filter devices by IP, model, location, or active port status.

### 7. Modal Styling Standards & Light Theme Harmonization
- Universal backdrop blur (`.modal-backdrop-blur` with `data-modal-backdrop="true"`) ensures focused user attention without background interference.
- **Light Mode Harmonization:** Modals (Live Config Extraction, Apply Template, Clone Template, etc.) are styled in accordance with the Clone Template modal archetype, featuring crisp white containers (`#ffffff`), subtle borders (`#e2e8f0`), and soft natural shadows.
- **Elimination of Blue-Purple Gradients & Dull Gray Surfaces:** Replaced heavy saturated gradients with clean neutral header styling.
- **Input Contrast Resolution:** All text fields, textareas, and select inputs in light mode provide pure white backgrounds, dark slate typography (`#0f172a`), and defined border lines, completely preventing white-on-white text clipping or washed-out controls.
- **Terminal Readability:** Code viewers and interactive terminal streams maintain dedicated dark high-contrast backgrounds with emerald/cyan syntax coloring in all modes.

### 8. Live Device Config Extraction & Auto-Parameterization Engine
- **Direct Appliance Connection:** Connects over SSH v2 or Telnet using custom or registered credentials (IP, Port, Username, Password, and Cisco Enable Secret).
- **Network Database & Custom Target Selection:** Choose directly from existing switches and routers in the network database or target any external appliance IP.
- **Auto-Parameterization Engine:** Automatically converts machine-specific values into dynamic variables (e.g., Hostname to `{{DEVICE_NAME}}`, IP to `{{IP_ADDRESS}}`, Subnet to `{{SUBNET_MASK}}`, Gateway to `{{DEFAULT_GATEWAY}}`, and DNS servers).
- **Security Sanitization:** Masks raw passwords, Cisco enable secrets, SNMP community strings, and hashes with safe template tokens to prevent accidental data leaks during template sharing.
- **Ephemeral Cleanup:** Strips volatile timestamps and session comments to ensure clean, reproducible templates.
- **MikroTik & Cisco Native Optimization:** Utilizes `/export compact` for RouterOS appliances and `show running-config` for Cisco IOS/IOS-XE.
- **Two-Phase Review & Save Flow:** Review raw vs. parameterized outputs, edit detected variable definitions, click to insert variable tokens into the editor, and save to the templates library with one-click deployment options.

### 9. Sticky Right Sidebar Navigation & Decoupled Viewport Scrolling
- **Complete Sticky Fixation:** Permanently anchors the right navigation sidebar while users scroll through long page contents (such as large device inventory tables, extended dashboard metrics, port inspectors, and template catalogs).
- **Decoupled Scroll Architecture:** Re-architected viewport scrolling inside `App.tsx` by isolating vertical scroll (`overflow-y-auto`) exclusively to the main content container (`<main>`) while pinning the sidebar at full view height (`h-full sticky top-14`).
- **Sleek Custom Scrollbar (`custom-scrollbar`):** Provides a minimal, non-intrusive scrollbar for the sidebar navigation items to fit seamlessly across smaller laptop and tablet viewports.
- **Light Theme High-Contrast Consistency:** Ensures crystal-clear selection, hover, and active states for sidebar navigation buttons in light mode.

### 10. Fullscreen Schematic Topology Mode
- **Dedicated Top-Left Floating Control:** Instant fullscreen toggle positioned at the top-left of the topology canvas with hover tooltip indication ("حالت فول" / Full Mode).
- **Total Header, Sidebar & Footer Concealment:** Completely removes all application chrome from the DOM—including the top header navbar (portal name, sample data button, quick scan, theme controls), sidebar navigation, and bottom status footer—allocating 100% of the viewport strictly to the interactive SVG network canvas.
- **Collapsible Floating Topology Legend:** Solves the footer overlap issue by anchoring the interactive legend in a safe, modern glassmorphism floating card at `bottom-5 left-5` with smart collapse/expand controls, ensuring zero obstruction of network nodes and ports.
- **Escape Key & Native Fullscreen Sync:** Exit seamlessly at any time with the `Esc` keyboard shortcut or via the top-left toggle button.
- **In-Canvas Toolbar Toggle:** Allows toggling the internal filter/search bar on or off in full mode for an uninterrupted, edge-to-edge network map experience.

### 11. Strict Self-Signed SSL Architecture (HTTPS-Only Installation)
- **User-Defined SSL Port Enforcement:** Setup scripts exclusively deploy the application under TLS/HTTPS with a 10-year self-signed certificate on the administrator's chosen port.
- **Complete Elimination of Unencrypted HTTP:** Port 80 and raw frontend/backend ports are eradicated from public exposure.
- **Loopback Isolation:** Node.js frontend and Python backend engines are bound strictly to internal loopback (`127.0.0.1`), terminating all incoming client connections via Nginx SSL reverse proxy.
- **Automated 497 Redirect Handling:** Standard HTTP requests mistakenly sent to the SSL port automatically redirect to secure HTTPS without browser error.
- **Firewall Hardening:** UFW firewall rules permit only the designated SSL port, blocking direct access to ports 3000 and 5001.

### 12. Full Multi-Language (i18n) Engine, Accordion Sidebar Navigation & Button Harmonization
- **English Default with Complete Persian Support:** End-to-end internationalization across all views, modals, notifications, tables, and device toolbars with strict zero-Persian enforcement when English mode is active.
- **Dynamic LTR / RTL Directionality:** Live direction toggling via the navbar language switcher with instant visual alignment and local storage persistence.
- **Collapsible Accordion Sidebar Navigation:** Parent categories with distinct interactive labels, collapsible chevron toggles, default open initial state, and single-expanded accordion logic.
- **Action Button Sizing Harmonization:** Action buttons in Template Management and all page headers adhere strictly to the unified sizing standard established by the Device Management view (`px-3.5 py-1.5 rounded-xl text-xs font-medium`).

### 13. Modal Responsive Viewport Scaling & Complete English Localization
- **Adaptive Small Screen & Laptop Scaling:** Eliminated viewport overflow on smaller displays using dynamic height clamping (`max-h-[92vh] sm:max-h-[90vh]`) combined with dedicated vertical inner content scrolling.
- **Complete English Translation in Modals:** 100% elimination of hardcoded Persian phrases in English mode across all modal windows (Add Device, Clone Template, Apply Template, Port Inspector, Live Config Capture, Terminal, and Release Notes).
- **Pinned Headers & Action Footers:** Form titles, close buttons, and primary action buttons (Save, Apply, Cancel) stay permanently anchored within view, preventing controls from sliding off-screen.

### 14. Header Decluttering, Profile Dropdown & Full Theme Harmony in Port Management and CDP/LLDP
- **Consolidated Profile Dropdown Menu:** Grouped team/organization identity and language switcher into a unified, elegant profile dropdown at the top navigation bar.
- **Decluttered Top Header:** Removed congested online and critical device count tags to maintain a clean, distraction-free header.
- **Ultra-Compact Version Badge:** Scaled down the version display tag to a discreet, minimalist pill.
- **Full Theme Adaptation for Port Management View:** Replaced static white backgrounds and borders with adaptive `spatial-glass` classes, ensuring 100% color harmony across Obsidian, Emerald, Cobalt, Rose, Amber, and Light themes for the switch faceplate, inspector, and ports data table.
- **Full Theme Adaptation for CDP/LLDP Discovery Scanner:** All metric cards, scan logs, neighbor tables, and protocol guidelines dynamically adapt to whichever theme palette is selected.

### 15. Linux Local Switch Testing, Live ICMP Diagnostics & Management Port Probing
- **Real-World Host Telemetry on Linux:** When installed on a Linux host connected to physical network switches in your local network (LAN/VLAN), NetTopology runs native Linux ICMP ping and socket checks directly against physical hardware switches.
- **Dedicated Diagnostic Modal (TestConnectionModal):** Real-time connectivity tester evaluating ICMP echo ping, round-trip packet latency in milliseconds, SSH (port 22), Telnet (port 23), Web UI (80/443), and device software banner inspection with one-click access to the Cisco CLI Terminal or Port Inspector.
- **Pre-Registration Live IP Verification (AddDeviceModal):** Built-in "Test Connection" trigger in the new device creation form to validate IP reachability and verify port status before committing to the inventory.
- **Cisco CLI Terminal with Live ICMP:** Terminal `ping <IP>` command executes authentic background ICMP echo requests on the Linux host and renders the output in Cisco IOS format.

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
- **Version 1.7.0 (Cisco Switch/Router Command Confirmation, Assign Access VLAN Modal, Port State Visuals & Port Security Navigation)**:
  - **Interactive Cisco CLI Command Confirmation Modal (`CiscoCommandConfirmModal`):** Dual-step Yes/No confirmation dialog providing real-time preview of exact Cisco IOS CLI commands dynamically tailored to device type (Switch vs. Router) for port shutdown, no shutdown, trunk/access mode switches, and port security deactivation.
  - **Dedicated Assign Access VLAN Modal (`AssignVlanModal`):** Standalone modal presenting the device's currently configured VLANs with search filtering, manual VLAN ID input, and auto-generated Cisco CLI configuration preview.
  - **Port Security Right-Click Direct Navigation:** Selecting "Enable Port Security" directly shifts the inspector modal into editing mode, turns on the port security toggle, and smooth-scrolls to the security parameters for custom configuration.
  - **Visual Port State Coloring on Switch Faceplate:** Physical port background dynamically tints soft red for shutdown ports and soft amber for disabled/down ports, making physical and administrative statuses immediately clear.
  - **High-Contrast Bold White Text on Purple VLAN Badges:** Optimized VLAN badges across faceplate ports and inventory tables with crisp bold white text over rich purple backgrounds.

- **Version 1.6.1 (Cisco Switch Port Right-Click Context Menu, Terminal Interface Dropdown Fix & High-Contrast Light Theme Badges)**:
  - **Cisco Switch Port Right-Click Context Menu (`CiscoPortContextMenu`):** Added intuitive right-click action menu on physical ports in the Switch Faceplate for immediate shutdown/no shutdown toggles, Trunk vs. Access switching, Layer-2 Port Security activation, and quick VLAN configuration.
  - **Fixed Terminal Interface Dropdown Overflow:** Corrected dropdown boundaries, maximum height, smooth scrolling, and click-outside closing mechanism in `CiscoTerminalModal`.
  - **High-Contrast Trunk & Access Badges in Light Theme:** Restyled port mode badges to use crisp white bold typography on vibrant purple and indigo backgrounds, completely eliminating low-contrast text.
  - **Dark Gray Login Banner in Light Terminal:** Updated User Access Verification, username/password prompts, and asterisk separator lines to dark slate/gray in light mode for effortless readability.
  - **Global Bold Black Text for Layer 2 Security:** Standardized the Cisco Port Security header badge with bold black typography across all themes.

- **Version 1.6.0 (Advanced Hierarchical Physical Placement: Building > Floor > Unit > Rack with Drag & Drop & Custom Backend Port)**:
  - **Hierarchical Physical Structure:** Structured network device layout across Building > Floor > Unit/Room > Server Rack levels.
  - **Multi-Level Drag & Drop:** Move devices interactively across buildings, floors, rooms, and racks with live visual drop feedback.
  - **Full Hierarchy CRUD:** Create, rename, and delete buildings, floors, units, and server racks.
  - **Configurable Backend Port:** Added interactive port prompt with fallback defaults in `install.sh` and `setup-panel.sh`.

- **Version 1.5.0 (Drag & Drop Physical Device Placement Across Buildings & Floors)**:
  - **Interactive Drag & Drop:** Full HTML5 drag-and-drop mechanics enabling network operators to move switches, routers, and access points freely across floors within the same building or relocate them to different buildings in the Physical Placement view.
  - **Optimistic UI with Real-time Backend Sync:** Instant DOM updates with immediate API calls to `PUT /api/devices/:id` (`building`, `floor`) and automatic graceful rollback if the backend request fails.
  - **Dynamic Floor & Building Creation:** Added "Add Building" and "Add Floor" capabilities with clean, modern glassmorphic modals so users can define new physical environments on the fly.
  - **Manual Relocate Modal:** Accessible manual relocation modal with dropdown selectors and custom name inputs for precise location changes without drag interactions.
  - **Drop Zones & Visual Feedback:** Vivid cyan-glowing drop targets, grip drag handles, live moving toast notifications, and empty-floor drop targets.

- **Version 1.4.4 (Port Inspector Modal Theme Harmonization & UI Decluttering)**:
  - **Full Theme Harmonization in Port Inspector Modal:** Redesigned all modal surfaces including switch ports table, filter bar, port configuration form, and confirmation summary dialog to dynamically adapt to all themes (Obsidian, Emerald, Cobalt, Rose, Amber, and Light).
  - **Sidebar Decluttering:** Removed Outage Alert badge and version number from the navigation sidebar.
  - **Profile Session Indicator:** Minimized Active Session badge to a discreet, pulsing emerald dot.

- **Version 1.4.3 (Header Decluttering, Profile Dropdown & Theme Harmonization)**:
  - **Dedicated Profile Dropdown:** Integrated Team/Organization settings and Language switcher into an intuitive user profile menu in the header.
  - **Header Decluttering:** Removed busy online/critical device counts from the top navbar and minimized the version display tag.
  - **Full Theme Harmonization in Port Management:** Refactored `PortManagementView` to completely eliminate hardcoded white boxes, adapting switch faceplate, details card, and ports table to all themes.
  - **Full Theme Harmonization in CDP/LLDP Scanner:** Refactored `CdpLldpScannerView` to dynamically blend with Obsidian, Emerald, Cobalt, Rose, Amber, and Light palettes.

- **Version 1.4.2 (Network Favicon & Complete i18n Localization)**:
  - **New Vector Network Favicon:** Designed and integrated a professional SVG network topology favicon in `index.html`.
  - **Complete English Localization for Schematic Topology:** Removed hardcoded Persian terms (such as "پورت"), fully localized legends, headers, search inputs, node cards, and device details drawer.
  - **Template Editor Modal Localization:** Converted Display Labels, placeholder strings, and guidance text in the Edit Configuration Template modal to use i18n.
  - **Port Management & Faceplate Localization:** Fully localized switch faceplate layout, port edit form, status badges, and table columns.
  - **CDP/LLDP Discovery Scanner Localization:** Complete localization for scan metrics, status alerts, neighbor tables, and protocol documentation.

- **Version 1.1.0 (Web UI Display & Daemon Fix)**:
  - **Root Cause of Web UI Failure:** In previous versions, the bundled CommonJS output (`dist/server.cjs`) crashed at launch because `import.meta.url` evaluates to `undefined` in CommonJS, triggering `TypeError [ERR_INVALID_ARG_TYPE]`. Furthermore, the Python Cisco engine path was incorrectly queried in `dist/backend/server.py`.
  - **Applied Resolution:**
    - Replaced `import.meta.url` with a dual-mode environment detector (`projectRoot`) safe for both TSX (dev) and compiled CJS (production).
    - Fixed directory resolution for Python backend process spawning and static assets delivery.
    - Updated Nginx configuration to listen on both standard HTTP (Port 80) and HTTPS (Port 8443) with seamless Reverse Proxying.
    - Added automatic live HTTP health check verification (polling for HTTP 200 OK) at the end of installation.

---
*Maintained with ❤️ by Masoud Shahbazi*
