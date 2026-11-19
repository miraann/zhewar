# clickgroup.site homepage slides — Zhewar barber booking system

Upload at https://www.clickgroup.site/admin/slides → **Add Slide**, one per block below.
Images are in `out/`. Check how each one looks first in `out/preview/` (desktop + mobile).

| Admin field | Which file |
|---|---|
| Background Image | `out/NN-*-background.jpg` |
| Character / Product Image | `out/NN-*-character.webp` (transparent) |

The website has no barber product in the "Our Systems" section yet, so every button links to `#contact`.

With the 6 restaurant slides, that's 10 in total. Keep 4–6 **Live** at a time, e.g. 3 restaurant + 3 barber, and rotate the rest.

---

## 01 · Overview
- Background: `01-overview-background.jpg` · Character: `01-overview-character.webp`
- Background Theme: **Deep Blue**
- Title EN: `Smart Barber Booking`
- Title KU: `سیستەمی زیرەکی تۆمارکردنی کات بۆ سەرتاشخانە`
- Subtitle EN: `Customers book online in seconds, verify with a face scan, and the barber approves from an Android app.`
- Subtitle KU: `کڕیار لە چەند چرکەیەکدا کات تۆمار دەکات، بە سکانی ڕووخسار دڵنیا دەکرێتەوە و سەرتاش لە ئەپی ئەندرۆیدەوە پەسەندی دەکات`
- CTA: `داواکردنی تاقیکاری` / `Request Demo` → `#contact`

## 02 · Face scan
- Background: `02-face-scan-background.jpg` · Character: `02-face-scan-character.webp`
- Background Theme: **Forest Dark**
- Title EN: `Face Scan Verification`
- Title KU: `سکانی ڕووخسار — ڕێگری لە تۆمارکردنی ساختە`
- Subtitle EN: `Live face detection with blink check and auto-capture — no fake bookings, and the barber knows who is coming.`
- Subtitle KU: `ناسینی ڕووخسار بە چاوتروکاندن و وێنەگرتنی خۆکار — بێ تۆمارکردنی ساختە، سەرتاش دەزانێت کێ سەردانی دەکات`
- CTA: `پەیوەندیمان پێوە بکە` / `Get in Touch` → `#contact`

## 03 · Booking
- Background: `03-booking-background.jpg` · Character: `03-booking-character.webp`
- Background Theme: **Crimson**
- Title EN: `Booking in Two Steps`
- Title KU: `کاتی سەردانیکردنەکەت لە چەند چرکەیەکدا تۆمار بکە`
- Subtitle EN: `Pick a day and a free time slot, confirm, and get a digital ticket — no app download needed.`
- Subtitle KU: `ڕۆژ و کاتێکی بەردەست هەڵدەبژێرێت، پەسەندی دەکات و پسوولەیەکی دیجیتاڵی وەردەگرێت — بێ دابەزاندنی هیچ ئەپێک`
- CTA: `پەیوەندیمان پێوە بکە` / `Get in Touch` → `#contact`

## 04 · Barber's Android app
- Background: `04-barber-app-background.jpg` · Character: `04-barber-app-character.webp`
- Background Theme: **Midnight**
- Title EN: `Barber's Android App`
- Title KU: `ئەپی ئەندرۆید بۆ سەرتاش — پەسەندکردن بە یەک کلیک`
- Subtitle EN: `Instant push notifications for new bookings — approve, cancel and manage working hours from your phone.`
- Subtitle KU: `ئاگادارکردنەوەی ڕاستەوخۆ بۆ هەر داواکارییەکی نوێ — پەسەندکردن، هەڵوەشاندن و بەڕێوەبردنی خشتەی کار لە مۆبایلەکەتەوە`
- CTA: `داواکردنی تاقیکاری` / `Request Demo` → `#contact`

---

## What's in the images
- The screens are copied from the real app and its promo video (`../video-src/promo.html`): home page, face-scan camera with the 68-point landmark mesh, registration form, day/time picker, booking ticket, and the admin panel.
- They show the real shop name, logo and `zhewar.shop`. To show a neutral sample shop instead, change `SHOP`, `LOGO` and `URL` at the top of the script in `slides.html` and re-render.
- The customer is a cartoon, and the customer names and phone numbers are made up.

## Editing / re-rendering
1. Edit `slides.html`. The compositions are in `COMP`, the backgrounds in `BG`.
2. Run `node render.js` from this folder. It writes `out/` and `out/preview/`.
   This project has no Playwright/sharp of its own, so `render.js` borrows them from `F:\clickgroupsystem`.
3. Open `preview.html?i=0` … `?i=3` in a browser to check a slide live.

The design rules (why square, why bottom-weighted, why no text in the image, why the middle title word matters) are in
`F:\clickgroupsystem\marketing\website-slides\SLIDES.md`.
