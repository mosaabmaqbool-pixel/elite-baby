import {Suspense} from 'react';
import {Catalog} from '../../components/store/catalog';
import {noIndex} from '../../lib/seo';
export const metadata={robots:noIndex,title:'المفضلة'};
export default function Page(){return <Suspense><Catalog mode="wishlist"/></Suspense>;}
