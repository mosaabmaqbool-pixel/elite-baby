'use client';
import {childCategories,categoryMatches} from '../../lib/category-tree';
import {price} from '../../lib/catalog';
import {orderCategoryProducts} from '../../lib/category-product-order';
import {Dropdown} from '../shared/dropdown';
import Link from './link';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';

import {ProductGrid} from './products';
import {CategoryCards} from './home';
import {useStore} from './provider';
export function Catalog({category,mode}:{category?:string;mode?:'offers'|'wishlist'}){
 const params=useSearchParams();
 const {wishlist,products,categories,categoryName,content}=useStore();
 const [sort,setSort]=useState('featured');
 const [priceLimit,setPriceLimit]=useState<{scope:string;value:number}|null>(null);
 const query=params.get('q')||'';
 const scope=JSON.stringify([category||'all',mode||'',query]);
 const selectedCategory=categories.find(c=>c.id===category);
 const parentId=selectedCategory?.parentId||category;
 const subcategories=parentId?childCategories(categories,parentId):[];
 const scopedProducts=products.filter(p=>categoryMatches(categories,p.category,category||'all')&&(!mode||(mode==='wishlist'?wishlist.includes(p.id):!!p.oldPrice)));
 // Calculate the ceiling before applying the price filter, so it never shrinks while dragging.
 const upper=scopedProducts.reduce((highest,p)=>Math.max(highest,p.price),0);
 const max=priceLimit?.scope===scope?Math.min(priceLimit.value,upper):upper;
 const norm=(s:string)=>s.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[\u064B-\u065F]/g,'');
 let items=scopedProducts.filter(p=>p.price<=max&&(!query||norm(`${p.name} ${categoryName(p.category)} ${p.short} ${p.description}`).includes(norm(query))));
 if(sort==='low')items.sort((a,b)=>a.price-b.price);
 if(sort==='high')items.sort((a,b)=>b.price-a.price);
 if(sort==='featured'&&selectedCategory)items=orderCategoryProducts(items,selectedCategory.productOrder);
 const title=mode==='wishlist'?'المفضلة':mode==='offers'?'العروض':query?'نتائج البحث':category?categoryName(category):'جميع المنتجات';
 return <main className="container page">
  <div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span>{selectedCategory?.parentId&&<><Link href={'/categories/'+selectedCategory.parentId}>{categoryName(selectedCategory.parentId)}</Link><span>/</span></>}<span>{title}</span></div>
  <div className="page-heading"><h1>{title}</h1>{query&&<p>{`نتائج البحث عن «${query}»`}</p>}</div>
  {subcategories.length>0&&<section aria-label="التصنيفات الفرعية"><h2>التصنيفات الفرعية</h2>
   <nav aria-label="اختيار التصنيف الفرعي" style={{display:'flex',flexWrap:'wrap',gap:12,marginBlock:'16px 24px'}}>
    {[{id:parentId!,name:'الكل'},...subcategories].map(c=><Link key={c.id} href={'/categories/'+c.id} aria-current={category===c.id?'page':undefined} className={'button'+(category===c.id?'':' gold')} style={{fontSize:18,fontWeight:600,minHeight:48,padding:'10px 22px',maxWidth:'100%',whiteSpace:'normal',overflowWrap:'anywhere',textAlign:'center'}}>{c.name}</Link>)}
   </nav>
  </section>}
  <p className="catalog-notice">{content.catalogNotice}</p>
  <div className="catalog-layout">
   <aside className="filters"><h3><SlidersHorizontal size={18}/> تصفية المنتجات</h3>
    <label style={{gridColumn:'1 / -1'}}>السعر حتى {price(max)}<input type="range" min="0" max={upper} step="any" value={max} disabled={upper===0} onChange={e=>setPriceLimit({scope,value:Math.max(0,Math.min(upper,Math.round(Number(e.target.value)*100)/100))})}/></label>
    <button className="text-link" onClick={()=>{setPriceLimit(null);setSort('featured');}}>إعادة ضبط الفلاتر</button>
   </aside>
   <section><div className="grid-toolbar"><span>{items.length.toLocaleString('ar')} قطع</span><Dropdown aria-label="ترتيب النتائج" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">ترتيبنا المقترح</option><option value="low">السعر: الأقل أولًا</option><option value="high">السعر: الأعلى أولًا</option></Dropdown></div>
    {items.length?<ProductGrid items={items}/>:<div className="empty-state"><Search size={38}/><h2>{mode==='wishlist'?'مفضلتك بانتظار أول قطعة':mode==='offers'?'لا توجد عروض مفعّلة حاليًا':'لا توجد قطع مطابقة'}</h2><p>{mode==='wishlist'?'اضغطي على القلب بجانب أي قطعة لحفظها هنا.':mode==='offers'?'يمكنك اكتشاف مجموعة المتجر كاملة.':'جرّبي تصنيفًا آخر أو نطاق سعر أوسع.'}</p><Link href="/products" className="button">تصفّحي جميع المنتجات</Link></div>}
   </section>
  </div>
 </main>;
}
export function CategoriesPage(){return <main className="container page"><div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>التصنيفات</span></div><div className="page-heading"><h1>التصنيفات</h1></div><CategoryCards/></main>;}
