import {CategoriesPage} from '../../components/store/catalog';
import {publicMetadata} from '../../lib/seo';
import {siteUrl} from '../../lib/seo-runtime';
export function generateMetadata(){return publicMetadata(siteUrl(),'/categories','ELITE BABY | التصنيفات','تصفحي تصنيفات منتجات ELITE BABY للفرش المنزلي.');}
export default function Page(){return <CategoriesPage/>;}
