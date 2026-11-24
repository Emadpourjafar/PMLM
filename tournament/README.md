# راه‌اندازی تورنومنت

## ۱) Firebase (رایگان)
1. در console.firebase.google.com یک پروژه بسازید.
2. Build > Firestore Database > Create database (حالت production).
3. Build > Authentication > Sign-in method > فعال‌کردن Email/Password.
4. Authentication > Users > Add user:
   - Email: `USERNAME@tournament.local` (به‌جای USERNAME نام کاربری دلخواه، حروف کوچک انگلیسی)
   - Password: رمز دلخواه (حداقل ۶ کاراکتر)
   → کپی‌کردن UID این کاربر.
5. Project settings > Your apps > Web (</>) را بسازید و مقادیر را در `firebase-config.js` بگذارید.
6. Firestore > Rules را با این جایگزین و Publish کنید (UID_ADMIN = همان UID مرحله ۴):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tournaments/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "UID_ADMIN";
    }
  }
}
```
7. Authentication > Settings > Authorized domains: دامنه‌ی GitHub Pages خود را اضافه کنید.

## ۲) GitHub
پوشه‌ی `tournament` را کنار فایل‌های سایت فعلی در همان ریپو کپی و commit کنید.
- کلاینت: `https://دامنه-شما/tournament/`
- مدیر: `https://دامنه-شما/tournament/admin/`

## ۳) خروجی PDF
در صفحه‌ی مدیر روی «خروجی PDF» بزنید و در پنجره‌ی چاپ، مقصد را «Save as PDF» بگذارید.
