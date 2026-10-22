# Juice Menu — juice-menu-faisel-st (independent deployment)

> **This copy is configured for its own, separate Supabase project (`juice-menu-faisel-st`).**
> Setup, migrations, verification and hand-over notes are in [`documentation/`](documentation/README.md) —
> start with `documentation/SETUP.md`. The Arabic notes below describe the application itself; where
> they mention `schema.sql` / `catalog.sql` / `VITE_SUPABASE_ANON_KEY`, use the versioned migrations in
> `supabase/migrations/`, `supabase/seed/optional_catalog_seed.sql` and `VITE_SUPABASE_PUBLISHABLE_KEY` instead.

# City Drink Alharam — المنيو الرقمي + نظام الطلبات

منيو رقمي (mobile-first) لفرع **City Drink Alharam**، مبني على React + TypeScript
+ Vite + Tailwind، مع نظام طلبات كامل (سلة، إرسال الطلب، QR، لوحة باريستا)
مبني على **Supabase**. بيانات المنتجات والأسعار مصدرها الوحيد `src/data/menu.ts`
— هذا الملف لم يتغيّر في هذا التحديث ولا يجب تعديل أسعاره إلا يدويًا وبعد المراجعة.

 > تم تجهيز الاتصال المحلي بمشروع Supabase عبر `.env` المحلي، لكن وجود ملفات SQL
 > في المشروع لا يعني أنها نُفذت في قاعدة البيانات. نفّذ خطوات Supabase أدناه
 > قبل اختبار إرسال الطلبات.

