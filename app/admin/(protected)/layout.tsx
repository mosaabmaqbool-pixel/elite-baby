import {requirePage} from '../../../lib/admin/auth';
import {AdminShell} from '../../../components/admin/shell';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){const user=await requirePage();return <AdminShell user={{id:user.id,name:user.name,email:user.email,gender:user.gender,csrf:user.csrf,primary_admin:user.primary_admin,role:user.role,permissions:user.permissions}}>{children}</AdminShell>;}
