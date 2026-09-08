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
  1. فایل `package.json` (فیلد `"version"`)
  2. متغیر `PANEL_VERSION` در اسکریپت‌های نصب (`setup-panel.sh` و `install.sh`)
  3. فایل `README.md` (در بخش Badge و سربرگ نسخه فارسی و انگلیسی)
  4. متن کامیت گیت (ذکر برچسب نسخه مثلاً `v1.1.0`)

