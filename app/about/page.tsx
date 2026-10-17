import Link from '../../components/store/link';
import {SocialLinks} from '../../components/store/social';
import {publicMetadata} from '../../lib/seo';
import {siteUrl} from '../../lib/seo-runtime';
export function generateMetadata(){return publicMetadata(siteUrl(),'/about','ELITE BABY | عن ELITE BABY','تعرف على متجرنا ومنتجاتنا.');}
import {settings} from '../../lib/admin/catalog-db';
export default async function Page(){const {content}=await settings();return <main className="container page"><div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>حكاية ELITE BABY</span></div><section className="about-page"><div><span className="eyebrow">عن المتجر</span><h1 className="preserve-lines">{content.aboutTitle}</h1><p>{content.aboutText}</p><p>لأول ضحكة، وكل لحظة بعدها، نجمع تفاصيل عالم الصغار في مساحة واحدة.</p><Link className="button" href="/products">اكتشفي المجموعات</Link><SocialLinks/></div><div className="about-logo"><img src="/images/elite-baby-logo.jpg" alt="شعار ELITE BABY"/></div></section></main>;}
