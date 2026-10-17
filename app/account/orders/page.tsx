import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {customerSession} from '../../../lib/customer/auth';
import {Account} from '../../../components/store/account';
import {noIndex} from '../../../lib/seo';
export const metadata={title:'طلباتي | ELITE BABY',robots:noIndex};
export default async function Page(){if(!await customerSession(new Headers(await headers())))redirect('/account/login');return <Account ordersOnly/>;}
