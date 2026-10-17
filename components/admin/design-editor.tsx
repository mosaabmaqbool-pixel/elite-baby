'use client';
import {useAdminText} from './shell';
import {useState,useRef} from 'react';
import {Field,Images,Toggle} from './fields';
import {rebuildVariants,appendDesign,setDesignImages} from '../../lib/product-designs';
export function DesignEditor({product:p,onChange}:{product:any;onChange:(p:any)=>void}){const t=useAdminText();
 const [error,setError]=useState('');const latest=useRef(p);latest.current=p;const g=p.optionGroups.find((x:any)=>x.kind==='design');
 function groups(next:any[]){try{setError('');onChange({...p,optionGroups:next,variants:rebuildVariants(p,next)});}catch(e){setError(t((e as Error).message));}}
 function values(next:any[]){groups(p.optionGroups.map((x:any)=>x.id===g.id?{...g,values:next}:x));}
 function change(id:string,key:string,value:any){
  const p=latest.current,g=p.optionGroups.find((x:any)=>x.kind==='design');if(!g?.values.some((x:any)=>x.id===id))return;
  if(key==='images'){onChange(setDesignImages(p,id,value));return;}
  if(key==='label'||key==='image'||key==='active'){
   const next=p.optionGroups.map((x:any)=>x.id===g.id?{...g,values:g.values.map((d:any)=>d.id===id?{...d,[key]:value}:d)}:x);
   try{const variants=rebuildVariants(p,next).map((v:any)=>v.selections[g.id]===id?{...v,...(key==='image'?{images:value?[value]:[]}:{}),...(key==='active'?{active:value}:{})}:v);onChange({...p,optionGroups:next,variants});}catch(e){setError(t((e as Error).message));}return;
  }
  onChange({...p,variants:p.variants.map((v:any)=>v.selections[g.id]===id?{...v,[key]:value}:v)});
 }
 function add(){try{setError('');onChange(appendDesign(latest.current));}catch(e){setError(t((e as Error).message));}}
 function move(from:number,to:number){const next=[...g.values];[next[from],next[to]]=[next[to],next[from]];values(next);}
 return <section className="admin-designs"><h3>التصاميم</h3><p>اسم التصميم اختياري. إذا تركته فارغًا، يظهر باسم مرقّم مثل «تصميم 1».</p><p>{t("صورة المنتج الرئيسية مستقلة عن التصاميم. عند إنشاء مجموعة تصاميم لأول مرة، تُستخدم صور المنتج الحالية للتصميم الأول؛ وإذا لم تُحدَّد صورة رئيسية مستقلة، يستخدم المتجر أول تصميم ظاهر كصورة عرض.")}</p>{g?.values.map((d:any,i:number)=>{const v=p.variants.find((x:any)=>x.selections[g.id]===d.id)||{};return <div className="admin-panel" key={d.id}><h4>التصميم {i+1}{i===0&&!p.productImage?' — صورة العرض الافتراضية':''}</h4><div className="admin-form-grid"><Field label="اسم التصميم (اختياري)" placeholder={"تصميم "+(i+1)} value={d.label} onChange={(x:string)=>change(d.id,'label',x)} maxLength={150}/><Field label="SKU التصميم (اختياري)" value={v.sku||''} onChange={(x:string)=>change(d.id,'sku',x)}/><Field label="سعر التصميم ₪ (اختياري)" type="number" min="0" step="0.01" value={v.price??''} onChange={(x:string)=>change(d.id,'price',x)}/><Field label="سعر العرض ₪ (اختياري)" type="number" min="0" step="0.01" value={v.salePrice??''} onChange={(x:string)=>change(d.id,'salePrice',x)}/><Field label="مخزون التصميم (اختياري)" type="number" min="0" step="1" placeholder="بدون تتبّع كمية" value={v.stock??''} onChange={(x:string)=>change(d.id,'stock',x)}/><Toggle label="تصميم ظاهر" value={d.active} onChange={(x:boolean)=>change(d.id,'active',x)}/><Toggle label="متاح للبيع" value={v.available!==false} onChange={(x:boolean)=>change(d.id,'available',x)}/></div><Images label="صور التصميم — زوايا وتفاصيل لنفس التصميم" value={v.images?.length?v.images:d.image?[d.image]:[]} onChange={(x:string[])=>change(d.id,'images',x)}/><div className="admin-row-actions"><button type="button" disabled={i===0} onClick={()=>move(i,i-1)} aria-label="نقل التصميم للأعلى">نقل للأعلى ↑</button><button type="button" disabled={i===g.values.length-1} onClick={()=>move(i,i+1)} aria-label="نقل التصميم للأسفل">نقل للأسفل ↓</button><button type="button" onClick={()=>{if(confirm('حذف التصميم؟ تبقى تفاصيل الطلبات السابقة محفوظة.')){const next=g.values.filter((x:any)=>x.id!==d.id);if(next.length)values(next);else groups(p.optionGroups.filter((x:any)=>x.id!==g.id));}}}>حذف التصميم</button></div></div>;})}{error&&<p className="admin-error" role="alert">{error}</p>}<button type="button" className="button compact" onClick={add}>{t("+ إضافة تصميم")}</button></section>;
}
