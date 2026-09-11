export type VersionType = 'major' | 'minor' | 'patch';

export interface ReleaseNote {
  version: string;
  releaseDate: string;
  type: VersionType;
  title: string;
  title_en?: string;
  changes: string[];
  changes_en?: string[];
}

export const APP_VERSION = '1.20.0';

export const RELEASE_HISTORY: ReleaseNote[] = [
  {
    version: '1.20.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'دوگانگی نمای کارت و سخت‌افزار فیزیکی (Card/Physical Mode)، نصب مستقیم تجهیزات در رک و یادداشت‌های استیکی چسبان (Sticky Notes) با قابلیت اتصال به دیوایس‌ها',
    title_en: 'Dual Device Canvas Modes (Card/Physical), Direct Rackmount from Canvas, & Interactive Connected Sticky Notes with Global Hide/Show',
    changes: [
      'پیاده‌سازی دو حالت نمایش متمایز برای هر دیوایس روی نقشه: نمای کارتی (Card Mode) جهت طراحی شماتیک کابل‌کشی و مشخص کردن پورت‌ها، و نمای فیزیکی (Physical Hardware Mode) با رندر واقع‌گرایانه شاسی سرور/سوئیچ جهت استقرار در رک.',
      'افزودن امکان تغییر آسان بین نمای کارتی و نمای فیزیکی به صورت سراسری از نوار ابزار و همچنین به ازای هر تجهیز به صورت جداگانه از روی هدر کارت.',
      'امکان نصب مستقیم تجهیزات فیزیکی از روی بوم نقشه به درون رک‌های دلخواه (Mount to Rack) همراه با مدیریت برخورد و پیش‌گیری از تداخل یونیت‌ها.',
      'پیاده‌سازی سیستم یادداشت‌های چسبان تعاملی (Sticky Notes): قابلیت جابه‌جایی آزاد روی نقشه با درگ، ویرایش عنوان و متن، انتخاب تم رنگی (زرد، آبی، سبز، سرخ، بنفش، کهربایی)، و تاریخ ثبت.',
      'قابلیت اتصال خطی یادداشت به هر دیوایس مشخص با خط‌چین هدایتگر تعاملی زرد/فیروزه‌ای و دکمه فوکوس دوربین روی تجهیز متصل شده.',
      'افزودن چک‌باکس پنهان/نمایان‌سازی سراسری کلیه استیکی نوت‌ها در نوار ابزار بالا جهت خلوت نگه‌داشتن صفحه در مواقع لزوم.',
      'اصلاح و بومی‌سازی دو دکمه «افزودن رک» و «نصب سخت‌افزار» در زبان انگلیسی به «Add Rack» و «Install Hardware» به همراه ترجمه صحیح تول‌تیپ‌ها.'
    ],
    changes_en: [
      'Engineered dual visual modes for canvas devices: Card Mode (optimized for port-to-port cable drawing and link management) and Physical Mode (photorealistic enterprise chassis representation for rack elevation).',
      'Added seamless switching between Card and Physical views both globally via the toolbar and per-device via the device card header action button.',
      'Enabled direct mounting of canvas physical devices into target racks with slot collision checking and unit allocation.',
      'Created interactive draggable Sticky Notes: full free-form placement, rich text/markdown notes, timestamping, and 6 vibrant color themes (Yellow, Blue, Green, Rose, Purple, Amber).',
      'Implemented dynamic device linking for sticky notes with vector dashed callout lines and single-click camera focus on linked nodes.',
      'Added a global Hide/Show Notes toggle checkbox directly in the top custom map toolbar.',
      'Fixed language localization for "Add Rack" and "Install Hardware" buttons and their comprehensive tooltips in English view.'
    ]
  },
  {
    version: '1.19.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'جابه‌جایی درگ‌وان‌دراپ تجهیزات در رک، پیشگیری از تداخل یونیت‌ها (Collision Detection)، ویرایش مشخصات و بومی‌سازی دو زبانه (FA/EN)',
    title_en: 'In-Rack Drag & Drop Hardware Relocation, Unit Collision Prevention, Full Device Spec Editing, & Dual Language i18n Localization',
    changes: [
      'پیاده‌سازی قابلیت جابه‌جایی درگ و دراپ (Drag & Drop) تجهیزات سخت‌افزاری درون رک با فیدبک بصری بلادرنگ (Ghost Preview)، هدایتگر وضعیت و دکمه‌های گام‌به‌گام بالا و پایین بردن تجهیز.',
      'پیاده‌سازی مکانیزم هوشمند جلوگیری از تداخل فیزیکی در یونیت‌های رک (Slot Collision Detection): عدم امکان نشستن دو تجهیز روی یک یونیت، نمایش پیام هشدار تداخل به همراه دکمه هوشمند یافتن خودکار اولین یونیت آزاد (Find Free Slot).',
      'افزودن امکان ویرایش کامل مشخصات سخت‌افزارها و پیکربندی مجدد کارت‌های شبکه و پورت‌ها هم از روی رک و هم داخل استودیو بازرسی رک.',
      'بومی‌سازی و چندزبانگی کامل (i18n): تطبیق خودکار تمام منوها، مودال‌ها، دکمه‌ها، عنوان‌ها و ابزارها مطابق زبان فعال سیستم (فارسی و انگلیسی).',
      'ارتقای واقع‌گرایی المان‌های SVG تجهیزات با شبیه‌سازی دقیق فیس‌پلیت‌های سازمانی، ماژول‌های ذخیره‌ساز، پنل‌های ال‌ای‌دی، پورت‌های شبکه و فن‌های پشتی.'
    ],
    changes_en: [
      'Implemented fluid in-rack drag-and-drop hardware relocation with real-time ghost previews, slot snapping, and single-click move up/down controls.',
      'Engineered intelligent rack slot collision detection preventing hardware overlap, rendering clear collision alerts and a "Find Free Slot" auto-locator.',
      'Added full hardware specifications and network card/port editing capabilities directly from rack cards and within the Rack Elevation Studio.',
      'Comprehensive dual-language localization (i18n): dynamically adapting all modal copy, buttons, tooltips, and categories between English and Persian based on active system language.',
      'Enhanced photorealistic vector SVG rendering reflecting genuine enterprise server faceplates, drive caddies, diagnostic LEDs, and rear I/O connectivity.'
    ]
  },
  {
    version: '1.18.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'استودیو طراحی و مدیریت فیزیکی رک‌های دیتاسنتر (16U تا 44U) و کاتالوگ سخت‌افزارهای سرور، سوییچ، استوریج و پیکربندی پورت‌های شبکه',
    title_en: 'Data Center Rack Elevation Studio (16U-44U), Hardware Catalog (HPE/Asus/Cisco/Storage/Firewalls), & Interactive NIC/Port Configurator',
    changes: [
      'افزودن امکان ایجاد و چیدمان رک‌های سرور استاندارد ۱۹ اینچ روی نقشه‌های شماتیک در سایزهای ۱۶، ۲۱، ۲۸، ۳۶، ۴۰ و ۴۴ یونیت با عمق‌های ۶۰، ۸۰، ۱۰۰ و ۱۲۰ سانتی‌متر.',
      'طراحی گرافیکی SVG واقع‌گرایانه تجهیزات و رک‌ها با قابلیت سوئیچ بین نمای جلو (Front View) و نمای پشت (Rear View) شامل شاسی، ریل‌ها، شماره‌گذاری یونیت‌ها (U-slots)، پنل‌های تهویه و براکت‌های نصب.',
      'کاتالوگ جامع سخت‌افزارهای دیتاسنتر: انواع سرورهای HPE ProLiant (نسل‌های Gen8 تا Gen11)، سرورهای ASUS ESC/RS، سرورهای Cisco UCS، سوئیچ‌ها و روترهای سیسکو و میکروتیک، فایروال‌های FortiGate و Sophos XGS، ذخیره‌سازهای HPE MSA/Alletra و Dell EMC، نس QNAP، کیس‌های رکمونت صنعتی، پچ‌پنل‌های مسی و فیبر، و کیبل منیجمنت.',
      'سیستم تعاملی پیکربندی کارت‌های شبکه (NIC) و پورت‌ها هنگام افزودن یا ویرایش سخت‌افزار با تعیین تعداد کارت‌ها، تعداد پورت‌ها در هر کارت، نوع پورت (1GbE RJ45، 10GbE RJ45، 10G SFP+، 25G SFP28، 40G QSFP+، 100G QSFP28 و فیبرچنل FC) با مقادیر پیش‌فرض هوشمند و امکان ویرایش آتی.',
      'استودیو بازرسی و مدیریت ارتقا یافته رک (Rack Elevation Studio Modal) برای مشاهده تفصیلی تجهیزات مستقر در هر یونیت، مصرف برق، پورت‌های شبکه، جابه‌جایی و مدیریت آسان سخت‌افزار.'
    ],
    changes_en: [
      'Added support for placing standard 19-inch server racks on custom schematic maps in 16U, 21U, 28U, 36U, 40U, and 44U unit sizes with 60cm, 80cm, 100cm, and 120cm depth specifications.',
      'Photorealistic vector SVG rendering of racks and hardware devices with instantaneous front/rear view switching, including perforated doors, unit slot numbering, chassis, ventilation grilles, and mounting brackets.',
      'Extensive hardware catalog including HPE ProLiant servers (Gen8 through Gen11), ASUS rack servers, Cisco UCS, Cisco and MikroTik switches/routers, FortiGate and Sophos firewalls, HPE and Dell EMC storage arrays, QNAP rackmount NAS, industrial IPC chassis, copper/fiber patch panels, and horizontal cable managers.',
      'Interactive Network Interface Card (NIC) and port configurator enabling custom card counts, port counts per card, and port interface types (1GbE RJ45, 10GbE RJ45, 10G SFP+, 25G SFP28, 40G QSFP+, 100G QSFP28, 8G/16G/32G FC) with smart template defaults and future re-configurability.',
      'Full-screen Rack Elevation Studio inspector modal displaying unit allocation, total power budget in Watts, port totals, device inspection, and direct NIC editing.'
    ]
  },
  {
    version: '1.17.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'منوی راست‌کلیک پورت‌های گرافیکی میکروتیک و مودال تایید اجرای دستورات RouterOS از طریق تانل',
    title_en: 'MikroTik Graphical Port Right-Click Context Menu & RouterOS Tunnel CLI Execution Confirmation Modal',
    changes: [
      'پیاده‌سازی کامل منوی راست‌کلیک تعاملی (MikroTikPortContextMenu) روی اینترفیس‌ها و پورت‌های گرافیکی در مدال مدیریت میکروتیک با امکانات جامع RouterOS.',
      'پشتیبانی از اقدامات کلیدی: فعال‌سازی/غیرفعال‌سازی اینترفیس (disabled=yes/no)، عضویت و جدا کردن از بریج (Bridge Port Add/Remove)، تغییر و تخصیص VLAN شناسه PVID به همراه انتخابگر سریع و سفارشی، تنظیمات سرعت و مذاکره خودکار (Auto-Negotiation / 100M Full-Duplex / 10G SFP+).',
      'افزودن قابلیت‌های پیشرفته میکروتیک شامل: فعال‌سازی محافظت لوپ شبکه (Loop Protect)، مدیریت برق‌رسانی PoE Out، تغییر کامنت و برچسب پورت، تست سلامت کابل (TDR Cable Diagnostic)، بازنشانی مک‌آدرس کارخانه‌ای و دسترسی مستقیم به ترمینال CLI.',
      'پیاده‌سازی دیالوگ تایید نهایی قبل از اجرا (مشابه مودال سیسکو) که اسکریپت و دستورات دقیق متناظر RouterOS را به همراه پیش‌نمایش تانل نمایش داده و با تایید کاربر، دستورات را بلادرنگ از طریق تانل مستقیم به میکروتیک ارسال و اجرا می‌کند.'
    ],
    changes_en: [
      'Implemented full interactive right-click context menu (MikroTikPortContextMenu) for graphical physical ports in the MikroTik Device Management Modal.',
      'Full support for core RouterOS port operations: Interface enable/disable (disabled=yes/no), Bridge membership toggle (Bridge Port Add/Remove), Bridge VLAN PVID assignment with quick presets and custom ID prompt, speed & duplex control (Auto-negotiation / 100M Full-duplex / 10G SFP+).',
      'Integrated advanced MikroTik capabilities: Hardware Loop Protect activation, PoE Out power delivery management, port comment/description editing, TDR Cable Diagnostic test, factory MAC address reset, and direct RouterOS terminal launching.',
      'Pre-execution CLI confirmation modal (mirroring Cisco workflow) displaying exact RouterOS CLI syntax and tunnel dispatch details, executing live commands over the tunnel upon user confirmation.'
    ]
  },
  {
    version: '1.16.0',
    releaseDate: '2026-09-11',
    type: 'minor',
    title: 'سوئیت جامع VPN میکروتیک، پالت انتخاب رنگ متن ترمینال‌های سیسکو و میکروتیک، و بهبود عملکرد آکاردئونی سایدبار',
    title_en: 'Comprehensive MikroTik VPN Suite, Terminal Text Color Customization, and Collapsed Sidebar Accordion Enhancement',
    changes: [
      'پیاده‌سازی کامل سوئیت VPN میکروتیک با پشتیبانی از ۷ پروتکل: WireGuard، SSTP، OpenVPN، IPsec Site-to-Site، EoIP Tunnel، VXLAN Overlay و PPTP به همراه تولید خودکار کلیدها، فایروال، روتینگ و اعتبارسنجی پارامترها.',
      'افزودن پالت ۸ رنگ متن قلم ترمینال (سفید، زرد، سبز، آبی روشن، بنفش، صورتی، کهربایی، مشکی) در مدال‌های ترمینال سیسکو (Cisco) و میکروتیک (MikroTik) با پایداری در localStorage.',
      'اصلاح رفتار آکاردئونی سایدبار ناوبری در حالت جمع‌شده (Collapsed): مخفی ماندن خودکار زیرمنوهای والدهای بسته زیر والد خود همانند حالت باز بودن منو و امکان کلیک تعاملی روی والد در حالت فشرده.',
      'ثبت قانون اجباری ارتقای نسخه (Version Bump) به ازای هر تغییر برای تمامی هوش‌های مصنوعی در مستندات AGENTS.md و GEMINI.md.'
    ],
    changes_en: [
      'Full multi-protocol MikroTik VPN Suite: WireGuard, SSTP, OpenVPN, IPsec site-to-site, EoIP tunnel, VXLAN overlay, and PPTP with automated key generation, firewall rules, route injection, and parameter validation.',
      'Added 8-color terminal typography palette (White, Yellow, Green, Sky Light Blue, Purple, Pink, Amber Orange, Black) to both Cisco and MikroTik terminal modals with localStorage persistence.',
      'Enhanced collapsed sidebar navigation behavior: properly hiding closed parent children in collapsed mode while allowing interactive parent toggles.',
      'Documented mandatory version bumping rules in AGENTS.md and GEMINI.md for all AI coding agents working on this project.'
    ]
  },
  {
    version: '1.15.4',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'تکمیل انطباق کنتراست متن در ترمینال سیسکو: متن سفید در پس‌زمینه‌های تیره و رنگی و متن مشکی در پس‌زمینه سفید',
    title_en: 'Cisco Terminal Typography Contrast: Pure White on Dark & Colored Backgrounds, Pure Black on White',
    changes: [
      'تنظیم سراسری رنگ متون در ترمینال سیسکو (CiscoTerminalModal): با انتخاب هر یک از رنگ‌های پس‌زمینه (سرمه‌ای، مشکی خالص OLED، آبی‌نفتی، سبز ماتریکس، بنفش سایبرپانک، زغالی)، تمامی متون خروجی ترمینال، پرامپت‌ها، بنر ورود و متن ورودی کاربر در داخل کامند به رنگ سفید خالص (Pure White) نمایش داده می‌شوند.',
      'در صورت انتخاب پس‌زمینه سفید خالص (Pure White)، کلیه نوشته‌های خروجی و فیلد تایپ دستور به رنگ مشکی خالص (Pure Black) تبدیل می‌شوند تا خوانایی فوق‌العاده و کنتراست استاندارد حاصل شود.',
      'حذف تداخل استایل‌های CSS از cisco-cli-input و cisco-terminal-screen برای اعمال بلادرنگ و بدون نقص رنگ انتخابی.'
    ],
    changes_en: [
      'Comprehensive terminal typography contrast for Cisco Terminal Modal: with any dark or colored background selected (Slate, Pitch Black OLED, Solarized Teal, Matrix Green, Cyberpunk Violet, Charcoal), all output texts, prompts, system banners, and the user command input render in pure white.',
      'When selecting Pure White background, all output texts and the command input field automatically switch to pure black for optimal contrast.',
      'Removed CSS override conflicts from cisco-cli-input and cisco-terminal-screen for seamless dynamic color rendering.'
    ]
  },
  {
    version: '1.15.3',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'انطباق کنتراست متن ترمینال: متن سفید خالص در پس‌زمینه‌های تیره و متن مشکی خالص در پس‌زمینه سفید',
    title_en: 'Terminal Text Contrast Synchronization: Pure White on Dark Backgrounds and Pure Black on White',
    changes: [
      'تنظیم دقیق رنگ متون در ترمینال میکروتیک و سیسکو: در صورت انتخاب هر یک از پس‌زمینه‌های تیره و رنگی (سرمه‌ای، مشکی خالص، آبی‌نفتی، سبز ماتریکس، بنفش، زغالی)، تمامی متون خروجی ترمینال، پرامپت‌ها و فیلد ورودی کامند به رنگ سفید خالص (Pure White) نمایش داده می‌شوند.',
      'در صورت انتخاب پس‌زمینه سفید (Pure White)، کلیه نوشته‌های خروجی ترمینال، پرامپت ورودی و متن در حال تایپ به رنگ مشکی خالص (Pure Black) تبدیل می‌شوند تا حداکثر خوانایی و کنتراست بصری فراهم گردد.'
    ],
    changes_en: [
      'Synchronized terminal typography contrast in MikroTik and Cisco modals: on all dark and colored backgrounds, terminal output lines, prompt symbols, and the command input field render in pure white.',
      'On white backgrounds, all terminal output texts, prompt indicators, and typing text automatically switch to pure black for high contrast and readability.'
    ]
  },
  {
    version: '1.15.2',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'شخصی‌سازی رنگ پس‌زمینه ترمینال میکروتیک، منوی تاریخچه دستورات و ناوبری با کلیدهای جهت‌نما',
    title_en: 'MikroTik Terminal Background Palette, Command History Dropdown & Arrow Key Navigation',
    changes: [
      'افزودن پالت انتخاب رنگ‌های پس‌زمینه به ترمینال میکروتیک (MikroTikTerminalModal) مشابه ترمینال سیسکو (شامل رنگ‌های سرمه‌ای پیش‌فرض روتر او اس، مشکی OLED، سرمه‌ای اقیانوسی، آبی‌نفتی میکروتیک، ماتریکس، بنفش سایبرپانک، زغالی و سفید ملایم) همراه با ذخیره‌سازی خودکار در localStorage',
      'افزودن دکمه تاریخچه (History) در کنار دکمه Send در نوار ورودی ترمینال میکروتیک همراه با شمارنده دستورات و منوی شناور',
      'امکان اجرای مجدد و سریع هر دستور قبلی با دکمه Run، کلیک روی ردیف برای درج مستقیم در پرامپت، و دکمه پاک‌سازی کامل تاریخچه (Clear)',
      'پشتیبانی کامل از کلیدهای جهت‌نمای بالا و پایین کیبورد (ArrowUp / ArrowDown) برای پیمایش سریع در دستورات قبلی و بعدی با حفظ متن در حال تایپ کاربر (Draft Input) و تنظیم خودکار مکان‌نما در انتهای خط'
    ],
    changes_en: [
      'Added terminal background color customization palette to MikroTikTerminalModal matching Cisco terminal palette (RouterOS Slate, OLED Black, Midnight Navy, MikroTik Teal, Matrix Green, Cyberpunk Violet, Zinc Charcoal, and Clean Light) with localStorage persistence',
      'Introduced dedicated History button next to the Send button in MikroTik Terminal with badge counter and interactive dropdown menu',
      'Instant re-execution of previous commands with one-click Run button, click-to-insert into prompt, and Clear History action',
      'Complete ArrowUp and ArrowDown keyboard history navigation with draft input buffer preservation and end-of-line cursor positioning'
    ]
  },
  {
    version: '1.15.1',
    releaseDate: '2026-09-10',
    type: 'patch',
    title: 'ارتقای گرافیک بومی پورت‌های میکروتیک، هماهنگی کامل تم روشن در ترمینال و اتصال دوطرفه سلسله‌مراتب فیزیکی در فرم ثبت تجهیز',
    title_en: 'Native MikroTik Port Graphics, Light Theme Parity in RouterOS Terminal, and Bidirectional Physical Placement Selector/Creator',
    changes: [
      'یکپارچه‌سازی سلسله‌مراتب فیزیکی (Physical Placement) در مودال ثبت تجهیز جدید (AddDeviceModal): امکان انتخاب مستقیم تمام ساختمان‌ها، طبقات، واحدها، اتاق‌ها، سکشن‌ها و رک‌های تعریف‌شده در سیستم یا ایجاد موارد جدید با ذخیره‌سازی بلادرنگ در حافظه سلسله‌مراتب شبکه',
      'طراحی مجدد و دقیق پورت‌های میکروتیک (MikroTikPortSvg): شبیه‌سازی جک‌های فلزی شیلدد RJ45، پین‌های تماس طلایی، ال‌ای‌دی‌های دوگانه LINK و ACT، نشانگرهای R (Running) و X (Disabled)، برچسب PoE-IN روی پورت ether1 و اسلات‌های نوری فلزی SFP+ 10G با زبانه اهرم و کانکتورهای LC Duplex',
      'پشتیبانی کامل تم روشن (Light Mode) در مودال ترمینال خط فرمان میکروتیک (MikroTikTerminalModal) و مودال مدیریت سخت‌افزار میکروتیک (MikroTikDeviceManageModal) منطبق بر پالت رنگ روشن سیستم',
      'همگام‌سازی بلادرنگ سلسله‌مراتب مکان فیزیکی با رخداد سفارشی nettopology_hierarchy_updated بین تب Physical Placement و مودال ثبت تجهیز'
    ],
    changes_en: [
      'Integrated Physical Placement hierarchy into AddDeviceModal: select from all existing buildings, floors, rooms/units/sections, and racks or quickly define new ones with instant synchronization',
      'Crafted authentic MikroTik hardware port graphics (MikroTikPortSvg) including metallic shielded RJ45 jacks, gold contact pins, dual LINK & ACT corner LEDs, RouterOS R/X flags, ether1 PoE-IN badge, and SFP+ 10G optical cages',
      'Full light theme parity for MikroTik RouterOS Interactive Terminal and Hardware Management modals matching system theme settings',
      'Real-time bidirectional event synchronization for physical locations across Schematic Topology and Add Device workflows'
    ]
  },
  {
    version: '1.15.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'مودال‌های اختصاصی میکروتیک (MikroTik RouterOS Terminal & Management Modal) و اتصال هوشمند شماتیک توپولوژی',
    title_en: 'Dedicated MikroTik RouterOS Terminal Modal, Hardware & Port Management Console, and Schematic Topology Integration',
    changes: [
      'پیاده‌سازی مودال اختصاصی ترمینال میکروتیک (MikroTikTerminalModal) با تم تاریک RouterOS، بنر اسکی آرت بومی میکروتیک، پرامپت پویا ([admin@Identity] >) و پشتیبانی از کلیه دستورات خط فرمان با اسلش',
      'ایجاد سایدبار راهنمای جامع دستورات RouterOS دسته‌بندی‌شده شامل پورت‌ها و بریج (/interface)، آدرس‌ها و روتینگ (/ip)، سیستم و سخت‌افزار (/system)، ابزارهای پایش و پینگ (/tool) و استخراج پیکربندی (/export)',
      'توسعه مودال جامع مدیریت سخت‌افزار و پورت‌های میکروتیک (MikroTikDeviceManageModal) به سبک WinBox و WebFig با نمایش گرافیکی شاسی پورت‌ها (Faceplate)، وضعیت‌های R (Running)، X (Disabled) و پورت‌های SFP+ 10G',
      'امکان مدیریت بلادرنگ مشخصات اینترفیس‌ها، تغییر وضعیت Admin، شناسه PVID/VLAN، سرعت، برچسب کامنت و انجام عملیات گروهی (Batch Operations) روی پورت‌های میکروتیک',
      'تب‌های پایش منابع سخت‌افزاری RouterBOARD (لود پردازنده، حافظه رم، فضای دیسک NAND، ولتاژ، دما)، مدیریت آدرس‌های IP و روتینگ، بریج و VLAN filtering، و استخراج اسکریپت .rsc با یک کلیک',
      'یکپارچه‌سازی کامل در نقشه شماتیک توپولوژی (Schematic Topology View): کلیک روی دکمه CLI در کارت‌های دیوایس میکروتیک مستقیماً ترمینال اختصاصی میکروتیک را باز می‌کند و کلیک روی دکمه پورت‌ها، مودال اختصاصی مدیریت میکروتیک را فراخوانی می‌کند.'
    ],
    changes_en: [
      'Implemented dedicated MikroTik RouterOS Interactive Terminal Modal (MikroTikTerminalModal) featuring RouterOS branding, ASCII banner art, native prompt ([admin@Identity] >), and slash command execution',
      'Built MikroTik Command Guide sidebar categorized by Interfaces & Bridge (/interface), IP & Routing (/ip), System Resources (/system), Diagnostic Tools (/tool), and Configuration Export (/export)',
      'Developed comprehensive MikroTik Device & Port Inspector Modal (MikroTikDeviceManageModal) inspired by WinBox/WebFig with physical chassis faceplate, status LEDs (Running/Disabled/SFP+), and port inspector',
      'Enabled real-time interface configuration, Admin status toggle, PVID/VLAN assignment, link speed, comment annotations, and multi-port batch operations',
      'Added hardware resource monitors (multi-core CPU, RAM, NAND flash, voltage, temperature), IP address table manager, Bridge VLAN filtering overview, and one-click .rsc configuration export',
      'Full Schematic Topology View integration: clicking CLI on any MikroTik node card immediately opens the dedicated RouterOS Terminal, and clicking Ports opens the dedicated MikroTik Device & Port Manager'
    ]
  },
  {
    version: '1.14.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'بازطراحی جامع معماری چندپلتفرمه دیوایس‌ها با الگوی درایور (Multi-Vendor Driver Pattern)، ترمینال چندسیستم‌عاملی (Cisco/MikroTik/Linux) و تفکیک انحنای کابل‌های موازی توپولوژی',
    title_en: 'Multi-Vendor Driver Architecture (Cisco IOS/IOS-XE, MikroTik RouterOS, Linux), Platform-Aware Interactive Terminal & Parallel Topology Links Curvature',
    changes: [
      'پیاده‌سازی الگوی معماری درایور (Driver Pattern) در بک‌اند با ایجاد کلاس انتزاعی BaseDriver و درایورهای مستقل برای Cisco (IOS/IOS-XE)، MikroTik (RouterOS)، Generic Linux و Simulator',
      'مدیریت هوشمند و بهینه اتصالات SSH با کلاس تخصصی SSHConnectionManager بر پایه پارامیکو، سیاست Lazy Connection و بستن خودکار نشست‌های بلااستفاده',
      'بازطراحی فرم‌های افزودن و ویرایش دیوایس (Add/Edit Device Modal) با پشتیبانی صریح از انتخاب پلتفرم (Platform & OS Driver)، سوییچ حالت درایور (SSH Live / Simulator) و پنهان‌سازی خودکار فیلدهای غیرمرتبط مانند Enable Secret برای میکروتیک و لینوکس',
      'یکپارچه‌سازی و استانداردسازی مدل داده‌ای Device با آبجکت ساختاریافته connection شامل پروتکل، هاست، پورت، تایم‌اوت و اعتبارسنجی مستقل',
      'توسعه ترمینال تعاملی دیوایس با تشخیص بلادرنگ پلتفرم: پشتیبانی از پرامپت‌ها و ساختار شل بومی میکروتیک ([admin@Router] >) و لینوکس (user@host:~$) و خطایابی استاندارد هر سیستم‌عامل',
      'افزودن سایدبار هوشمند دستورات (Command Guide) اختصاصی برای سیستم‌عامل لینوکس (شامل ip -c a، ss -tulpn، ethtool، systemctl، iptables و...) در کنار دستورات میکروتیک و سیسکو',
      'بهینه‌سازی محاسبات ریاضی موتور برداری نقشه توپولوژی (Schematic Map) و تفکیک کامل انحنای کابل‌های موازی بین دو دیوایس (Parallel Cables Overlap Fix) با اصلاح تراز جهت برداری'
    ],
    changes_en: [
      'Implemented backend Multi-Vendor Driver Pattern with BaseDriver abstraction and dedicated driver modules for Cisco IOS/IOS-XE, MikroTik RouterOS, Generic Linux, and Simulator',
      'Added enterprise SSHConnectionManager with Paramiko, lazy session acquisition, keepalive support, and automatic lifecycle cleanup',
      'Overhauled Add & Edit Device modals with Hardware Platform & OS selection, Driver Mode toggles (SSH Live vs Simulator), and platform-tailored credential inputs',
      'Standardized device schema with unified connection object supporting explicit protocols, ports, hosts, timeouts, and multi-vendor credentials',
      'Upgraded Interactive Device Terminal with native platform awareness: dynamic prompts ([admin@Router] >, user@host:~$), banner styling, and OS-authentic command parsing',
      'Enriched Quick Command Guide sidebar with dedicated Linux POSIX/iproute2 commands (ip -c a, ss -tulpn, ethtool, iptables, systemctl) alongside MikroTik and Cisco catalogs',
      'Resolved parallel topology link overlaps in Schematic View with vector direction compensation and dynamic curvature separation'
    ]
  },
  {
    version: '1.13.0',
    releaseDate: '2026-09-10',
    type: 'minor',
    title: 'پورتال جامع پشتیبان‌گیری و بازیابی اطلاعات شبکه (Backup & Disaster Recovery Portal) با رمزنگاری AES-GCM، ممیزی امنیتی SHA-256 و نقطه بازگشت خودکار',
    title_en: 'Enterprise Backup & Disaster Recovery Portal with 256-bit AES-GCM Encryption, SHA-256 Checksum Auditing & Instant Safety Rollback Protection',
    changes: [
      'ایجاد پورتال اختصاصی و پیشرفته پشتیبان‌گیری و بازیابی اطلاعات شبکه (Backup Portal) در منوی تنظیمات و سایدبار با رویکرد تاب‌آوری در برابر فاجعه (Disaster Recovery)',
      'پشتیبانی از تفکیک دامنه‌های استخراج: پکیج جامع شبکه (Full DR)، نقشه‌ها و توپولوژی سفارشی، کاربران و سطوح دسترسی (RBAC)، و الگوهای پیکربندی',
      'امنیت حداکثری داده‌ها: رمزنگاری استاندارد AES-GCM (256-bit) با مشتق‌گیری کلید PBKDF2 از رمز عبور دلخواه و قابلیت پاکسازی و ماسک‌کردن سکرت‌ها و پسوردهای SSH جهت اهداف ممیزی',
      'حفاظت و ارزیابی پیش از بازیابی (Pre-flight Inspection): بررسی خودکار اصالت امضای دیجیتال و هش SHA-256 و پیش‌نمایش دقیق محتوا قبل از اعمال روی دیتابیس',
      'مکانیزم ایمن بازگردانی: پشتیبانی از دو استراتژی جایگزینی کامل (Full Overwrite) با تایید کلمه‌ای و ادغام هوشمند افزایشی (Smart Incremental Merge)',
      'نقطه بازیابی اضطراری خودکار (Safety Snapshot): ایجاد اسنپ‌شات پیش از هرگونه تغییر با قابلیت بازگشت آنی یک‌کلیکه (Instant Rollback)',
      'کنترل دسترسی دقیق (RBAC): افزودن مجوزهای مجزای canExportBackup و canImportBackup به ماتریس پالیسی‌های دسترسی جهت مسدودسازی دسترسی کاربران غیرمجاز',
      'دفتر کل رویدادها (Audit Trail): ثبت دائمی تمام فعالیت‌های استخراج، بازیابی، رول‌بک و درخواست‌های مسدودشده با جزئیات کاربر و هش فایل'
    ],
    changes_en: [
      'Introduced dedicated Enterprise Backup & Disaster Recovery Portal in Settings and Sidebar with disaster resilience and state preservation architecture',
      'Multi-scope export engine: Full Disaster Recovery package, Custom Topology Maps & Inventory, Identity & Access Policies (RBAC), and Configuration Templates',
      'High-grade cryptographic security: 256-bit AES-GCM encryption with PBKDF2 key derivation from custom passphrase, plus sensitive credential sanitization for safe audit exports',
      'Pre-flight integrity validation: Automatic SHA-256 checksum verification, structural schema validation, and item inventory preview before database commit',
      'Two restore execution modes: Full Overwrite with safety keyword confirmation ("RESTORE") or Smart Incremental Merge preserving existing state',
      'Automated disaster rollback snapshot (Safety Point): Captures live system state prior to any restore operation with one-click Instant Rollback capability',
      'Granular RBAC integration: Added dedicated canExportBackup and canImportBackup capability flags to access control policies, locking actions for unauthorized roles',
      'Tamper-evident Disaster Recovery Audit Trail: Real-time logging of all export, restore, rollback, and RBAC-blocked events with timestamps and SHA-256 hashes'
    ]
  },
  {
    version: '1.12.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'تفکیک منوی تنظیمات به زیرمنوهای سایدبار، ایجاد ماژول مدیریت کاربران و گروه‌های محلی و تعمیم کنترل دسترسی (RBAC) به تجهیزات میکروتیک و لینوکس',
    title_en: 'Modular Settings Navigation in Sidebar, Local Users & Security Groups Identity Management & Multi-Vendor Granular RBAC (Cisco, MikroTik RouterOS, Linux)',
    changes: [
      'تفکیک صفحات منوی تنظیمات از تب‌های فشرده درون‌صفحه‌ای به زیرمنوهای مستقل در سایدبار (گروه‌بندی دیوایس‌ها، کاربران و گروه‌های محلی، اکتیو دایرکتوری، سطوح دسترسی RBAC)',
      'افزودن کامل بخش مدیریت کاربران و گروه‌های محلی (Local Users & Security Groups) با قابلیت ایجاد کاربر، تخصیص کلمه عبور، فعال/غیرفعال‌سازی، تعریف گروه‌های امنیتی و مدیریت عضویت',
      'تعمیم جامع ماتریس دسترسی به تجهیزات غیر سیسکو و پشتیبانی از تجهیزات میکروتیک (MikroTik RouterOS) شامل Bridge VLAN، غیرفعال‌سازی اینترفیس، Safe-Mode، بکاپ و کنسول RouterOS',
      'پشتیبانی از اختیارات تجهیزات جنریک و لینوکسی (ip link toggle، عیب‌یابی پکت و شبکه، بکاپ کانفیگ، شل ترمینال)',
      'یکپارچه‌سازی کامل شبیه‌ساز نقش‌ها و پالیسی‌های دسترسی با کاربران و گروه‌های محلی در کنار اکتیو دایرکتوری'
    ],
    changes_en: [
      'Refactored Settings into dedicated sidebar submenus (Device Groups, Local Identity, Active Directory / LDAP, Granular RBAC) for clean navigation hierarchy',
      'Introduced full Local Identity management (Local Users & Security Groups) with account creation, credential management, activation toggles, and group membership sync',
      'Generalized Granular RBAC to multi-vendor network equipment with native MikroTik RouterOS capabilities (Bridge VLAN, interface toggle, Safe-Mode, IP pool, backup, RouterOS CLI)',
      'Added Linux & Generic network appliance capabilities (interface link toggle, diagnostics ping/trace/capture, config archive, SSH shell terminal)',
      'Fully linked the RBAC live role simulator with local identity groups and accounts alongside Active Directory'
    ]
  },
  {
    version: '1.11.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'رفع سرریز دراپ‌داون اینترفیس‌ها در ترمینال، متن سفید پررنگ تگ‌های Trunk/Access، بنر تیره لاگین، منوی راست‌کلیک پورت‌ها (Shutdown/No Shutdown) و نشان استاندارد Layer 2 Security',
    title_en: 'Resolved Terminal Interface Dropdown Viewport Overflow, Bold White Trunk/Access Badges, Dark Gray Login Banner, Switch Faceplate Right-Click Context Menu (Shutdown/No Shutdown) & Standardized Layer 2 Security Badge',
    changes: [
      'اصلاح و بهینه‌سازی کادر کشویی اینترفیس‌ها در مودال ترمینال سیسکو و جلوگیری کامل از خروج آن از صفحه و کادر با جانمایی هوشمند',
      'اصلاح رنگ و کنتراست تگ‌های Trunk و Access در لیست اینترفیس‌ها به صورت متن کاملاً سفید و پررنگ (Bold) در تم روشن',
      'تغییر رنگ خطوط پیام احراز هویت لاگین (User Access Verification، نام کاربری، رمز عبور و خطوط ستاره) در تم روشن به رنگ خاکستری تیره استاندارد و خوانا',
      'اصلاح و سفید و بولد کردن متون و برچسب‌های بنفش در بخش Switch Faceplate زیر پورت‌های سخت‌افزاری',
      'تجهیز Switch Faceplate به منوی راست‌کلیک مستقیم با گزینه‌های مجزای Shutdown (خاموش/دیزیبل) و No Shutdown (روشن) و کپی دستورات CLI',
      'استانداردسازی کادر Layer 2 Security با متن مشکی و فونت پررنگ (Bold Black) در تمام بخش‌ها با کلاس سراسری'
    ],
    changes_en: [
      'Resolved Cisco terminal modal interface dropdown overflowing outside viewport with responsive auto-clamping and boundary protection',
      'Fixed contrast on Trunk and Access port mode badges with crisp bold white typography on vivid backgrounds in light theme',
      'Darkened Cisco login verification text (User Access Verification, credentials, and asterisks) to readable dark gray in light mode',
      'Formatted purple badges and VLAN tags under Switch Faceplate ports with high-contrast bold white text',
      'Equipped Switch Faceplate ports with dedicated right-click context menu offering direct Shutdown and No Shutdown operations with CLI command copy',
      'Standardized Layer 2 Security badges globally with ultra-crisp bold black text styling'
    ]
  },
  {
    version: '1.10.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'اتصال زنده و واقعی SSH به تجهیزات شبکه در ترمینال CLI، نمایش پویا و زنده پورت‌ها، حذف بصری کابل‌های نقشه با تاییدیه و خوانایی برچسب‌های لینک',
    title_en: 'Real Hardware SSH Connectivity in Cisco Terminal CLI, Dynamic Real-Time Interface State Engine, Visual Topology Cable Deletion with Confirmation & Overlap-Free Link Badges',
    changes: [
      'پیاده‌سازی ارتباط زنده و واقعی SSH (Native SSH Client) از طریق کتابخانه قدرتمند ssh2 در بک‌اند نود و اجرای مستقیم دستورات روی تجهیزات سخت‌افزاری',
      'نمایش بلادرنگ وضعیت نشست SSH، تاخیر میلی‌ثانیه‌ای (Latency)، سایفر ارتباطی و لاگین زنده در سربرگ ترمینال سیسکو',
      'موتور پویا و زنده نمایش اطلاعات پورت‌ها و اینترفیس‌ها در دستورات show ip interface brief، show mac address-table، show port-security و show interfaces status بر اساس وضعیت حقیقی دستگاه',
      'امکان حذف بصری و مستقیم کابل‌ها و اتصالات در نقشه شماتیک توپولوژی با دکمه ضربدر شناور هنگام هاور موس همراه با مودال تایید حذف امن',
      'بهینه‌سازی کامل نشان‌ها و برچسب‌های اطلاعاتی کابل‌ها (پورت، ویلن و IP) جهت جلوگیری از همپوشانی و خوانایی حداکثری'
    ],
    changes_en: [
      'Implemented real hardware SSH connectivity using the native ssh2 client in the backend server with live command execution on network devices',
      'Added real-time SSH session indicator badges, millisecond latency measurements, cipher negotiation details, and live handshake in the Cisco terminal header',
      'Dynamic real-time interface and port state engine for show ip interface brief, show mac address-table, show port-security, and show interfaces status reflecting actual hardware configurations',
      'Visual interactive cable deletion on topology links with hover-activated delete action and a confirmation modal for safe link removal',
      'Optimized cable label badges (port IDs, VLANs, and IPs) with enhanced spacing to eliminate visual overlap and ensure maximum clarity'
    ]
  },
  {
    version: '1.9.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'تست زنده اتصال SSH تجهیزات، فیلدهای احراز هویت در فرم افزودن تجهیز و ویرایش و اعمال دسته‌ای پورت‌های سوئیچ (Multi-Port Batch Configuration)',
    title_en: 'Live SSH Device Connection Testing, Inventory Credential Fields & Multi-Port Batch Switchport Configuration',
    changes: [
      'افزودن فیلدهای اطلاعات احراز هویت SSH (پورت، نام کاربری، کلمه عبور و Enable Secret) به مودال افزودن تجهیز جدید',
      'دکمه تعاملی بررسی زنده اتصال SSH (Test Connection) با سنجش بلادرنگ تاخیر (Latency) و نمایش فیدبک بصری خطا یا موفقیت',
      'امکان انتخاب چندتایی پورت‌های سوئیچ با نگه‌داشتن کلید Ctrl / Cmd / Shift روی فیس‌پلیت سخت‌افزاری یا چک‌باکس‌های جدول پورت‌ها',
      'پنل اختصاصی پیکربندی دسته‌ای پورت‌ها (Batch Configuration) با قابلیت تغییر همزمان وضعیت ادمین (no shutdown / shutdown)، مود ترانک و اکسس، تخصیص ویلن، ویلن‌های مجاز و امنیت پورت (Port Security)',
      'یکپارچه‌سازی کامل قابلیت ویرایش گروهی پورت‌ها در هر دو نمای مودال بازرس پورت (PortInspectorModal) و صفحه مستقل مدیریت پورت‌ها (PortManagementView)'
    ],
    changes_en: [
      'Added SSH credential fields (SSH Port, Username, Password, and Enable Secret) to the Add Device modal',
      'Interactive live SSH connection test button (Test Connection) with real-time latency measurement and visual feedback',
      'Multi-port batch selection support via Ctrl / Cmd / Shift + click on hardware faceplate ports or table checkboxes',
      'Dedicated Multi-Port Batch Configuration panel for bulk updates to Admin Status, Switchport Mode, Access VLAN, Trunk Allowed VLANs, and Cisco Port Security',
      'Unified batch configuration across both PortInspectorModal and the dedicated PortManagementView page'
    ]
  },
  {
    version: '1.8.2',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'رفع خطای فراخوانی تابع ذخیره در مودال پیکربندی لینک (Fix onSave Function Handler in Link Modal)',
    title_en: 'Fix onSave Function Handler in Link Configuration Modal',
    changes: [
      'رفع خطای Uncaught TypeError: onSave is not a function هنگام ثبت کابل و ایجاد اتصال در نقشه سفارشی توپولوژی',
      'پشتیبانی دوگانه از پروپ‌های onSave / onSaveLink و onDelete / onDeleteLink با فراخوانی ایمن در مودال پیکربندی کابل و لینک'
    ],
    changes_en: [
      'Resolved Uncaught TypeError: onSave is not a function when connecting cables and creating links in custom topology maps',
      'Added dual backward-compatible support for onSave/onSaveLink and onDelete/onDeleteLink with defensive invocation guards in the link configuration modal'
    ]
  },
  {
    version: '1.8.1',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'رفع خطای برخورد نام آیکون Map با سازنده اصلی جاوااسکریپت (Fix Map Constructor Conflict)',
    title_en: 'Fix Map Name Collision with JavaScript Native Map Constructor',
    changes: [
      'رفع خطای Uncaught TypeError: Map is not a constructor در صفحه شماتیک توپولوژی با تغییر نام آیکون Map به MapIcon',
      'تضمین عملکرد بی‌نقص نگاشت مختصات نودها در بوم نقشه با استفاده از شیء استاندارد JavaScript Map'
    ],
    changes_en: [
      'Resolved Uncaught TypeError: Map is not a constructor in Schematic Topology View by aliasing the Lucide Map icon to MapIcon',
      'Ensured seamless coordinate and node position mapping on the canvas using the native JavaScript Map object'
    ]
  },
  {
    version: '1.8.0',
    releaseDate: '2026-09-09',
    type: 'minor',
    title: 'سیستم جامع نقشه‌های سفارشی توپولوژی، ابزار سیم‌کشی و کابل‌کشی تعاملی و پیکربندی پورت‌ها و لینک‌ها',
    title_en: 'Custom Topology Maps, Interactive Cabling Tool, and Dual-End Port & Link Configuration Engine',
    changes: [
      'امکان ایجاد، ویرایش، حذف و جابجایی بین چندین نقشه توپولوژی سفارشی (Custom Topology Maps) در کنار نقشه خودکار کشف‌شده شبکه',
      'قابلیت انتخاب و افزودن تجهیزات موجود در شبکه به نقشه‌های سفارشی و تعیین موقعیت مکانی دلخواه بر روی صفحه بوم (Canvas)',
      'نوار ابزار تعاملی جدید شامل ابزار انتخاب/جابجایی (Select) و ابزار کابل‌کشی (Cable Tool) با بنر راهنمای گام‌به‌گام',
      'مودال انتخاب پورت تعاملی با پیش‌نمایش سخت‌افزاری Faceplate، تفکیک پورت‌های مبدأ و مقصد و تشخیص پورت‌های آزاد و مشغول',
      'مودال پیشرفته پیکربندی لینک و اتصالات کابل با قابلیت تعیین IP هر دو سمت، نوع کابل (Copper, Fiber, Serial)، پهنای باند، حالت پورت (Trunk یا Access)، شماره ویلن اختصاصی و توضیحات',
      'برچسب‌گذاری و نمایش زنده مشخصات کابل، پورت‌ها، شماره ویلن و IP هر سمت بر روی خطوط ارتباطی SVG در نقشه سفارشی با قابلیت کلیک برای ویرایش یا حذف لینک',
      'ذخیره‌سازی پایدار و مجزای نقشه‌ها، چیدمان نودها و لینک‌ها در حافظه محلی سیستم (LocalStorage)'
    ],
    changes_en: [
      'Support for creating, editing, renaming, deleting, and switching between multiple custom user-defined topology maps alongside the auto-discovered network schematic',
      'Ability to add and position existing inventory switches and routers onto custom map canvases with drag-and-drop spatial coordinate persistence',
      'New secondary toolbar with Select/Move and interactive Cable tools featuring persistent step-by-step connection banners',
      'Visual port selector modal featuring hardware switch faceplate previews, search filtering, and occupied/free port detection',
      'Advanced dual-end link configuration modal to define management IPs, port modes (802.1Q Trunk vs Access), VLAN IDs, cable types (Copper, Fiber, Serial), and link speeds',
      'Interactive SVG link rendering with endpoint badges for source/target ports, VLANs, and IPs, plus click-to-edit capabilities',
      'Complete client-side persistence of custom maps, node layouts, and custom link configurations in LocalStorage'
    ]
  },
  {
    version: '1.7.1',
    releaseDate: '2026-09-09',
    type: 'patch',
    title: 'یکپارچه‌سازی کامل نمایش فیزیکی پورت‌های سوئیچ (Switch Faceplate) در صفحه پایش پورت‌ها و ویلن',
    title_en: 'Harmonize Switch Faceplate Visual & Port Matrix in Port & VLAN Monitoring View',
    changes: [
      'یکپارچه‌سازی کامل نحوه نمایش پورت‌های فیزیکی در بخش «Ports, Trunk/Access & VLAN Monitoring» با استاندارد Switch Faceplate مودال جزئیات تجهیزات',
      'به‌کارگیری کامپوننت وکتور پورت‌های RJ-45 (NetworkPortSvg) به همراه شاسی سخت‌افزاری سوئیچ (Switch Chassis & Grid) در صفحه مدیریت پورت‌ها',
      'افزودن کارت اختصاصی وضعیت پورت سکیوریتی سیسکو (Cisco Port Security) به کارت ۵ گانه بازرس پورت در حالت مشاهده',
      'هماهنگ‌سازی لژند رنگی پورت‌ها (Up, Down, Disabled, Trunk) و ال‌ای‌دی‌های وضعیت با استانداردهای طراحی شاسی سخت‌افزاری'
    ],
    changes_en: [
      'Harmonized the physical port visualization in "Ports, Trunk/Access & VLAN Monitoring" to match the exact Switch Faceplate chassis and grid design of PortInspectorModal',
      'Integrated dedicated RJ-45 vector socket rendering (NetworkPortSvg) with interactive link LEDs, VLAN chips, and responsive hover/context states',
      'Added Cisco Port Security status card to the 5-card inspector grid in the port management view',
      'Synchronized faceplate header, hardware chassis background, and port status legend (Up, Down, Disabled, Trunk) across views'
    ]
  },
  {
    version: '1.7.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'تاییدیه هوشمند دستورات سیسکو (سویچ/روتر)، مودال تخصیص ویلن، رنگ‌بندی وضعیت پورت‌ها و ناوبری پورت سکیوریتی',
    title_en: 'Cisco Device Command Confirmation (Switch/Router), Assign Access VLAN Modal, Port State Visuals & Port Security Navigation',
    changes: [
      'افزودن مودال تایید دو مرحله‌ای بله/خیر با تولید و پیش‌نمایش بلادرنگ دستورات Cisco IOS متناسب با نوع دستگاه (Switch یا Router) برای تغییرات Shutdown/No Shutdown، ترانک، اکسس و پورت سکیوریتی',
      'طراحی مودال اختصاصی تخصیص ویلن دسترسی (Assign Access VLAN Modal) با نمایش لیست ویلن‌های موجود تجهیز در بالا و کادر ورودی شماره دلخواه ویلن با تولید دستور متناظر switchport access vlan',
      'هدایت هوشمند و خودکار گزینه «فعال‌سازی پورت سکیوریتی» در منوی راست‌کلیک به بخش ویرایش پورت و تیک خوردن خودکار سکیوریتی جهت تنظیم دستی کاربر',
      'رنگ‌بندی بصری پورت‌های فیزیکی سوئیچ: پس‌زمینه قرمز ملایم برای پورت‌های Shutdown، پس‌زمینه نارنجی ملایم برای پورت‌های Disabled و حالت پیش‌فرض برای پورت‌های Up',
      'اصلاح رنگ و کنتراست بج‌های ویلن (v1, v10, ...) با متن سفید پررنگ (Bold White) روی پس‌زمینه بنفش برای خوانایی بی‌نقص در تمامی تم‌ها'
    ],
    changes_en: [
      'Interactive Yes/No Cisco CLI Command Confirmation Modal with real-time command syntax preview tailored to device type (Switch vs Router) for shutdown, no shutdown, trunk/access, and security toggle',
      'Dedicated Assign Access VLAN modal displaying existing device VLANs at top with custom VLAN ID input and generated CLI configuration preview',
      'Context menu "Enable Port Security" automated routing into port inspector edit form with auto-enabled toggle and smooth scroll',
      'Dynamic port status background coloring on Switch Faceplate: soft red tint for shutdown ports, soft amber tint for disabled ports, and standard dark tint for active ports',
      'High-contrast bold white typography on purple VLAN badges across switch ports and inventory tables for optimal visibility'
    ]
  },
  {
    version: '1.6.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'منوی راست‌کلیک پورت‌های سوئیچ (Cisco Port Context Menu)، بهینه‌سازی دراپ‌داون اینترفیس‌ها و کنتراست بالای لیبل‌ها در تم روشن',
    title_en: 'Cisco Switch Port Right-Click Context Menu, Terminal Interface Dropdown Fix & High-Contrast Light Theme Badges',
    changes: [
      'افزودن منوی راست‌کلیک پیشرفته روی پورت‌های فیزیکی سوئیچ (Switch Faceplate) جهت اعمال دستورات shutdown / no shutdown، تغییر حالت Trunk/Access، فعال‌سازی پورت سکیوریتی و تنظیم سریع VLAN',
      'رفع مشکل خروج لیست اینترفیس‌ها در مودال ترمینال از کادر و بهبود اسکرول و جانمایی خودکار با کلیک در بیرون کادر',
      'اصلاح رنگ و کنتراست تگ‌های Trunk و Access در تم روشن به صورت متن سفید پررنگ (Bold) روی پس‌زمینه بنفش/نیلی خوانا',
      'اصلاح رنگ متن بنر لاگین ترمینال (User Access Verification، نام کاربری و پسورد و خطوط ستاره) در تم روشن به خاکستری تیره استاندارد و خوانا',
      'به‌روزرسانی و استانداردسازی جهانی برچسب Layer 2 Security در کادر پورت سکیوریتی با متن مشکی و فونت بولد برجسته'
    ],
    changes_en: [
      'Introduced advanced right-click context menu (CiscoPortContextMenu) on Switch Faceplate physical ports for instant shutdown/no-shutdown, Trunk/Access mode toggle, Port Security activation, and quick VLAN assignment',
      'Resolved terminal modal interface dropdown overflowing outside viewport with responsive placement and click-outside dismissal',
      'Enhanced Trunk and Access port mode badges with crisp white bold typography over vivid purple/indigo backgrounds for pristine readability across light and dark themes',
      'Refined Cisco Terminal login verification banner text (User Access Verification, credentials, and asterisks) to dark slate/gray in light theme for optimal legibility',
      'Applied high-contrast bold black text styling globally to Layer 2 Security badge in Cisco Port Security modules'
    ]
  },
  {
    version: '1.6.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'مدیریت سلسله‌مراتبی پیشرفته استقرار فیزیکی (ساختمان > طبقه > بخش/واحد > رک) با درگ اند دراپ، ویرایش، حذف و تنظیم پورت بک‌اند',
    title_en: 'Advanced Hierarchical Physical Placement (Building > Floor > Unit > Rack) with Drag & Drop, Full CRUD & Backend Port Selection',
    changes: [
      'پیاده‌سازی ساختار سلسله‌مراتبی کامل فیزیکی شامل ساختمان (Building)، طبقه (Floor)، واحد/بخش (Unit/Section) و رک (Rack)',
      'پشتیبانی کامل از کشیدن و رها کردن (Drag & Drop) تجهیزات بین ساختمان‌ها، طبقات، بخش‌ها و رک‌ها با فیدبک بصری و ذخیره‌سازی زنده',
      'امکان ایجاد، ویرایش نام (Rename) و حذف (Delete) برای تمامی سطوح سلسله‌مراتب (ساختمان، طبقه، واحد و رک)',
      'افزودن امکان تعریف واحد/بخش و رک درون هر طبقه به صورت اختصاصی با مودال‌های مدرن',
      'حذف برچسب نسخه از هدر جهت خلوت‌تر و مینیمال شدن نوار بالایی سامانه',
      'دریافت پورت سفارشی بک‌اند با مقدار پیش‌فرض در اسکریپت‌های نصب خودکار (install.sh و setup-panel.sh)'
    ],
    changes_en: [
      'Full physical hierarchy structure implementation supporting Building > Floor > Unit/Section > Rack levels',
      'End-to-end interactive Drag & Drop for devices across buildings, floors, units, and racks with live visual drop feedback and persistence',
      'Complete CRUD controls: Add, Rename, and Delete for all hierarchy levels (Building, Floor, Unit, and Rack)',
      'Floor-level actions to dynamically spawn custom Units/Rooms and Server Racks via modern glassmorphic modals',
      'Removed version tag from top navbar for a clean, minimalist header bar',
      'Interactive backend port configuration with intelligent default fallback in automated Linux installer scripts (install.sh & setup-panel.sh)'
    ]
  },
  {
    version: '1.5.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'قابلیت کشیدن و رها کردن (Drag & Drop) تجهیزات بین طبقات و ساختمان‌ها در نقشه استقرار فیزیکی',
    title_en: 'Drag & Drop Physical Device Placement Across Buildings & Floors in Physical Map',
    changes: [
      'امکان درگ اند دراپ (Drag & Drop) تعاملی تجهیزات شبکه بین طبقات مختلف یک ساختمان یا جابجایی بین ساختمان‌های مجزا در نمای استقرار فیزیکی (Physical Placement)',
      'به‌روزرسانی آنی و زنده رابط کاربری (Optimistic UI) با ارسال همزمان درخواست تغییر موقعیت فیزیکی به بک‌اند و بازگشت خودکار در صورت بروز خطا',
      'افزودن امکان تعریف ساختمان جدید و طبقات جدید به صورت داینامیک با مودال‌های مدرن و شیشه‌ای',
      'افزودن دکمه و مودال جابجایی دستی (Manual Relocation) برای دستگاه‌ها جهت پشتیبانی از انتخاب دقیق یا سفارشی ساختمان و طبقه مقصد',
      'نمایش وضعیت زنده، پیام‌های راهنما، انیمیشن ناحیه هدف (Drop Zone) و بازخورد صوتی/بصری تغییر مکان'
    ],
    changes_en: [
      'Interactive HTML5 Drag & Drop for network devices between floors and across different buildings in the Physical Placement schematic view',
      'Optimistic UI state updates with real-time backend persistence (PUT /api/devices/:id) and automatic rollback upon error',
      'Dynamic creation of custom buildings and floors via clean glassmorphic modals to expand physical topology hierarchy',
      'Manual relocation modal offering accessible dropdown and custom input selectors for precision placement without drag gestures',
      'Live visual feedback including animated drop zones, moving indicator pills, and toast status notifications'
    ]
  },
  {
    version: '1.4.4',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'سازگاری کامل مودال بازرسی پورت با تمام تم‌های رنگی و خلوت‌سازی نوار کناری و پروفایل',
    title_en: 'Full Theme Color Compatibility for Port Inspector Modal & Sidebar/Profile Decluttering',
    changes: [
      'سازگاری کامل مودال بازرسی و پیکربندی پورت‌ها (Port Inspector Modal) شامل جدول پورت‌ها، فرم ویرایش و سامری تایید با تمامی تم‌های رنگی و تم روشن',
      'حذف باکس هشدار قطعی تجهیزات (Outage Alert) از سایدبار جهت خلوت‌سازی و پاکیزگی نوار ناوبری',
      'حذف نمایش شماره نسخه از پاورقی سایدبار',
      'مینیمال‌سازی نشانگر نشست فعال (Active Session) در منوی کاربری به یک نشانگر ظریف و پالس‌زننده'
    ],
    changes_en: [
      'Full multi-theme color compatibility for Port Inspector Modal including inventory table, edit form, and apply confirmation summary',
      'Removed Outage Alert box from sidebar to achieve a clean, clutter-free navigation drawer',
      'Removed version badge from sidebar footer',
      'Minimized Active Session status in profile dropdown to an elegant pulsing indicator'
    ]
  },
  {
    version: '1.4.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'خلوت‌سازی هدر، افزودن منوی دراپ‌داون پروفایل و سازگاری کامل صفحات پورت‌ها و اسکنر CDP/LLDP با تم‌های رنگی',
    title_en: 'Header Decluttering, Profile Dropdown Menu & Full Theme Color Compatibility for Port Management and CDP/LLDP Scanner',
    changes: [
      'ایجاد آیکون و منوی کشویی یکپارچه پروفایل (Profile Dropdown) در هدر با انتقال تنظیمات تیم/سازمان و سوئیچر زبان به داخل آن',
      'حذف نشانگرهای شلوغ تعداد تجهیزات آنلاین و کریتیکال از نوار بالایی جهت خلوت و مینیمال شدن کامل هدر',
      'کوچک‌سازی چشمگیر برچسب نسخه سامانه به یک تگ ظریف و فشرده در هدر',
      'اصلاح و بازطراحی کامل صفحه مدیریت پورت‌ها (PortManagementView) جهت سازگاری ۱۰۰٪ با تمامی تم‌های تیره و رنگی (Obsidian, Emerald, Cobalt, Rose, Amber, Light) و حذف پس‌زمینه‌های سفید استاتیک',
      'به‌روزرسانی و هماهنگ‌سازی استایل پوسته فیزیکی سوئیچ (Faceplate) و جدول پورت‌ها با افکت شیشه‌ای spatial-glass'
    ],
    changes_en: [
      'Implemented a unified user profile dropdown menu in header consolidating Team/Organization and Language controls',
      'Removed crowded online and critical device count badges to deliver a clean, minimalist header bar',
      'Significantly reduced header version badge size into a compact, elegant tag',
      'Refactored Port Management view (PortManagementView) to achieve 100% theme compatibility across Obsidian, Emerald, Cobalt, Rose, Amber, and Light palettes',
      'Harmonized switch hardware faceplate visual and ports data table with adaptive spatial-glass styling'
    ]
  },
  {
    version: '1.4.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'طراحی فاوآیکون اختصاصی شبکه و ترجمه کامل انگلیسی صفحات توپولوژی شماتیک، پورت‌ها، اسکنر CDP/LLDP و ادیتور قالب‌ها',
    title_en: 'Network Favicon & Complete English Localization for Schematic Topology, Port Management, CDP/LLDP Scanner & Template Editor',
    changes: [
      'طراحی فاوآیکون مدرن و وکتور مرتبط با شبکه (SVG) و جایگزینی آن در فایل اصلی index.html',
      'ترجمه و بومی‌سازی ۱۰۰٪ صفحه نقشه شماتیک توپولوژی شبکه شامل کارت‌های تجهیز، پورت‌ها، راهنمای نقشه، هدر، سرچ‌باکس و دراور جزئیات',
      'ترجمه کامل انگلیسی مودال ویرایش قالب‌های پیکربندی (Edit Configuration Template) شامل برچسب‌های متغیرها (Display Label) و پلیس‌هولدرها',
      'ترجمه جامع صفحه پایش و مدیریت پورت‌ها (Port Management) شامل طرح فیزیکی پورت‌ها (Faceplate)، فرم ویرایش پورت و جدول پورت‌ها',
      'بومی‌سازی کامل و رفع متون فارسی در اسکنر لایه ۲ همسایگی CDP/LLDP شامل دکمه‌ها، کارت‌های آماری، راهنمای پروتکل و جدول همسایگان'
    ],
    changes_en: [
      'Designed and deployed a modern network-themed SVG favicon replacing default icon in index.html',
      'Complete 100% English translation for Schematic Topology view including node cards, ports, legend, header controls, search, and detail drawer',
      'Localized Edit Configuration Template modal fields, variable display labels, and placeholders in English mode',
      'Comprehensive English localization for Port Management view including physical faceplate layout, port edit form, and inventory table',
      'Full localization of CDP/LLDP Layer-2 Discovery Scanner including scan controls, metrics cards, protocol guide, and neighbor table'
    ]
  },
  {
    version: '1.4.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح ریسپانسیو مودال‌ها در صفحات کوچک و ترجمه کامل متون فارسی به انگلیسی',
    title_en: 'Modal Responsive Viewport Scaling & Complete English Localization for All Modals',
    changes: [
      'حل کامل مشکل بیرون زدن مودال‌ها از صفحه نمایش در مانیتورها و لپ‌تاپ‌های کوچک با ارتفاع داینامیک (max-h-[90vh]) و اسکرول داخلی',
      'ترجمه جامع و کامل ۱۰۰ درصدی تمام متون، پیام‌ها، راهنماها و دکمه‌های فارسی موجود در مودال‌ها در حالت انگلیسی',
      'تثبیت هدر و فوتر مودال‌ها (Pinned Header/Footer) با کانتینر اسکرول‌پذیر میانی برای دسترسی همیشگی به دکمه‌های تایید و بستن',
      'هماهنگ‌سازی و بهبود استایل مودال‌های ثبت تجهیز، کلون‌گیری، اعمال تمپلیت، بازرسی پورت، ترمینال و یادداشت‌های انتشار'
    ],
    changes_en: [
      'Fixed viewport overflow for all modals on small screens with max-h-[90vh] constraints and independent inner scrolling',
      'Complete 100% English translation for all modal dialogs, forms, tooltips, validation messages, and action buttons',
      'Pinned modal headers and action footers ensuring save/cancel controls remain visible and accessible on any screen height',
      'Harmonized visual styling across Add Device, Clone Template, Apply Template, Port Inspector, Terminal, and Release Notes modals'
    ]
  },
  {
    version: '1.4.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'سیستم جامع چندزبانگی (انگلیسی پیش‌فرض و فارسی)، منوی آکاردئونی سایدبار و یکپارچه‌سازی سایز دکمه‌ها',
    title_en: 'Comprehensive i18n System (English Default & Persian), Accordion Sidebar & Button Size Standardization',
    changes: [
      'پیاده‌سازی موتور جامع بین‌المللی‌سازی و چندزبانگی (i18n) با زبان پیش‌فرض انگلیسی (English Default) و زبان دوم فارسی (Persian)',
      'تضمین عدم نمایش هرگونه متن فارسی در حالت انگلیسی با واژه‌نامه کامل دوزبانه برای عناوین، پیام‌ها، دکمه‌ها، فیلترها و راهنماها',
      'سوئیچر زبان تعاملی در هدر (Navbar) با تغییر لحظه‌ای و پیوسته جهت چیدمان (RTL / LTR) و ذخیره‌سازی ماندگار در حافظه مرورگر',
      'بازطراحی ساختار منوی سایدبار به صورت آکاردئونی هوشمند (Accordion Collapsible Groups) با حالت باز پیش‌فرض و رفتار تک‌والد بازشونده',
      'هماهنگ‌سازی و استانداردسازی سایز، پدینگ و تایپوگرافی دکمه‌های اکشن بالای صفحه مدیریت الگوها بر اساس استانداردهای صفحه مدیریت تجهیزات',
      'ثبت قوانین الزامی چندزبانگی، رفتار سایدبار و استانداردهای دکمه‌ها در سند راهنمای سیستمی AGENTS.md'
    ],
    changes_en: [
      'Implemented robust internationalization (i18n) engine with English as default and Persian as secondary language',
      'Strict zero-Persian mandate in English mode with full dual-language dictionary across all views, controls, and alerts',
      'Interactive header language selector with seamless RTL/LTR layout transitions and persistent browser storage',
      'Accordion collapsible sidebar architecture with default-open state and single-parent auto-collapse behavior',
      'Standardized action button dimensions, paddings, and typography across template management and device inventory views',
      'Persistent system rule documentation updated in AGENTS.md'
    ]
  },
  {
    version: '1.3.4',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح مخفی‌سازی هدر در حالت فول و بهبود موقعیت‌یابی و طراحی راهنمای نقشه توپولوژی',
    changes: [
      'مخفی‌سازی کامل هدر اصلی سامانه (شامل نام پورتال، دکمه داده‌های نمونه، پویش سریع، تم و...) در زمان فعال‌سازی حالت فول (Fullscreen Mode)',
      'اصلاح کانتینر اصلی در App.tsx جهت حذف کامل هدر، سایدبار و فوتر از DOM در حالت تمام‌صفحه و پیشگیری از هم‌پوشانی و تداخل لایه‌ها (Stacking Context)',
      'رفع کامل مشکل قرارگیری راهنمای نقشه توپولوژی زیر فوتر و انتقال آن به موقعیت استاندارد، زیبا و ایمن در گوشه پایین چپ نقشه',
      'طراحی جدید راهنمای نقشه به صورت کارت شناور هوشمند با قابلیت باز و بسته شدن (Collapse / Expand) جهت جلوگیری از پوشاندن نودها و پورت‌ها',
      'پشتیبانی هماهنگ و یکپارچه از کلید Esc جهت خروج روان از حالت تمام‌صفحه'
    ]
  },
  {
    version: '1.3.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'حالت تمام‌صفحه نقشه شماتیک (Fullscreen Topology) و معماری اختصاصی و امن Self-Signed SSL',
    changes: [
      'افزودن دکمه شناور اختصاصی حالت تمام‌صفحه در بالا سمت چپ نقشه شماتیک با نمایش عنوان «حالت فول» در هاور و پشتیبانی از کلید میانبر Esc',
      'پوشش کامل و ۱۰۰ درصدی صفحه مرورگر در حالت فول با مخفی‌سازی خودکار هدر، سایدبار، منوهای بالا و فوتر جهت اشراف کامل بر تمام گره‌ها و پیوندهای شبکه',
      'امکان سوئیچ و مخفی‌سازی/نمایش نوار ابزار داخل نقشه در حالت تمام‌صفحه جهت بهره‌برداری حداکثری از فضای ترسیم',
      'اصلاح ساختار اسکریپت‌های راه‌اندازی setup-panel.sh و install.sh و اجباری‌سازی معماری امن انحصاری Strict Self-Signed SSL (HTTPS)',
      'دریافت پورت دلخواه SSL کاربر و حذف کامل لیسنرهای ناامن HTTP (پورت 80 و پورت‌های مستقیم وب و بک‌اند)',
      'ایزوله‌سازی فرانت‌اند و بک‌اند به لوپ‌بک محلی (127.0.0.1) با بازهدایت خودکار خطای 497 (HTTP to HTTPS) در Nginx',
      'اصلاح گزارش نهایی نصب جهت ارائه منحصربه‌فرد آدرس HTTPS امن بدون درج آدرس‌های ناامن دیگر'
    ]
  },
  {
    version: '1.3.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'تثبیت و رفع اسکرول منوی دسترسی سایدبار راست (Sticky Sidebar Navigation)',
    changes: [
      'تثبیت کامل منوی دسترسی سایدبار راست حین اسکرول محتوای صفحات (مانند لیست بلند تجهیزات، داشبورد و مدیریت پورت‌ها)',
      'جداسازی اسکرول محتوای صفحه از سایدبار با ساختار دوگانه کانتینر در App.tsx (افزودن overflow-hidden به ریشه و overflow-y-auto به کانتینر اصلی محتوا)',
      'افزودن موقعیت‌یابی چسبنده (sticky top-14) و ارتفاع کامل به همراه اسکرول‌بار اختصاصی و ظریف (custom-scrollbar) برای منوی سایدبار در صفحات کوچک و بزرگ',
      'بهبود استایل و کنتراست آیتم‌های سایدبار در تم روشن (Light Theme) جهت نمایش شفاف وضعیت انتخاب و هاور'
    ]
  },
  {
    version: '1.3.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'اصلاح کامل رنگ‌بندی مودال‌های استخراج کانفیگ زنده و اعمال تمپلیت در تم روشن (Light Theme Harmonization)',
    changes: [
      'هماهنگ‌سازی کامل استایل و رنگ‌بندی مودال CaptureConfigModal بر اساس الگوی استاندارد CloneTemplateModal',
      'حذف گرادیانت‌های نامناسب آبی-بنفش و پس‌زمینه‌های تیره/خاکستری کدر در تم روشن مودال‌ها',
      'اصلاح کادرهای ورودی (Inputs, Selects, Textareas) با پس‌زمینه سفید خالص (#ffffff)، متون تیره پرکنتراست (#0f172a) و بوردرهای مشخص جهت رفع مشکل ناخوانایی متن سفید روی پس‌زمینه سفید',
      'خوانایی کامل و استایل‌دهی یکپارچه به کارت‌های آپشن‌های هوشمند، سربرگ‌ها، لاگ‌های نشست و فرامین کانفیگ در هر دو تم تاریک و روشن',
      'بهبود استایل و کنتراست مودال اعمال تمپلیت روی تجهیزات (ApplyTemplateModal) در تم لایت',
      'ثبت قانون دائمی استانداردهای استایل مودال‌ها در فایل AGENTS.md جهت پیشگیری از خطاهای آتی در طراحی رابط کاربری'
    ]
  },
  {
    version: '1.3.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'موتور استخراج هوشمند و تبدیل خودکار کانفیگ تجهیز زنده (سیسکو و میکروتیک) به الگوی پارامتریک',
    changes: [
      'افزودن دکمه «استخراج الگو از تجهیز زنده» (Extract Live Config) در بخش مدیریت الگوها و تمپلیت‌ها',
      'پشتیبانی از اتصال مستقیم SSH/Telnet به تجهیزات با دریافت آدرس IP، پورت، یوزرنیم، پسورد و Enable Secret',
      'امکان انتخاب سریع از میان تجهیزات ثبت‌شده شبکه یا ورود دستی مشخصات تجهیز جدید',
      'موتور پارامتریک‌سازی خودکار (Auto-Parameterize) جهت تبدیل نام تجهیز، IP مدیریتی، سابنت، گیت‌وی و DNS به متغیرهای پویا',
      'پاکسازی و امن‌سازی اطلاعات حساس (Sanitize Secrets) و ماسک کردن رمزهای عبور، هش‌ها و SNMP Community Strings',
      'پشتیبانی تخصصی از دستورات فشرده میکروتیک (/export compact) و دستورات Cisco IOS/IOS-XE (show running-config)',
      'مودال دو مرحله‌ای پیشرفته برای استخراج، پیش‌نمایش کانفیگ خام، ویرایش متغیرها و نام‌گذاری تمپلیت',
      'امکان ذخیره مستقیم در لیست الگوها و اعمال آنی بر روی سایر تجهیزات شبکه'
    ]
  },
  {
    version: '1.2.3',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'بهبود تفکیک جداول تجهیزات، منوی عملیات ۳ نقطه و هماهنگ‌سازی رنگ‌بندی صفحه الگوها با داشبورد',
    changes: [
      'افزودن خطوط جداکننده عمودی بین سرستون‌های جدول تجهیزات (Header Dividers) برای خوانایی کامل عناوین',
      'افزودن خطوط جداکننده و استایل تفکیک ردیف‌های تجهیزات (Row Separators & Alternating Bands) در تم روشن و تاریک',
      'جایگزینی دکمه‌های کانکت، تمپلیت و حذف با منوی دراپ‌داون سه نقطه (3-Dots Actions Menu) حرفه‌ای و مرتب',
      'اصلاح ساختار و رنگ‌بندی کامل صفحه الگوها و تمپلیت‌ها (Template Management) با کارت‌های spatial-glass، شبیه داشبورد',
      'کنتراست استاندارد و وضوح کارت‌های KPI، تولبار فیلترها و کادر مشاهده کامندهای CLI در هر دو تم تاریک و روشن'
    ]
  },
  {
    version: '1.2.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'هماهنگ‌سازی و اصلاح استایل بج Cisco IOS-XE و کادرهای مودال در تم روشن (Light Theme Harmonization)',
    changes: [
      'ایجاد کلاس اختصاصی و بهینه‌سازی شده vendor-badge-cisco و vendor-badge-mikrotik با کنتراست استاندارد و وضوح عالی در تم روشن و تاریک',
      'اصلاح رنگ و پس‌زمینه بج Cisco IOS-XE در سربرگ مودال اعمال تعاملی تمپلیت (Apply Template Modal)',
      'هماهنگ‌سازی استایل بج و تگ‌های سیسکو در تمامی مودال‌ها (کلون‌گیری، ویرایشگر تمپلیت، ترمینال و بازرسی پورت)',
      'اصلاح پس‌زمینه کادر مودال‌ها، فیلدهای ورودی و سلکت‌باکس‌ها در تم روشن جهت یکپارچگی بصری کامل',
      'حفظ خوانایی کنتراست بالای خروجی‌ها و بلوک‌های کد ترمینال در کلیه حالت‌های تم',
    ]
  },
  {
    version: '1.2.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'امکان کلون‌گیری و انشعاب از تمپلیت‌ها با نام جدید و ویرایش جزیی دستورات (Template Cloning)',
    changes: [
      'افزودن پنجره اختصاصی کلون‌گیری (Clone Template Modal) با امکان تعیین نام جدید دلخواه برای تجهیز جدید',
      'امکان شخصی‌سازی و اعمال تغییرات جزیی در خطوط فرامین CLI مبدا بدون تغییر تمپلیت اصلی',
      'امکان تغییر مقادیر پیش‌فرض متغیرها (آدرس IP، سابنت، ویلن و...) متناسب با تجهیز جدید',
      'دکمه‌های دسترسی سریع کلون بر روی سربرگ و پاورقی تمامی کارت‌های تمپلیت',
      'امکان ذخیره به عنوان کلون با نام جدید مستقیماً از داخل ویرایشگر تمپلیت (Save as Clone)',
    ]
  },
  {
    version: '1.2.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'اضافه شدن سیستم مدیریت الگوها و تمپلیت‌های کانفیگ تجهیزات شبکه (Template System)',
    changes: [
      'صفحه اختصاصی مدیریت و تعریف الگوهای کانفیگ (Template Management View) با فیلتر سیسکو و میکروتیک',
      'پشتیبانی از الگوهای استاندارد برای سوئیچ‌ها و روترهای سیسکو (IOS-XE) و میکروتیک (RouterOS)',
      'سیستم متغیرهای پویا (Template Variables) با تشخیص خودکار متغیرهای {{VAR}} در متن دستورات',
      'تایید تعاملی مقادیر و آدرس‌های IP و پیش‌فرض‌ها قبل از اجرا بر روی تجهیز',
      'انتخاب تمپلیت در فرم معرفی تجهیز جدید (Add Device) و شروع بلافاصله فرآیند اعمال کانفیگ',
      'امکان اعمال تمپلیت به طور مستقیم بر روی هر تجهیز از جدول موجودی تجهیزات شبکه',
      'موتور هوشمند اجرای دستورات در مدهای استاندارد خط فرمان با لاگ زنده شبیه‌سازی شده ترمینال و ثبت در دیتابیس',
    ],
  },
  {
    version: '1.1.2',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'رفع مشکل پنهان شدن و برش تجهیزات در هنگام جابجایی در حالت زوم اوت',
    changes: [
      'حذف کادر و محدوده برش SVG (Unbounded Canvas) و انتقال ترنسفورم به لایه گروه بی‌نهایت',
      'نمایش کامل و بدون محدودیت تجهیزات در هنگام درگ به تمام جهات (بالا، پایین، چپ و راست)',
      'افزایش دامنه زوم تا ۰.۲X و بهینه‌سازی حرکت شبکه‌بندی پس‌زمینه همراه با جابجایی دید',
      'رفع خطای برش ForeignObject در نودهای دارای برچسب و سایه عمیق',
    ],
  },
  {
    version: '1.1.1',
    releaseDate: '2026-09-08',
    type: 'patch',
    title: 'رفع خطای کلید در فیلتر ساختمان‌های نقشه شماتیک',
    changes: [
      'اصلاح ساختار کلیدهای منحصربه‌فرد (unique key prop) در لیست ساختمان‌های فیلتر نقشه شماتیک',
      'پشتیبانی جامع و ایمن از ساختار آرایه‌ای داده‌های ساختمان‌های ارسال شده از سرور',
    ],
  },
  {
    version: '1.1.0',
    releaseDate: '2026-09-08',
    type: 'minor',
    title: 'ارتقای تعاملی نقشه شماتیک و بهینه‌سازی رابط کاربری',
    changes: [
      'قابلیت درگ و دراپ (Drag & Drop) برای جابجایی آزادانه تمامی تجهیزات در نقشه شماتیک',
      'بزرگنمایی و کوچکنمایی نرم نقشه با اسکرول موس (Mouse Wheel Zoom In / Out)',
      'ذخیره‌سازی خودکار و ماندگار موقعیت نودها، سطح بزرگنمایی و موقعیت دید در مرورگر',
      'حذف برچسب‌های متنی اضافه در سایدبار و رفع تداخل ظاهری آن‌ها با عناوین',
      'قابلیت جمع‌شوندگی و بازشوندگی سایدبار (Collapsible Sidebar) برای مشاهده وسیع‌تر نقشه',
      'افزودن سیستم مدیریت نسخه و تاریخچه تغییرات (Release Notes & Versioning)',
    ],
  },
  {
    version: '1.0.0',
    releaseDate: '2026-09-08',
    type: 'major',
    title: 'انتشار نسخه پایه سامانه مانیتورینگ و توپولوژی شبکه NetTopology',
    changes: [
      'داشبورد پایش لحظه‌ای پینگ و تأخیر تجهیزات شبکه',
      'نمایش شماتیک سلسله‌مراتبی سوئیچ‌های Core، Distribution، Access و روترها',
      'محیط شماتیک ساختمانی با تفکیک فیزیکی طبقات و واحدها',
      'موتور کشف همسایگی‌های شبکه سیسکو با پروتکل‌های CDP و LLDP',
      'مدیریت و نظارت دقیق پورت‌ها، ترانک‌ها و ویلن‌ها (VLANs)',
      'کنسول ترمینال شبیه‌ساز سیسکو (CLI Terminal)',
      'موتور تم‌های بصری فضایی و دارک‌مود پیشرفته',
    ],
  },
];
