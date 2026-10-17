import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {authenticate} from '../../../../lib/admin/auth';
import {RequiredPasswordForm} from '../../../../components/admin/required-password-form';
export const dynamic='force-dynamic';
export const metadata={title:'تغيير كلمة مرور الإدارة',robots:{index:false,follow:false}};
export default async function Page(){const user=await authenticate(new Headers(await headers()));if(!user)redirect('/admin/login');if(!user.force_password_change)redirect('/admin/profile');return <RequiredPasswordForm csrf={user.csrf}/>;}
