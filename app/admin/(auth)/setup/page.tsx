import {hasAdmins} from '../../../../lib/admin/auth';
import {redirect} from 'next/navigation';
import {AuthForm} from '../../../../components/admin/auth-form';
export const dynamic='force-dynamic';
export const metadata={title:'إعداد الإدارة',robots:{index:false,follow:false}};
export default async function Page(){if(await hasAdmins())redirect('/admin/login');return <AuthForm setup/>;}
