'use client';
import type {Category} from '../../lib/store-config';
import {rootCategories,childCategories} from '../../lib/category-tree';
import {Dropdown} from '../shared/dropdown';

type Props={categories:Category[];value:string;onChange:(value:string)=>void;allowAll?:boolean;disabled?:boolean};

// A root value includes its children; a child value selects that child alone.
export function CategoryPicker({categories,value,onChange,allowAll=false,disabled=false}:Props){
 const selected=categories.find(c=>c.id===value);
 const parentId=selected?.parentId||selected?.id||'';
 const roots=rootCategories(categories),children=childCategories(categories,parentId);
 return <div className="admin-form-grid">
  <label className="admin-field">التصنيف الرئيسي<Dropdown aria-label="التصنيف الرئيسي" value={parentId||(allowAll?'all':'__choose__')} disabled={disabled} onChange={event=>onChange(event.target.value)}>
   {allowAll?<option value="all">كل التصنيفات الرئيسية</option>:<option value="__choose__" disabled>اختر التصنيف الرئيسي</option>}
   {roots.map(c=><option key={c.id} value={c.id}>{c.name}{c.active===false?' — مخفي':''}</option>)}
  </Dropdown></label>
  {!!parentId&&children.length>0&&<label className="admin-field">التصنيف الفرعي<Dropdown aria-label="التصنيف الفرعي" value={selected?.parentId?selected.id:'__parent__'} disabled={disabled} onChange={event=>onChange(event.target.value==='__parent__'?parentId:event.target.value)}>
   <option value="__parent__">كل منتجات التصنيف الرئيسي</option>
   {children.map(c=><option key={c.id} value={c.id}>{c.name}{c.active===false?' — مخفي':''}</option>)}
  </Dropdown></label>}
 </div>;
}
