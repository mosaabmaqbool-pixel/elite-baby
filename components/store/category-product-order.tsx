'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown} from 'lucide-react';
import type {Product} from '../../lib/catalog';
import {imagePath,price} from '../../lib/catalog';
import type {Category} from '../../lib/store-config';
import {can} from '../../lib/admin/permissions';
import {orderCategoryProducts} from '../../lib/category-product-order';
import './category-product-order.css';

type Access={csrf:string;primary_admin?:number;role?:string;permissions?:string[];force_password_change?:number};
type Props={category:Category;products:Product[];open:boolean;onOpenChange:(open:boolean)=>void;onSaved:(ids:string[],revision:number)=>void};

export function CategoryProductOrder({category,products,open,onOpenChange,onSaved}:Props){
 const [access,setAccess]=useState<Access|null>(null);
 const [draft,setDraft]=useState<Product[]>([]),[initial,setInitial]=useState<string[]>([]),[revision,setRevision]=useState(0);
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const savingRef=useRef(false),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null),panelId=useId();
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/admin/auth',{cache:'no-store',credentials:'same-origin',signal:controller.signal})
   .then(async response=>{if(!response.ok)return;const data=await response.json() as {user?:Access|null};if(!controller.signal.aborted&&data.user&&!data.user.force_password_change&&can(data.user,'products.manage'))setAccess(data.user);})
   .catch(()=>{});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{if(open)panel.current?.focus();else trigger.current?.focus();},[open]);
 if(!access||(!open&&products.length<2))return null;
 const dirty=draft.some((p,i)=>p.id!==initial[i]);
 function start(){
  const ordered=orderCategoryProducts(products,category.productOrder);
  setDraft(ordered);setInitial(ordered.map(p=>p.id));setRevision(category.productOrderRevision??0);
  setError('');setMessage('');onOpenChange(true);
 }
 function move(from:number,to:number){
  if(savingRef.current||from===to||from<0||to<0||from>=draft.length||to>=draft.length)return;
  setDraft(current=>{const next=[...current];const [product]=next.splice(from,1);next.splice(to,0,product);return next;});
 }
 async function save(){
  if(!access||savingRef.current)return;
  if(!dirty){onOpenChange(false);return;}
  savingRef.current=true;setSaving(true);setError('');
  try{
   const response=await fetch('/api/admin/manage',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':access.csrf},body:JSON.stringify({entity:'reorder',kind:'category-products',category:category.id,revision,ids:draft.map(p=>p.id)})});
   const data=await response.json() as {ids?:string[];revision?:number;error?:string};
   if(!response.ok)throw new Error(data.error||'تعذّر حفظ الترتيب. حاول مجددًا.');
   if(!Array.isArray(data.ids)||typeof data.revision!=='number')throw new Error('تعذّر تأكيد حفظ الترتيب. حدّث الصفحة للتحقق.');
   onSaved(data.ids,data.revision);onOpenChange(false);setMessage('تم حفظ ترتيب منتجات '+category.name+'.');
  }catch(err){setError(err instanceof Error?err.message:'تعذّر حفظ الترتيب. حاول مجددًا.');}
  finally{savingRef.current=false;setSaving(false);}
 }
 return <div className="category-order-controls">
  {!open?<><button ref={trigger} type="button" className="button compact" onClick={start} aria-expanded={false} aria-controls={panelId}><ArrowUpDown size={18}/> ترتيب المنتجات</button>{message&&<p className="category-order-message" role="status">{message}</p>}</>:<section ref={panel} tabIndex={-1} id={panelId} className="category-order-panel" aria-label={'ترتيب منتجات '+category.name}>
   <h2>ترتيب منتجات {category.name}</h2>
   <p className="category-order-intro">الترتيب يشمل جميع منتجات هذا التصنيف، ويظهر للزبائن عند اختيار «ترتيبنا المقترح». استخدم الأسهم أو رقم الترتيب، ويمكن السحب على الكمبيوتر.</p>
   <ol className="category-order-list">{draft.map((p,i)=><li className="category-order-row" key={p.id} data-order-product={p.id} draggable={!saving}
    onDragStart={event=>{event.dataTransfer.setData('text/plain',p.id);event.dataTransfer.effectAllowed='move';}}
    onDragOver={event=>{if(!saving)event.preventDefault();}}
    onDrop={event=>{event.preventDefault();const from=draft.findIndex(item=>item.id===event.dataTransfer.getData('text/plain'));move(from,i);}}>
    <img src={imagePath(p.image)} alt="" width={60} height={60} loading="lazy" draggable={false}/>
    <div className="category-order-name"><strong>{p.name}</strong><small>{price(p.price)}</small></div>
    <div className="category-order-actions"><OrderPosition position={i} count={draft.length} name={p.name} disabled={saving} move={to=>move(i,to)}/>
     <div className="category-order-move"><button type="button" disabled={saving||i===0} aria-label={'تقديم '+p.name} onClick={()=>move(i,i-1)}><ArrowUp size={20}/></button><button type="button" disabled={saving||i===draft.length-1} aria-label={'تأخير '+p.name} onClick={()=>move(i,i+1)}><ArrowDown size={20}/></button></div>
    </div>
   </li>)}</ol>
   {error&&<p className="category-order-error" role="alert">{error} <button type="button" className="text-link" disabled={saving} onClick={()=>window.location.reload()}>تحديث الصفحة</button></p>}
   <div className="category-order-footer"><button type="button" className="button" disabled={saving} onClick={save}>{saving?'جارٍ حفظ الترتيب…':'حفظ الترتيب'}</button><button type="button" className="button gold" disabled={saving} onClick={()=>{setError('');onOpenChange(false);}}>إلغاء</button></div>
  </section>}
 </div>;
}

function OrderPosition({position,count,name,disabled,move}:{position:number;count:number;name:string;disabled:boolean;move:(to:number)=>void}){
 const [value,setValue]=useState(String(position+1));
 useEffect(()=>setValue(String(position+1)),[position]);
 function commit(){const next=Number(value);if(Number.isInteger(next)&&next>=1&&next<=count)move(next-1);setValue(String(position+1));}
 return <label className="category-order-position">الترتيب<input type="number" inputMode="numeric" min={1} max={count} step={1} value={value} disabled={disabled} aria-label={'ترتيب '+name} onChange={event=>setValue(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/></label>;
}
