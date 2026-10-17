import type {Metadata} from 'next';
import './globals.css';
import '../components/shared/dropdown.css';
import './storefront.css';
import './modern-storefront.css';
import './baby-storefront.css';
import {StoreProvider} from '../components/store/provider';
import {SiteChrome} from '../components/store/site-chrome';
import {catalog} from '../lib/admin/catalog-db';
import '../components/admin/admin.css';

export const metadata:Metadata={title:{default:'ELITE BABY | عالم صغير، حب كبير',template:'%s | ELITE BABY'},description:'ELITE BABY، قالب متجر إلكتروني: دعاسات، ستائر، بيبي وديكور.',icons:{icon:'/images/elite-baby-logo.jpg'}};
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:React.ReactNode}){let data;try{data=await catalog();}catch(e){console.error(e);throw e;}return <html lang="ar" dir="rtl"><head><meta name="color-scheme" content="only light"/><meta name="supported-color-schemes" content="light"/><meta name="theme-color" content="#222222"/></head><body><StoreProvider initialCatalog={data}><SiteChrome>{children}</SiteChrome></StoreProvider></body></html>;}
