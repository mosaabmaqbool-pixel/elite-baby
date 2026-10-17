import {requirePage} from '../../../../lib/admin/auth';
import {AdminDashboard} from '../../../../components/admin/dashboard';
import {sectionAllowed} from '../../../../lib/admin/permissions';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'لوحة الإدارة',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const user=await requirePage();const {path=[]}=await params;if(!['','products','products/order','products/new','categories','categories/new','variants','inventory','orders','customers','coupons','content','settings','social-media','users','profile'].includes(path.join('/')))notFound();if(!sectionAllowed(user,path.join('/')))return <main className="admin-main"><h1>لا تملك صلاحية لعرض هذا القسم</h1><a href="/admin">العودة إلى لوحة الإدارة</a></main>;return <AdminDashboard key={path.join('/')} section={path.join('/')}/>;}
