import {Cart} from '../../components/store/cart';
import {noIndex} from '../../lib/seo';
export const metadata={robots:noIndex,title:'سلة التسوق'};
export default function Page(){return <Cart/>;}
