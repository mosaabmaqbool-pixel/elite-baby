'use client';
import Link from './link';
import {Heart,Plus,Eye,X} from 'lucide-react';
import {useEffect,useRef,useState,useId} from 'react';
import {Product,price,imagePath} from '../../lib/catalog';
import {useStore} from './provider';
import {designGroup,visibleDesigns,displayImage,selectVariant,inStock,cardCartChoice} from '../../lib/product-designs';
import {effectivePrice} from '../../lib/store-config';
import {DesignSelector} from './design-selector';
import {ProductImage} from './image-zoom';
export function ProductCard({product:p}:{product:Product}){const {wishlist,mutate,busy,ready,categoryName}=useStore();const [quick,setQuick]=useState(false);const liked=wishlist.includes(p.id);const {requiresChoice,variant:cartVariant,sellable}=cardCartChoice(p);const badge=p.oldPrice?`خصم ${Math.round((1-p.price/p.oldPrice)*100)}٪`:p.badge;
return <article className="product-card"><div className="product-media" style={{background:p.color}}><button type="button" className="product-popup-trigger" onClick={()=>setQuick(true)} aria-haspopup="dialog" aria-label={'عرض صورة وشرح '+p.name}><img src={imagePath(displayImage(p))} alt={p.name} width="145" height="135" loading="lazy"/></button>{badge&&<span className="badge">{badge}</span>}<button className={'favorite '+(liked?'liked':'')} aria-label={(liked?'إزالة من المفضلة: ':'إضافة إلى المفضلة: ')+p.name} aria-pressed={liked} disabled={busy||!ready} onClick={()=>mutate({action:'favorite',product:p.id,active:!liked},liked?'تمت الإزالة من المفضلة':'تمت الإضافة إلى المفضلة')}><Heart size={18} fill={liked?'currentColor':'none'}/></button><button className="quick-button" onClick={()=>setQuick(true)} aria-label={'نظرة سريعة على '+p.name}><Eye size={17}/> نظرة سريعة</button></div><div className="product-info"><div className="product-meta"><span>{categoryName(p.category)}</span></div><h3><button type="button" className="product-title-trigger" onClick={()=>setQuick(true)} aria-haspopup="dialog">{p.name}</button></h3><p>{p.short}</p>{visibleDesigns(p).length>0&&<span className="design-count">متوفر بـ {visibleDesigns(p).length} تصميم</span>}<div className="product-bottom"><div className="prices"><strong>{price(p.price)}</strong>{p.oldPrice&&<del>{price(p.oldPrice)}</del>}</div><button className="button compact" disabled={busy||!ready||!sellable} onClick={()=>requiresChoice?(designGroup(p)?setQuick(true):window.location.assign('/product/'+p.id)):mutate({action:'add',product:p.id,quantity:1,option:cartVariant?'@'+cartVariant.id:'default'},'أُضيفت '+p.name+' إلى السلة')}><Plus size={17}/>{!sellable?'غير متوفر':designGroup(p)?'اختر التصميم':'أضف للسلة'}</button></div></div>{quick&&<QuickView product={p} close={()=>setQuick(false)}/>}</article>;
}
export function QuickView({product:p,close}:{product:Product;close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 const {mutate,busy,ready,categoryName}=useStore();
 const [selection,setSelection]=useState<Record<string,string>>({}),[main,setMain]=useState('');
 const dg=designGroup(p),selected=p.variants?.find(v=>v.active&&p.optionGroups?.filter(g=>g.active).every(g=>v.selections[g.id]===selection[g.id]));
 const images=selected?.images.length?selected.images:dg?[imagePath(displayImage(p))]:p.images?.length?p.images:[imagePath(p.image)];
 const current=images.includes(main)?main:images[0];
 const unit=effectivePrice({price:p.regularPrice??p.price,salePrice:p.salePrice},selected);
 const regular=selected?.price??p.regularPrice??p.price,sale=selected?.salePrice??(selected?.price!==undefined?undefined:p.salePrice);
 const additional=p.optionGroups?.some(g=>g.active&&g.kind!=='design'&&g.values.filter(v=>v.active).length>1);
 const allowed=p.available!==false&&(dg?!!selected&&inStock(selected):p.stock!==0);
 function choose(group:string,value:string){const next=selectVariant(p,group,value,selection);if(next){setSelection(next.selections);setMain('');}}
 async function add(){if(dg&&!selected)return;if(additional){window.location.assign('/product/'+p.id);return;}const variant=selected||p.variants?.find(v=>v.active&&inStock(v));if(await mutate({action:'add',product:p.id,option:variant?'@'+variant.id:'default',quantity:1},'تمت الإضافة إلى السلة'))close();}
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.showModal();return ()=>{ref.current?.close();document.body.style.overflow=previous;};},[]);
 return <dialog className="quick-dialog product-popup" ref={ref} aria-labelledby={titleId} onCancel={close} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
 <header className="product-popup-header"><div><span className="eyebrow">{categoryName(p.category)}</span><h2 id={titleId}>{p.name}</h2></div><button type="button" className="icon-button" onClick={close} aria-label="إغلاق"><X/></button></header>
 <div className="product-popup-body"><ProductImage src={current} images={images} onImageChange={setMain} alt={p.name+(selected?.label?' — '+selected.label:'')}/>{images.length>1&&<div className="gallery">{images.map((src,i)=><button key={src+i} type="button" className={src===current?'selected':''} aria-pressed={src===current} aria-label={'عرض صورة '+(i+1)} onClick={()=>setMain(src)}><img src={imagePath(src)} alt={p.name+(selected?.label?' — '+selected.label:'')}/></button>)}</div>}
 <DesignSelector product={p} selection={selection} choose={choose}/>{dg&&<p className="popup-design-status" role="status">{selected?selected.available&&(selected.stock===null||selected.stock>0)?'متوفر'+(selected.stock===null?'':' · '+selected.stock+' قطعة'):'غير متوفر':'اختاري التصميم لإضافته للسلة'}</p>}<section className="product-popup-description"><h3>تفاصيل المنتج</h3><p className="preserve-lines">{p.description||p.short}</p></section></div>
 <footer className="product-popup-footer"><div className="prices"><strong>{price(unit)}</strong>{sale!==undefined&&sale<regular&&<del>{price(regular)}</del>}</div><div className="product-popup-actions"><button className="button" disabled={busy||!ready||!allowed} onClick={add}><Plus size={18}/>{additional?'اختيار بقية الخيارات':'أضف للسلة'}</button><Link className="text-link" href={'/product/'+p.id}>كل التفاصيل والخيارات</Link></div></footer>
 </dialog>;
}
export function ProductGrid({items}:{items:Product[]}){return <div className="product-grid">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>;}
