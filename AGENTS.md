# Project Rules & Persistent AI Instructions 🤖

این فایل به صورت خودکار در حافظه سیستمی هوش مصنوعی بارگذاری می‌شود و تمام قوانین آن قطعی و لازم‌الاجرا است.

---

## 1. README.md Continuous Maintenance Rule (Mandatory / اجباری)
- **قانون دائمی به‌روزرسانی README**: هر هوش مصنوعی (AI Agent) که روی این پروژه کار می‌کند و قابلیت، ماژول، تغییر ظاهری یا کامپوننت جدیدی اضافه یا ویرایش می‌کند، **موظف است فایل `README.md` را بر اساس امکانات و قابلیت‌های جدید آپدیت کند**.
- به‌روزرسانی باید هم در بخش **فارسی (Persian)** و هم در بخش **انگلیسی (English)** فایل `README.md` اعمال شود.

## 2. Git Workflow (Auto-Commit and Push)
- **Auto-Commit and Push**: Whenever changes or updates are made to the codebase in response to user requests, automatically commit the changes with a clear, descriptive Persian/English commit message and push to the `master` branch on GitHub (`git push origin master`).
- Remote origin is configured with user GitHub PAT on repository `shahbazimasoud/NetTopology`.

## 3. UI/UX Standards
- **Modal Backdrops**: All modals must use `.modal-backdrop-blur` with `data-modal-backdrop="true"` for a dark blurred glassmorphism backdrop.
- **Port Visualization**: Switch faceplates must use the dedicated RJ-45 vector component (`NetworkPortSvg`).
- **High-Contrast Light Theme**: All buttons, terminal components, and badges must maintain pristine readability and high contrast in light mode.

## 4. Semantic Versioning on Every Change (Mandatory / اجباری - نسخه‌گذاری دائمی)
- **قانون الزامی ثبت نسخه (Versioning)**: بعد از هر تغییر، رفع باگ، اصلاح اسکریپت یا اضافه شدن قابلیت، هوش مصنوعی **موظف است نسخه پروژه (Version) را به‌روزرسانی و ثبت کند** (بر اساس سیستم نسخه‌بندی سمانتیک `MAJOR.MINOR.PATCH`).
- نسخه جدید باید در تمام بخش‌های زیر ارتقا یابد:
  1. فایل `package.json` (فیلد `"version"`)
  2. متغیر `PANEL_VERSION` در اسکریپت‌های نصب (`setup-panel.sh` و `install.sh`)
  3. فایل `README.md` (در بخش Badge و سربرگ نسخه فارسی و انگلیسی)
  4. متن کامیت گیت (ذکر برچسب نسخه مثلاً `v1.1.0`)

