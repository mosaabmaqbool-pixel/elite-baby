'use client';
import {Product,imagePath} from '../../lib/catalog';
import {designGroup,visibleDesigns,inStock} from '../../lib/product-designs';
export function DesignSelector({product:p,selection,choose}:{product:Product;selection:Record<string,string>;choose:(group:string,value:string)=>void}){
 const g=designGroup(p);if(!g)return null;const values=visibleDesigns(p),selected=values.find(x=>selection[g.id]===x.id);
 return <section className="design-selector" aria-label="اختر التصميم"><h3>اختر التصميم</h3><p className="design-selection-name" role="status">{selected?'التصميم: '+selected.label:'اختاري التصميم قبل الإضافة للسلة'}</p><div className="design-grid" role="group" aria-label="تصاميم المنتج">{values.map(x=>{const enabled=p.variants?.some(v=>v.active&&v.selections[g.id]===x.id&&inStock(v)&&p.optionGroups?.filter(g=>g.active).every(g=>g.values.some(x=>x.active&&x.id===v.selections[g.id])));return <button type="button" key={x.id} className={'design-thumb '+(selected?.id===x.id?'selected':'')} aria-pressed={selected?.id===x.id} disabled={!enabled} onClick={()=>choose(g.id,x.id)}><img src={imagePath(x.image||p.image)} alt={p.name+' — '+x.label} loading="lazy"/><span>{x.label}</span>{!enabled&&<small>غير متوفر</small>}</button>;})}</div></section>;
}
