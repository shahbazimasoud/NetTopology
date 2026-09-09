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

export const APP_VERSION = '1.9.0';

export const RELEASE_HISTORY: ReleaseNote[] = [
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
