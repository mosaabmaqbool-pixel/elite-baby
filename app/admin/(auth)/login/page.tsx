import {authenticate} from '../../../../lib/admin/auth';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {AuthForm} from '../../../../components/admin/auth-form';
export const dynamic='force-dynamic';
export const metadata={title:'دخول الإدارة',robots:{index:false,follow:false}};
export default async function Page(){const user=await authenticate(new Headers(await headers()));if(user)redirect(user.force_password_change?'/admin/change-password':'/admin');return <AuthForm/>;}
