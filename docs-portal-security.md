# بوابة العملاء — الإعداد

## الرابط الموحّد
`https://موقعك/portal` — نفس الرابط لكل العملاء.

## متغيرات البيئة (Vercel → Settings → Environment Variables)

### البريد الإلكتروني (إلزامي) — Resend
1. سجّل في https://resend.com (مجاني حتى 3,000 رسالة/شهر)
2. أضف نطاقك وتحقق منه (أو استخدم onboarding@resend.dev للتجربة)
3. أنشئ API Key

```
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM="مكتب المحاماة <no-reply@yourdomain.com>"
```

### الرسائل النصية (اختياري)
**Unifonic (السعودية):**
```
SMS_PROVIDER=unifonic
UNIFONIC_APP_SID=xxxx
UNIFONIC_SENDER_ID=OFFICE
```
**أو Twilio:**
```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM=+1xxxxxxxxxx
```

### قناة التحقق الافتراضية
```
PORTAL_OTP_CHANNEL=auto   # auto = SMS إن توفر وإلا البريد | email | sms
```

## كيف يعمل
- **التفعيل**: العميل يدخل بريده المسجّل لديكم → رمز 6 أرقام (10 دقائق) → يعيّن كلمة مرور.
- **الدخول**: بريد + كلمة مرور → رمز تحقق → جلسة 30 يوم.
- **الحماية**: قفل 15 دقيقة بعد 5 محاولات، 3 طلبات رمز كل 15 دقيقة، 5 محاولات لكل رمز، سجل كامل بملف العميل، تعطيل فوري لأي عميل.
- **الروابط القديمة** `/portal/[token]` لا تعمل بدون جلسة دخول صالحة.
