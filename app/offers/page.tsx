import {Suspense} from 'react';
import {Catalog} from '../../components/store/catalog';
import {publicMetadata} from '../../lib/seo';
import {siteUrl} from '../../lib/seo-runtime';
export function generateMetadata(){return publicMetadata(siteUrl(),'/offers','ELITE BABY | العروض','تصفحي عروض المنتجات المتاحة في متجر ELITE BABY.');}
export default function Page(){return <Suspense><Catalog mode="offers"/></Suspense>;}
