import {Suspense} from 'react';
import {Catalog} from '../../components/store/catalog';
import {publicMetadata} from '../../lib/seo';
import {siteUrl} from '../../lib/seo-runtime';
export function generateMetadata(){return publicMetadata(siteUrl(),'/products','ELITE BABY | المنتجات','تصفحي منتجات ELITE BABY للفرش المنزلي: دعاسات وستائر ومستلزمات بيبي وديكور.');}
export default function Page(){return <Suspense fallback={<main className="container page">جارٍ تحميل القطع…</main>}><Catalog/></Suspense>;}
