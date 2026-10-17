import type {Product} from './catalog';
import type {Variant} from './store-config';
export const designGroup=(p:Product)=>p.optionGroups?.find(g=>g.kind==='design'&&g.active);
export function visibleDesigns(p:Product){const g=designGroup(p);return g?g.values.filter(x=>x.active&&p.variants?.some(v=>v.active&&v.selections[g.id]===x.id)):[];}
export const inStock=(v:Variant)=>v.available&&(v.stock===null||v.stock>0);

// Reuse stable variant IDs and overrides while changing the ordered option values.
export function rebuildVariants(product:any,optionGroups:any[]){
 const groups=optionGroups.filter(g=>g.active);if(!groups.length)return [];
 let combinations:Record<string,string>[]=[{}];
 for(const g of groups){const values=g.values.filter((v:any)=>g.kind==='design'||v.active);if(!values.length)return [];combinations=combinations.flatMap(c=>values.map((v:any)=>({...c,[g.id]:v.id})));if(combinations.length>2000)throw new Error('التركيبات تتجاوز 2000. قسّمي المنتج إلى مجموعات أصغر.');}
 const signature=(s:any)=>Object.entries(s).sort().map(x=>x.join(':')).join('|');
 return combinations.map((selections,sortOrder)=>{const existing=product.variants.find((v:any)=>signature(v.selections)===signature(selections));const d=groups.find(g=>g.kind==='design'),value=d?.values.find((x:any)=>x.id===selections[d.id]);return {...(existing||{id:crypto.randomUUID(),sku:'',price:'',salePrice:'',stock:product.stock??'',active:true,available:true,images:product.variants.find((v:any)=>d&&v.selections[d.id]===value?.id&&v.images?.length)?.images|| (value?.image?[value.image]:[])}),selections,sortOrder,name:value?.label,label:groups.map(g=>g.name+': '+g.values.find((x:any)=>x.id===selections[g.id])?.label).join(' · ')};});
}

export function selectVariant(p:Product,group:string,value:string,selection:Record<string,string>){const groups=p.optionGroups?.filter(g=>g.active)||[];const candidates=p.variants?.filter(v=>v.active&&inStock(v)&&v.selections[group]===value&&groups.every(g=>g.values.some(x=>x.active&&x.id===v.selections[g.id])))||[];return candidates.find(v=>groups.every(g=>g.id===group||v.selections[g.id]===selection[g.id]))||candidates[0];}

export const displayImage=(p:Product)=>p.productImage||visibleDesigns(p)[0]?.image||p.image;

// Adding a second design includes the product already entered as the first design.
export function appendDesign(product:any){
 const current=product.optionGroups.find((g:any)=>g.kind==='design');
 const added={id:crypto.randomUUID(),label:'',image:'',active:true};
 if(current){const optionGroups=product.optionGroups.map((g:any)=>g.id===current.id?{...g,values:[...g.values,added]}:g);return {...product,optionGroups,variants:rebuildVariants(product,optionGroups)};}
 if(!product.images?.[0])throw new Error('أضيفي صورة للتصميم الأول في حقل «صور المنتج / التصميم الأول» قبل إضافة تصميم جديد.');
 const first={id:crypto.randomUUID(),label:product.firstDesignName?.trim()||'التصميم الأول',image:product.images[0],active:true};
 const group={id:crypto.randomUUID(),name:'التصميم',kind:'design',active:true,values:[first,added]};
 const optionGroups=[...product.optionGroups,group];
 const signature=(s:any)=>JSON.stringify(Object.entries(s).sort());
 const variants=rebuildVariants(product,optionGroups).map((v:any)=>{
  if(v.selections[group.id]!==first.id)return v;
  const selections={...v.selections};delete selections[group.id];
  const old=product.variants.find((x:any)=>signature(x.selections)===signature(selections));
  return {...v,...(old?{id:old.id,sku:old.sku,price:old.price,salePrice:old.salePrice,stock:old.stock,active:old.active,available:old.available,images:old.images?.length?old.images:product.images}:{sku:product.sku||'',stock:product.stock??'',available:product.available!==false,images:[...product.images]})};
 });
 return {...product,optionGroups,variants};
}

// A single fixed option is not a customer choice; preserve its variant ID in the cart.
export function cardCartChoice(p:Product){
 const groups=p.optionGroups?.filter(g=>g.active)||[];
 const requiresChoice=groups.some(g=>g.kind==='design'||g.values.filter(v=>v.active).length>1);
 const variants=p.variants?.filter(v=>v.active&&inStock(v)&&groups.every(g=>g.values.some(x=>x.active&&x.id===v.selections[g.id])))||[];
 return {requiresChoice,variant:groups.length?variants[0]:undefined,sellable:p.available!==false&&(groups.length?variants.length>0:p.stock!==0)};
}

// Gallery edits retain every design/variant identity, price and stock override.
export function setDesignImages(product:any,designId:string,images:string[]){
 const group=product.optionGroups.find((g:any)=>g.kind==='design');
 if(!group?.values.some((v:any)=>v.id===designId))return product;
 return {...product,
  optionGroups:product.optionGroups.map((g:any)=>g.id===group.id?{...g,values:g.values.map((v:any)=>v.id===designId?{...v,image:images[0]||''}:v)}:g),
  variants:product.variants.map((v:any)=>v.selections[group.id]===designId?{...v,images:[...images]}:v)
 };
}
