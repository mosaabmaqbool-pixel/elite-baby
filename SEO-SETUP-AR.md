# إعداد SEO لمتجر MyStore

المشروع الحالي: Vinext / Vite، مع Next.js App Router وCloudflare Workers، وقاعدة D1 وملفات R2. لم تتغير الروابط أو الواجهة أو قاعدة البيانات، ولا توجد migrations جديدة.

## الدومين

أضف `SITE_URL` كمتغير بيئة عام على الاستضافة، مثل `https://www.example.com` (الدومين الأساسي الفعلي فقط، بدون مسار أو query). اضبطه لكل مشروع جديد؛ example.com مجرد قيمة توضيحية للبناء ويجب استبدالها قبل النشر.

بعد ربط الدومين النهائي:

1. تحقق من DNS وHTTPS.
2. غيّر `SITE_URL` إلى الدومين الأساسي المختار، وأعد النشر لتطبيق المتغير.
3. تحقق من canonical وOpen Graph و`/robots.txt` و`/sitemap.xml`.
4. أضف الدومين في Google Search Console وأرسل رابط `/sitemap.xml`؛ تحقق من JSON-LD بأداة Rich Results Test. الظهور في البحث أو معاينة منصات التواصل قد يحتاج إعادة الزحف وتحديث ذاكرة المنصة.
5. عند النقل لاستضافة أخرى، إن بقي الدومين القديم متاحًا، اضبط إعادة توجيه 301 إلى الدومين النهائي مع الحفاظ على المسار. canonical وحده لا يعطل الرابط القديم.

## الملفات والسلوك

- `lib/seo.ts`: عناوين ووصف، canonical، OG/Twitter، Product/Offer، BreadcrumbList، OnlineStore/WebSite، توليد XML وrobots، وتشفير JSON-LD ضد إدخال HTML.
- `lib/seo-runtime.ts`: قراءة SITE_URL من Worker على السيرفر فقط.
- `components/seo/json-ld.tsx`: بيانات منظمة غير مرئية على السيرفر.
- `app/sitemap.xml/route.ts`: المنتجات والتصنيفات المنشورة فقط، والصفحات العامة الأساسية، من قاعدة البيانات عند كل طلب؛ بدون صفحات داخلية أو lastmod مختلق.
- `app/robots.txt/route.ts`: يسمح بالموقع العام ويستثني الإدارة والسلة والدفع والحساب وAPI. يسمح تحديدًا بمسار `/api/media/` لأنه يخدم صور المنتجات العامة اللازمة لفهرسة الصور ومعاينات المشاركة، ولا يعرض بيانات حسابات أو طلبات.
- `app/admin/layout.tsx` وصفحات cart/checkout/account/wishlist: noindex.
- `build/sites-worker.ts`: X-Robots-Tag على الردود الداخلية والأخطاء، مع الحفاظ على status وheaders. robots وnoindex ليسا حماية وصول؛ نظام الصلاحيات الحالي محفوظ.
- صفحات home/product/category/products/categories/about/offers: metadata على السيرفر؛ صفحات المنتجات والتصنيفات غير الموجودة تستخدم notFound قبل العرض، وبالتالي 404 فعلية.
- صور التفاصيل والتصاميم والنافذة السريعة: alt يتضمن اسم المنتج والتصميم عند الاختيار، بدون تغيير الصورة أو مظهرها.
- `app/layout.tsx`: لا يعيد HTML بحالة 200 إذا تعذر تحميل قاعدة البيانات؛ يسمح لخطأ السيرفر بالوصول للاستجابة الصحيحة.

كل تصميم نشط له Offer بسعره الفعلي (التخفيض ثم سعر التصميم ثم سعر المنتج)، ومخزونه الفعلي؛ stock=null يعني أن المخزون غير متتبع. العملة ILS. لا توجد ratings أو reviews منظمة مصطنعة. الصور والروابط مطلقة باستخدام SITE_URL.

## الاختبارات

بعد تثبيت dependencies:

```bash
node tests/seo.mjs
node tests/admin-flow.mjs
node tests/product-presentation.mjs
node tests/customer-design.mjs
pnpm build
node tests/seo-worker.mjs
```

الاختبار الأخير يشغل bundle Cloudflare الفعلي عبر Miniflare وقاعدة D1 وR2 منفصلتين ومؤقتتين؛ لا يلمس بيانات الاستضافة. يختبر الصفحة الرئيسية ومنتج وتصنيف و404 والإدارة والسلة والدفع وXML وrobots وcanonical مع query، ثم أسعار وتوفر التصاميم ونفاد المخزون وإخفاء المنتج وتحديث Sitemap.

في بعض حاويات الاختبار تعجز Node عن قراءة واجهات الشبكة؛ اختبار Worker يعالج ذلك داخل عملية الاختبار فقط. لا يغيّر تطبيق الإنتاج. إرسال URLs إلى Google/Meta فعليًا والتحقق من سرعة إعادة الزحف يحتاجان الأدوات والحسابات الخارجية الخاصة بصاحب المتجر.
