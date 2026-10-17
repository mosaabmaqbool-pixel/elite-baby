'use client';
import {useState} from 'react';
import type {Category} from '../../lib/store-config';
import {rootCategories,childCategories} from '../../lib/category-tree';
import {Dropdown} from '../shared/dropdown';

type Props={categories:Category[];busy:boolean;readOnly:boolean;onEdit:(category:Partial<Category>)=>void;save:(payload:any)=>Promise<boolean>};

export function CategoryManager({categories,busy,readOnly,onEdit,save}:Props){
 const [parentId,setParentId]=useState('');
 const parent=rootCategories(categories).find(c=>c.id===parentId);
 const items=parent?childCategories(categories,parent.id):rootCategories(categories);
 function move(fromId:string,toId:string){
  if(busy||readOnly)return;
  const ids=items.map(c=>c.id),from=ids.indexOf(fromId),to=ids.indexOf(toId);
  if(from<0||to<0||from===to)return;
  const [id]=ids.splice(from,1);ids.splice(to,0,id);
  // Keep every other category in its existing slot when sorting siblings.
  const scope=new Set(ids);let index=0;
  save({entity:'reorder',kind:'categories',ids:categories.map(c=>scope.has(c.id)?ids[index++]:c.id)});
 }
 return <section className="admin-panel">
  <label className="admin-field">عرض التصنيفات<Dropdown aria-label="عرض التصنيفات" value={parent?.id||'__roots__'} disabled={busy} onChange={event=>setParentId(event.target.value==='__roots__'?'':event.target.value)}>
   <option value="__roots__">التصنيفات الرئيسية</option>{rootCategories(categories).map(c=><option key={c.id} value={c.id}>التصنيفات الفرعية: {c.name}</option>)}
  </Dropdown></label>
  <h2>{parent?'التصنيفات الفرعية — '+parent.name:'التصنيفات الرئيسية'}</h2>
  <p>اختر تصنيفًا رئيسيًا لعرض فروعه. الأسهم والسحب يرتبان التصنيفات المعروضة فقط.</p>
  {parent&&!readOnly&&<button type="button" className="button compact" disabled={busy} onClick={()=>onEdit({name:'',description:'',image:'',active:true,parentId:parent.id,position:categories.length})}>إضافة تصنيف فرعي</button>}
  <div className="admin-category-list">{items.map((c,i)=><div key={c.id} data-category-id={c.id} draggable={!busy&&!readOnly}
   onDragStart={event=>event.dataTransfer.setData('text/plain',c.id)} onDragOver={event=>{if(!busy&&!readOnly)event.preventDefault();}}
   onDrop={event=>{event.preventDefault();move(event.dataTransfer.getData('text/plain'),c.id);}}>
   <strong>{c.name}</strong><span className="admin-badge">{c.active!==false?'ظاهر':'مخفي'}</span>
   <div className="admin-row-actions">
    {!parent&&<button type="button" disabled={busy} onClick={()=>setParentId(c.id)}>عرض التصنيفات الفرعية</button>}
    <button type="button" disabled={i===0||busy||readOnly} aria-label={'تقديم '+c.name} onClick={()=>move(c.id,items[i-1]?.id)}>↑</button>
    <button type="button" disabled={i===items.length-1||busy||readOnly} aria-label={'تأخير '+c.name} onClick={()=>move(c.id,items[i+1]?.id)}>↓</button>
    <button type="button" disabled={busy||readOnly} onClick={()=>onEdit(c)}>تعديل التصنيف</button>
    <button type="button" disabled={busy||readOnly} onClick={()=>{if(confirm('حذف التصنيف؟ يُمنع الحذف إذا كان يحتوي منتجات أو تصنيفات فرعية.'))save({entity:'category',id:c.id,action:'delete'});}}>حذف</button>
   </div>
  </div>)}</div>
  {!items.length&&<p className="admin-note">{parent?'لا توجد تصنيفات فرعية لهذا التصنيف الرئيسي.':'لا توجد تصنيفات رئيسية حاليًا.'}</p>}
 </section>;
}
