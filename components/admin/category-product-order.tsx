'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown} from 'lucide-react';
import type {Product} from '../../lib/catalog';
import {imagePath,price} from '../../lib/catalog';
import type {Category} from '../../lib/store-config';
import {categoryMatches,visibleCategories} from '../../lib/category-tree';
import {can} from '../../lib/admin/permissions';
import {orderCategoryProducts} from '../../lib/category-product-order';
import {CategoryPicker} from './category-picker';
import {useAdmin,adminRequest} from './shell';
import './category-product-order.css';

type Props={products:Product[];categories:Category[];onSaved:(category:string,ids:string[],revision:number)=>void};

export function CategoryProductOrderManager({products,categories,onSaved}:Props){
 const user=useAdmin();
 const [selectedId,setSelectedId]=useState(''),[editing,setEditing]=useState(false);
 const [draft,setDraft]=useState<Product[]>([]),[initial,setInitial]=useState<string[]>([]),[revision,setRevision]=useState(0);
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const savingRef=useRef(false),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null),panelId=useId();
 const visible=visibleCategories(categories),visibleIds=new Set(visible.map(c=>c.id));
 const category=visible.find(c=>c.id===selectedId);
 const items=category?products.filter(p=>p.active!==false&&!p.archived&&visibleIds.has(p.category)&&categoryMatches(visible,p.category,category.id)):[];
 useEffect(()=>{if(editing)panel.current?.focus();else trigger.current?.focus();},[editing]);
 if(!user||!can(user,'products.manage'))return <p className="admin-note">لا تملك صلاحية ترتيب المنتجات.</p>;
 const dirty=draft.some((p,i)=>p.id!==initial[i]);
 function start(){
  if(!category)return;
  const ordered=orderCategoryProducts(items,category.productOrder);
  setDraft(ordered);setInitial(ordered.map(p=>p.id));setRevision(category.productOrderRevision??0);
  setError('');setMessage('');setEditing(true);
 }
 function move(from:number,to:number){
  if(savingRef.current||from===to||from<0||to<0||from>=draft.length||to>=draft.length)return;
  setDraft(current=>{const next=[...current];const [product]=next.splice(from,1);next.splice(to,0,product);return next;});
 }
 async function save(){
  if(!category||!can(user,'products.manage')||savingRef.current)return;
  if(!dirty){setEditing(false);return;}
  savingRef.current=true;setSaving(true);setError('');
  try{
   const data=await adminRequest(user,{entity:'reorder',kind:'category-products',category:category.id,revision,ids:draft.map(p=>p.id)});
   if(!Array.isArray(data.ids)||typeof data.revision!=='number')throw new Error('تعذّر تأكيد حفظ الترتيب. حدّث الصفحة للتحقق.');
   onSaved(category.id,data.ids,data.revision);setEditing(false);setMessage('تم حفظ ترتيب منتجات '+category.name+'.');
  }catch(err){setError(err instanceof Error?err.message:'تعذّر حفظ الترتيب. حاول مجددًا.');}
  finally{savingRef.current=false;setSaving(false);}
 }
 return <div className="admin-category-order">
  <section className="admin-panel">
   <h2>اختيار التصنيف</h2>
   <p>اختر التصنيف الرئيسي أولًا، ثم اختر الفرعي إن أردت. «كل منتجات التصنيف الرئيسي» يرتب منتجاته مع فروعه. لكل تصنيف ترتيب مستقل يظهر للزبائن عند «ترتيبنا المقترح».</p>
   <CategoryPicker categories={visible} value={selectedId} disabled={saving||(editing&&!!category)} onChange={value=>{setSelectedId(value);setEditing(false);setError('');setMessage('');}}/>
   {category&&!editing&&<><p>{items.length.toLocaleString('ar')} منتجات ظاهرة</p>{items.length>1?<button ref={trigger} type="button" className="button compact" onClick={start} aria-expanded={false} aria-controls={panelId}><ArrowUpDown size={18}/> ترتيب المنتجات</button>:<p className="admin-note">{items.length?'يوجد منتج واحد فقط في هذا التصنيف.':'لا توجد منتجات ظاهرة في هذا التصنيف حاليًا.'}</p>}</>}
   {!visible.length&&<p className="admin-note">لا توجد تصنيفات ظاهرة حاليًا.</p>}
  </section>
  {message&&<p className="admin-success" role="status">{message}</p>}
  {error&&<p className="admin-error" role="alert">{error} <button type="button" className="text-link" disabled={saving} onClick={()=>window.location.reload()}>تحديث الصفحة</button></p>}
  {category&&editing&&<section ref={panel} tabIndex={-1} id={panelId} className="admin-panel category-order-panel" aria-label={'ترتيب منتجات '+category.name}>
   <h2>ترتيب منتجات {category.name}</h2>
   <p className="category-order-intro">استخدم الأسهم أو رقم الترتيب، ويمكن السحب على الكمبيوتر. الرقم 1 يظهر أولًا في المتجر.</p>
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
   <div className="category-order-footer"><button type="button" className="button" disabled={saving} onClick={save}>{saving?'جارٍ حفظ الترتيب…':'حفظ الترتيب'}</button><button type="button" className="button gold" disabled={saving} onClick={()=>{setError('');setEditing(false);}}>إلغاء</button></div>
  </section>}
 </div>;
}

function OrderPosition({position,count,name,disabled,move}:{position:number;count:number;name:string;disabled:boolean;move:(to:number)=>void}){
 const [value,setValue]=useState(String(position+1));
 useEffect(()=>setValue(String(position+1)),[position]);
 function commit(){const next=Number(value);if(Number.isInteger(next)&&next>=1&&next<=count)move(next-1);setValue(String(position+1));}
 return <label className="category-order-position">الترتيب<input type="number" inputMode="numeric" min={1} max={count} step={1} value={value} disabled={disabled} aria-label={'ترتيب '+name} onChange={event=>setValue(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/></label>;
}
