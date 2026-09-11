# AI Coding Agent Directives & Mandatory Rules (قوانین و دستورالعمل‌های اجباری هوش مصنوعی)

> [!CRITICAL]
> **قانون قطعی و اجباری تغییر و ارتقای نسخه در هر تغییر (MANDATORY VERSION BUMPING RULE)**
> **هر هوش مصنوعی یا توسعه‌دهنده‌ای که در این پروژه تغییری ایجاد می‌کند، موظف است نسخه برنامه (Version) را بر اساس اندازه و نوع تغییر ارتقا دهد.**
> 
> Any AI agent or developer making ANY change in this codebase MUST increment the application version based on the size and type of the change before committing and completing the task.

---

## 1. قوانین تعیین شماره نسخه (Semantic Versioning Rules)

شماره نسخه پروژه از استاندارد `MAJOR.MINOR.PATCH` پیروی می‌کند:

1. **PATCH (`x.y.Z + 1`) - تغییرات کوچک و رفع باگ (Bugfixes & Minor Tweaks)**:
   - رفع باگ‌ها و مشکلات عملکردی جزئی (Bug fixes)
   - بهبودهای استایل، رنگ‌بندی، تایپوگرافی یا فاصله‌ها (CSS/UI styling adjustments)
   - رفع خطاهای تایپی و ترجمه (Typo & localization fixes)
   - *مثال*: ارتقا از `1.16.0` به `1.16.1`

2. **MINOR (`x.Y + 1.0`) - قابلیت‌ها و فیچرهای جدید (New Features & Modules)**:
   - افزودن فیچر، کامپوننت، ویو یا مدال جدید (New feature / component / modal)
   - افزودن پروتکل یا درایورهای جدید (مانند پروتکل‌های جدید VPN، ماژول‌های تجهیزات)
   - توسعه و ارتقای چشمگیر در منطق کاری یا ابزارهای نرم‌افزار
   - ریست شدن بخش PATCH به صفر (مانند `1.16.x` به `1.17.0`)
   - *مثال*: ارتقا از `1.16.4` به `1.17.0`

3. **MAJOR (`X + 1.0.0`) - تغییرات ساختاری بنیادین و بازنویسی اساسی (Breaking Changes)**:
   - بازنویسی کامل معماری نرم‌افزار یا بخش اعظمی از سیستم
   - تغییرات ساختاری که با نسخه‌های پیشین ناسازگار است
   - ریست شدن بخش‌های MINOR و PATCH به صفر
   - *مثال*: ارتقا از `1.x.x` به `2.0.0`

---

## 2. فایل‌هایی که در هر ارتقای نسخه باید همگام‌سازی شوند (Mandatory Files to Update)

هنگام اعمال هر تغییر، دو فایل زیر **حتماً و بدون استثنا** باید همگام شوند:

### الف) فایل `/package.json`:
فیلد `"version"` باید به شماره نسخه جدید به‌روزرسانی شود:
```json
{
  "name": "nettopology",
  "version": "1.16.0",
  ...
}
```

### ب) فایل `/src/version.ts`:
1. مقدار ثابت `APP_VERSION` تغییر یابد:
   ```typescript
   export const APP_VERSION = '1.16.0';
   ```
2. یک آبجکت جدید از نوع `ReleaseNote` در ابتدای آرایه `RELEASE_HISTORY` ثبت شود شامل:
   - `version`: شماره نسخه جدید (مطابق با `package.json`)
   - `releaseDate`: تاریخ انتشار به فرمت `YYYY-MM-DD`
   - `type`: یکی از مقادیر `'major' | 'minor' | 'patch'`
   - `title`: عنوان تغییر به زبان فارسی
   - `title_en`: عنوان تغییر به زبان انگلیسی
   - `changes`: لیست تغییرات و جزئیات اعمال شده به زبان فارسی
   - `changes_en`: لیست تغییرات و جزئیات اعمال شده به زبان انگلیسی

---

## 3. چک‌لیست اعتبارسنجی قبل از کامیت (Pre-Commit Validation)
قبل از ارسال کامیت و پوش:
1. اجرای `tsc --noEmit` یا `npm run lint` جهت اطمینان از صحت انواع و عدم خطای تایپ اسکریپت
2. ساخت پروژه بدون خطا (`npm run build`)
3. درج شماره نسخه یا تگ متعارف در پیام کامیت، برای مثال:
   `feat(vpn): add full mikrotik vpn suite (v1.16.0)`
   یا
   `fix(sidebar): resolve child accordion collapse (v1.16.1)`