## التقنيات المستخدمة

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- Tailwind CSS
- [react-router-dom](https://reactrouter.com/) — المسارات `/`, `/order/:token`, `/barista`, `/barista/login`
- [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) — قاعدة البيانات، RLS، Auth، Realtime
- [qrcode.react](https://www.npmjs.com/package/qrcode.react) — توليد كود QR
- [lucide-react](https://lucide.dev/) للأيقونات

## التشغيل محليًا

يتطلب Node.js 18 أو أحدث.

```bash
npm install
cp .env.example .env   # ثم املأ القيم من مشروع Supabase الخاص بك (انظر أدناه)
npm run dev
```

بدون إعداد Supabase، صفحة المنيو (`/`) تعمل بالكامل (تصفح، بحث، سلة محلية)،
لكن تأكيد الطلب وصفحة `/order/:token` ولوحة `/barista` ستعرض رسالة توضح أن
قاعدة البيانات غير مفعّلة بدلًا من التعطل.

## البناء للإنتاج

```bash
npm run build      # tsc -b && vite build
npm run preview    # معاينة الناتج محليًا
```

## إعداد Supabase

1. افتح مشروع Supabase المرتبط بالتطبيق على [supabase.com](https://supabase.com).
2. من **SQL Editor** شغّل الملفات بهذا الترتيب، كل ملف كاملًا:
   1. ملفات `supabase/migrations/*.sql` بالترتيب (أو `supabase db push` على المشروع الجديد فقط).
   2. اختياريًا `supabase/seed/optional_catalog_seed.sql` لملء `menu_catalog` من `src/data/menu.ts`.
   ملف الكتالوج يستخدم `ON CONFLICT DO NOTHING` ولا يستبدل أسعارًا عدّلتها.
3. من **Project Settings → API**، استخدم:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `Publishable key` → `VITE_SUPABASE_PUBLISHABLE_KEY` (أو `anon` القديم → `VITE_SUPABASE_ANON_KEY`)
  ضعهما في ملف `.env` (لا تستخدم `service_role` key في الواجهة الأمامية إطلاقًا).
  القيمة المحلية الموجودة في `.env` ليست جزءًا من الحزمة ولا يجب إضافتها إلى git.
4. من **Authentication → Users**، أنشئ حساب بريد/كلمة مرور لكل باريستا سيسجّل
   دخوله على `/barista/login`. لا يوجد تسجيل عام — الحسابات تُنشأ يدويًا من
   لوحة Supabase فقط.
5. من **Database → Replication**، تأكد أن جدول `orders` مفعّل ضمن
  `supabase_realtime`. السكربت يحاول تفعيله بشكل قابل لإعادة التشغيل، لكن تحقق
  يدويًا إذا لم تظهر التحديثات الفورية في لوحة الباريستا.
6. أنشئ حسابات الباريستا يدويًا من **Authentication → Users**، ثم اختبر الدخول
  من `/barista/login`.
7. في التطوير اترك `VITE_PUBLIC_APP_URL` فارغًا؛ QR يستخدم `window.location.origin`.
  في النشر اضبطه على أصل الموقع، مثل `https://orders.example.com`، ثم أعد البناء.

### النموذج الأمني (مهم قبل النشر)

- مفتاح `anon` لا يملك صلاحية كتابة مباشرة إلى `orders`/`order_items`؛ ينشئ
  الطلب فقط عبر `create_order`, التي تتحقق من الكتالوج وتحسب الإجمالي داخل
  معاملة واحدة.
- العميل يقرأ طلبه عبر دالة `get_order_by_token(token)` فقط، وهي دالة
  `SECURITY DEFINER` تُرجع الطلب المطابق للتوكن فقط. امتلاك التوكن (UUID
  عشوائي طويل) هو آلية الحماية هنا — نفس مبدأ روابط الدفع/المشاركة.
- لوحة الباريستا تتطلب جلسة Supabase Auth حقيقية (`authenticated` role) —
  بدونها لا يمكن قراءة كل الطلبات أو تغيير الحالة، حتى لو امتلك أحدهم مفتاح
  `anon` العام.
- `total_amount` **لا يُحسب أبدًا من قيمة يرسلها العميل** — الأسعار والأسماء
  تأتي من `menu_catalog` داخل قاعدة البيانات. كذلك حالة الطلب لا يمكن أن تتغيّر إلا للأمام في التسلسل
  (جديد → قيد التحضير → جاهز → تم التسليم) — أي محاولة تخطي أو رجوع تُرفض
  بواسطة تريجر آخر.

## البحث المباشر عن Realtime مقابل Polling

- **العميل** (`/order/:token`): يعتمد على *polling* كل 4 ثوانٍ عبر
  `get_order_by_token`، وليس Supabase Realtime — لأن مفتاح `anon` لا يملك
  صلاحية قراءة على الجدول أصلًا (انظر أعلاه)، فلا يوجد ما يمكن للـ Realtime
  أن يتحقق منه لهذا الدور. هذا بديل موثوق تم اختياره عمدًا بدلًا من تزييف
  تحديثات فورية غير موجودة فعليًا.
- **الباريستا** (`/barista`): يعتمد على Supabase Realtime (`postgres_changes`)
  الحقيقي، لأن الجلسة موثّقة (`authenticated`) وتملك صلاحية القراءة.

## هيكل المشروع

```
src/
  components/     ProductCard, CartButton, CartDrawer, StatusBadge, OrderQrCode, ...
  context/        CartContext.tsx — حالة السلة + حفظها في localStorage
  data/           menu.ts (بيانات المنيو، غير مُعدَّلة) + categoryVisuals.ts (أيقونات زخرفية)
  lib/            supabase.ts, orders.ts, menuLookup.ts, baristaAuth.ts
  pages/          MenuPage, OrderPage, BaristaLoginPage, BaristaDashboardPage
  types/          menu.ts, cart.ts, order.ts
  hooks/          useActiveSection.ts
  utils/          search.ts
supabase/
  migrations/     المخطط الكامل + RLS + الدوال والتريجرات (5 ملفات بالترتيب)
  seed/           optional_catalog_seed.sql — كتالوج اختياري مولّد من menu.ts
  tests/          verify_behavior.sql — اختبارات سلوك وأمان قاعدة البيانات
  migrations_legacy_reference/  SQL القديم للرجوع فقط (لا يُنفّذ)
```

## صور المنتجات

لا توجد صور فوتوغرافية حقيقية في هذا الإصدار — بيئة العمل لا تملك اتصال
إنترنت لتحميل صور خارجية. بدلًا من ذلك، كل بطاقة منتج تعرض بلاطة زخرفية
(تدرّج لوني + أيقونة) مرتبطة بفئة المنتج فقط (مثال: المانجو ← أيقونة ولون
مختلف عن الفراولة)، معرّفة في `src/data/categoryVisuals.ts`. هذه الأيقونات
**زخرفية بحتة** ولا تُستخدم كمصدر لاسم أو سعر أي منتج. لاستبدالها بصور حقيقية
لاحقًا: عدّل `CategoryTile.tsx` ليعرض `<img>` بدلًا من الأيقونة، مع الحفاظ
على نفس آلية الربط بالفئة.

## رحلة العميل

المنيو (`/`) ← تصفّح/بحث ← اختيار المقاس والكمية ← إضافة للسلة ← فتح "طلبك" ←
مراجعة الطلب ← تأكيد الطلب (يُنشأ في Supabase برمز عشوائي) ← الانتقال لصفحة
`/order/:token` (تأكيد + QR + حالة حيّة) ← العميل يريه للباريستا عند الاستلام.
لا يوجد تسجيل دخول أو حساب للعميل في أي خطوة.

## لوحة الباريستا

`/barista/login` لتسجيل الدخول، ثم `/barista` تعرض 4 أعمدة (جديد، قيد
التحضير، جاهز، تم التسليم) مع تحديث فوري وزر لتقديم الطلب للحالة التالية،
وزر طباعة لكل طلب (تنسيق طباعة مبسّط عبر `print:` classes في Tailwind).

## النشر (Vercel / Netlify / Cloudflare Pages)

المشروع Single Page Application — المسارات مثل `/order/abc-123` و`/barista`
يجب أن تُعاد كتابتها كلها إلى `index.html` وإلا ستُرجع 404 عند تحديث الصفحة
مباشرة على هذه الروابط:

- **Vercel**: ملف `vercel.json` مُضاف بالفعل (rewrite شامل).
- **Netlify**: ملف `public/_redirects` مُضاف بالفعل.
- **Cloudflare Pages**: أضف قاعدة Redirect مماثلة من لوحة التحكم
  (`/*  /index.html  200`) أو ملف `_redirects` بنفس الصيغة أعلاه (يُنسخ تلقائيًا لمجلد `dist`).

لا تنسَ ضبط متغيرات البيئة (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) في
إعدادات المنصة قبل البناء — بدونها سيعمل المنيو فقط دون الطلبات.

## معلومات النشاط التجاري

الاسم والعنوان ورقم الهاتف الظاهرة في الموقع (`src/data/menu.ts` →
`shopInfo`) هي نفسها الموجودة في المشروع الأصلي ولم تُضَف أو تُخترع أي
معلومة جديدة (مواعيد عمل، عروض، حسابات تواصل اجتماعي) لعدم توفرها في
المصدر.

## نقاط بيانات تحتاج مراجعتك (غير متعلقة بهذا التحديث)

راجع `DATA_REVIEW.md` — يحتوي على كل الحالات التي وُجد فيها تعارض بين
قراءتين لنفس السطر في قائمة الأسعار الأصلية (PDF)، وما زالت كما هي دون أي
تغيير في هذا التحديث.

## حالة التحقق

- `npm run lint` و`npm run build` هما فحوصات النشر المطلوبة.
- لا يمكن اعتبار قاعدة البيانات متصلة أو اختبار الطلب الحي إلا بعد تنفيذ
  ملفات `supabase/migrations/` (ثم الكتالوج الاختياري) على المشروع الصحيح على المشروع الصحيح.
- بعد التنفيذ، اختبر رحلة كاملة: إرسال طلب، فتح رابط `/order/:token`، تسجيل
  دخول الباريستا، تقديم الحالة، وملاحظة التحديث في صفحة العميل.
- لا توجد صور فوتوغرافية حقيقية (انظر قسم "صور المنتجات" أعلاه).
- عرض `ProductCard` الحالي مبني على أن كل حجم في المنتج له سعر واحد فقط (كما
  في `menu.ts` الحالي) — إن أُضيفت لاحقًا خصائص أخرى (خيارات إضافية، ملاحظات
  العميل) ستحتاج توسيع `types/cart.ts` ومجلد `supabase/migrations/` معًا.
