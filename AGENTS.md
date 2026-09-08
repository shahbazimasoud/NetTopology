# Project Rules & Persistent AI Instructions 🤖

این فایل به صورت خودکار در حافظه سیستمی هوش مصنوعی بارگذاری می‌شود و تمام قوانین آن قطعی و لازم‌الاجرا است.

---

## 1. README.md Continuous Maintenance Rule (Mandatory / اجباری)
- **قانون دائمی به‌روزرسانی README**: هر هوش مصنوعی (AI Agent) که روی این پروژه کار می‌کند و قابلیت، ماژول، تغییر ظاهری یا کامپوننت جدیدی اضافه یا ویرایش می‌کند، **موظف است فایل `README.md` را بر اساس امکانات و قابلیت‌های جدید آپدیت کند**.
- به‌روزرسانی باید هم در بخش **فارسی (Persian)** و هم در بخش **انگلیسی (English)** فایل `README.md` اعمال شود.

## 2. Git Workflow (Auto-Commit and Push)
- **Auto-Commit and Push**: Whenever changes or updates are made to the codebase in response to user requests, automatically commit the changes with a clear, descriptive Persian/English commit message and push to the `master` branch on GitHub (`git push origin master`).
- Remote origin is configured with user GitHub PAT on repository `shahbazimasoud/NetTopology`.

## 3. UI/UX Standards & Consistency
- **Modal Backdrops**: All modals must use `.modal-backdrop-blur` with `data-modal-backdrop="true"` for a dark blurred glassmorphism backdrop.
- **Light Theme Modal Harmonization (Mandatory / اجباری)**:
  - All modals must match the clean styling standard of `CloneTemplateModal`.
  - **No Gray / Low-Contrast Backgrounds in Light Mode**: Modal containers must have a clean white background (`#ffffff`), subtle borders (`#e2e8f0`), and soft natural shadows.
  - **No Saturated Blue-Purple Gradients in Headers**: Avoid heavy blue-purple gradients in modal headers and body cards. Headers in light mode must use clean neutral surfaces (`#f8fafc`).
  - **No Low-Contrast Input Fields**: Never allow white text on light backgrounds or low-contrast gray text boxes. All inputs, textareas, and select elements in light mode must feature crisp white backgrounds (`#ffffff`), dark slate text (`#0f172a`), defined borders (`#cbd5e1`), and vibrant focus rings.
  - **Terminal and Code View Readability**: Code blocks, CLI outputs, and SSH/Telnet terminal sessions must always maintain high-contrast dark backgrounds (`#0f172a`) with bright emerald/cyan text or clear syntax coloring across both light and dark modes.
- **Port Visualization**: Switch faceplates must use the dedicated RJ-45 vector component (`NetworkPortSvg`).
- **High-Contrast Light Theme**: All buttons, terminal components, and badges must maintain pristine readability and high contrast in light mode.

## 4. Semantic Versioning on Every Change (Mandatory / اجباری - نسخه‌گذاری دائمی)
- **قانون الزامی ثبت نسخه (Versioning)**: بعد از هر تغییر، رفع باگ، اصلاح اسکریپت یا اضافه شدن قابلیت، هوش مصنوعی **موظف است نسخه پروژه (Version) را به‌روزرسانی و ثبت کند** (بر اساس سیستم نسخه‌بندی سمانتیک `MAJOR.MINOR.PATCH`).
- نسخه جدید باید در تمام بخش‌های زیر ارتقا یابد:
  1. فایل `src/version.ts`
  2. فایل `package.json` (فیلد `"version"`)
  3. متغیر `PANEL_VERSION` در اسکریپت‌های نصب (`setup-panel.sh` و `install.sh`)
  4. فایل `README.md` (در بخش Badge و سربرگ نسخه فارسی و انگلیسی)
  5. متن کامیت گیت (ذکر برچسب نسخه مثلاً `v1.2.0`)

## 5. Multi-language (i18n) Support & Zero Persian in English Mode (Mandatory / اجباری)
- **قانون چندزبانگی و پیش‌فرض انگلیسی**:
  - تمام صفحات، ماژول‌ها، مودال‌ها، پیام‌ها، راهنماها، دکمه‌ها و جداول **باید از هر دو زبان انگلیسی (English) و فارسی (Persian) پشتیبانی کنند**.
  - **زبان پیش‌فرض برنامه همیشه انگلیسی (English) است** (`language: 'en'`).
  - **ممنوعیت کامل زبان فارسی در حالت انگلیسی**: در حالت انگلیسی، هیچ کلمه یا متن فارسی نباید در هیچ کجای برنامه (دکمه‌ها، عنوان‌ها، پیام‌ها، توابع، تولتیپ‌ها، فیلترها و جدول‌ها) نمایش داده شود.
  - تعویض زبان باید به سادگی و از طریق سوئیچر زبان موجود در هدر (Navbar) با آیکون کره زمین (`Globe`) انجام شود و حالت راست‌به‌چپ (`dir="rtl"`) یا چپ‌به‌راست (`dir="ltr"`) را به صورت زنده و داینامیک تنظیم کند.
  - رشته‌های متنی جدید باید در فایل `src/i18n/translations.ts` برای هر دو زبان ثبت و با هوک `useLanguage()` فراخوانی شوند.

## 6. Sidebar Accordion Navigation Architecture
- **معماری منوی سایدبار**:
  - منوی سایدبار دارای گروه‌های والد (Parent) با برچسب‌های تفکیک‌شده و زیرمنوهای فرزند (Child) است.
  - هر والد به صورت کارت تعاملی جمع‌شونده (Accordion) پیاده‌سازی شده و آیکون باز/بسته دارد.
  - **حالت پیش‌فرض باز است (Default Open)**: در ورود اولیه گروه والد اول باز است.
  - **رفتار آکاردئونی یکتای باز**: با کلیک روی هر والد، فرزندان آن نمایش داده می‌شوند و سایر والدهای دارای فرزند به صورت خودکار بسته می‌شوند.

## 7. Action Button Size Harmonization
- **هماهنگی سایز دکمه‌ها**: سایز و پدینگ تمام دکمه‌های اکشن بالای صفحات (از جمله صفحه مدیریت تمپلیت‌ها و الگوها) باید دقیقاً با استانداردهای صفحه «موجودی و مدیریت تجهیزات شبکه» (`px-3.5 py-1.5 rounded-xl text-xs font-medium gap-1.5`) هماهنگ باشد تا یکپارچگی بصری کامل حاصل شود.
