# AI Agent Instructions & Repository Rules 🤖

این فایل حاوی قوانین اجباری برای تمامی مدل‌ها، ربات‌ها و دستیارهای هوش مصنوعی (AI Coding Agents نظیر Google AI Studio, Gemini, Claude, Cursor, GitHub Copilot, Copilot Workspace, Roo Code, Windsurf) است که روی این مخزن کار می‌کنند.

This file defines mandatory operational directives for all AI models, coding agents, and automated development tools working on this codebase.

---

## ۱. اصل الزام به‌روزرسانی مداوم فایل README.md (اجباری / MANDATORY)

> 🔴 **دستور حیاتی برای هوش مصنوعی:**
> **هر هوش مصنوعی که هرگونه تغییر، قابلیت جدید، کامپوننت، ابزار، اندپوینت، یا بازطراحی به این پروژه اضافه می‌کند، موظف است بلافاصله پس از پیاده‌سازی کد، فایل `README.md` را بر اساس امکانات و قابلیت‌های جدید آپدیت کند.**
> - آپدیت باید در **هر دو بخش فارسی و انگلیسی** فایل `README.md` ثبت شود.
> - توضیحات ویژگی جدید باید دقیق، خوانا و با ذکر جزئیات عملکردی باشد.

> 🔴 **CRITICAL DIRECTIVE FOR ALL AI AGENTS:**
> **Any AI assistant or agent that introduces changes, new features, UI components, tools, endpoints, or architectural enhancements to this project MUST update `README.md` immediately to reflect the new functionality.**
> - Updates **MUST** be added to both the **Persian (فارسی)** and **English** sections.
> - Documentation must describe what was added, how it operates, and any user-facing benefits.

---

## ۲. گردش کار خودکار گیت (Git Auto-Commit & Push)

- **کامیت و پوش خودکار:** پس از اتمام اعمال تغییرات درخواستی کاربر و به‌روزرسانی مستندات، هوش مصنوعی باید تغییرات را با یک کامیت‌مسیج توصیفی به زبان فارسی/انگلیسی کامیت کرده و بلافاصله به برنچ `master` گیت‌هاب پوش کند (`git push origin master`).
- **مخزن هدف:** ریموت `origin` روی مخزن `shahbazimasoud/NetTopology` تنظیم شده است.

---

## ۳. اصول طراحی و ساختار کد (Design & Code Standards)

1. **مدال‌ها و پنجره‌های پاپ‌آپ (Modal Backdrops):**
   - تمام پنجره‌های پاپ‌آپ و مودال‌های سیستم باید دارای بک‌دراپ تار و شیشه‌ای تیره باشند (`.modal-backdrop-blur` با مشخصه `data-modal-backdrop="true"`). هیچ مودالی نباید پشت‌زمینه بدون بلور یا تک‌رنگ مات متضاد داشته باشد.
2. **کنتراست بالا در تم روشن (Light Theme Contrast):**
   - تمامی دکمه‌ها، برچسب‌ها، تگ‌های VLAN، پنجره ترمینال سیسکو و کلیدهای امنیتی پورت (Port Security) باید در هر دو تم روشن و تاریک دارای کنتراست کامل، پس‌زمینه مشخص و عدم تداخل رنگی باشند.
3. **نمایش بصری پورت‌های شبکه:**
   - پورت‌های سوئیچ‌ها باید همواره از کامپوننت وکتور پورت RJ-45 (`NetworkPortSvg`) استفاده نمایند.
4. **شبیه‌سازی کامل خط فرمان سیسکو (Cisco CLI):**
   - حفظ ساختار چندمرحله‌ای (User, Privileged, Global Config, Interface Config, VLAN Config)، پشتیبانی از تاریخچه دستورات، سایدبار راهنمای دستورات و کلید مستقیم Write Memory برای پایداری در NVRAM.

---

*این فایل توسط همه ابزارهای هوش مصنوعی معتبر به عنوان راهنمای سیستمی (System Prompt / Instructions) شناسایی می‌شود.*
