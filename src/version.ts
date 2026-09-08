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

export const APP_VERSION = '1.4.3';

export const RELEASE_HISTORY: ReleaseNote[] = [
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
