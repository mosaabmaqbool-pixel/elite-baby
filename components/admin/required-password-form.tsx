'use client';
import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {Eye,EyeOff,LockKeyhole} from 'lucide-react';

export function RequiredPasswordForm({csrf}:{csrf:string}){
  const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action:'password',...Object.fromEntries(new FormData(form))})});
      const result=await response.json() as {error?:string};
      if(response.status===401){window.location.assign('/admin/login');return;}
      if(!response.ok)throw new Error(result.error||'تعذر تغيير كلمة المرور');
      form.reset();setDone(true);
    }catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  async function logout(){setBusy(true);setError('');try{const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action:'logout'})});if(!response.ok&&response.status!==401)throw new Error('تعذر تسجيل الخروج');window.location.assign('/admin/login');}catch(e){setError((e as Error).message);setBusy(false);}}
  return <main className="admin-auth"><div className="admin-auth-brand"><img src="/images/elite-baby-logo.jpg" alt="ELITE BABY"/><span>ELITE BABY</span><small>إدارة المتجر</small></div>{done?<section className="admin-auth-card"><h1>تم تغيير كلمة المرور</h1><p role="status">أُغلقت جميع جلسات الحساب. سجّل الدخول بكلمة المرور الجديدة.</p><Link className="button full" href="/admin/login">العودة لتسجيل الدخول</Link></section>:<form className="admin-auth-card" onSubmit={submit}><LockKeyhole size={28}/><h1>إنشاء كلمة مرور جديدة</h1><p>كلمة مرورك مؤقتة. يجب تغييرها قبل استخدام لوحة الإدارة.</p><label>كلمة المرور المؤقتة<input name="current" type="password" required maxLength={128} autoComplete="current-password" dir="ltr"/></label>{[['password','كلمة المرور الجديدة'],['confirm','تأكيد كلمة المرور الجديدة']].map(([name,label])=><label key={name}>{label}<div className="admin-password"><input name={name} type={show?'text':'password'} required minLength={8} maxLength={128} autoComplete="new-password" dir="ltr"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'إخفاء كلمة المرور':'إظهار كلمة المرور'}>{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>)}<p>8 أحرف على الأقل، تشمل حروفًا وأرقامًا ورمزًا، وتختلف عن الكلمة المؤقتة.</p>{error&&<p className="admin-error" role="alert">{error}</p>}<button className="button full" disabled={busy}>{busy?'جارٍ الحفظ…':'حفظ كلمة المرور الجديدة'}</button><button className="text-link" type="button" disabled={busy} onClick={logout}>تسجيل الخروج</button></form>}</main>;
}
