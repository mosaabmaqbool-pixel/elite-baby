'use client';
import Link from './link';
import {usePathname} from 'next/navigation';
import {Search,ShoppingBag,Heart,Menu,X,User,ArrowLeft} from 'lucide-react';
import {useEffect,useState} from 'react';
import {imagePath,price} from '../../lib/catalog';
import {useStore} from './provider';
export function Header(){
 const {cart,products,settings,content,cartOpen,openCart,categoryName}=useStore();
 const path=usePathname();const [query,setQuery]=useState(''),[focused,setFocused]=useState(false),[menu,setMenu]=useState(false);
 useEffect(()=>{setMenu(false);setFocused(false);},[path]);
 const norm=(s:string)=>s.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[\u064B-\u065F]/g,'');
 const results=products.filter(p=>norm(p.name+' '+p.short+' '+categoryName(p.category)).includes(norm(query.trim()))).slice(0,4);
 const count=cart.reduce((n,i)=>n+i.quantity,0);
 const links=[['/','الرئيسية'],['/products','جميع المنتجات'],['/categories','التصنيفات'],['/offers','العروض'],['/about','عن المتجر']];
 return <header className="site-header modern-header">
 <div className="modern-announcement"><div className="container"><span>{content.announcement}</span><Link href="/account/orders">تتبّع طلباتك <ArrowLeft size={13}/></Link></div></div>
 <div className="modern-header-main container">
 <Link href="/" className="modern-wordmark" aria-label={settings.storeName+' — الرئيسية'}><img className="baby-brand-logo" src="/images/elite-baby-logo.jpg" alt="شعار ELITE BABY" width="70" height="70"/><span className="baby-brand-type"><strong dir="ltr">{settings.storeName}</strong><small>BABY BOUTIQUE</small></span></Link>
 <form className="modern-search" action="/products" role="search"><Search size={19}/><input name="q" aria-label="ابحث عن منتج" placeholder="ابحثي عن شيء لصغيرك…" value={query} onChange={e=>{setQuery(e.target.value);setFocused(true);}} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),160)} onKeyDown={e=>{if(e.key==='Escape')setFocused(false);}}/><button type="submit">بحث</button>
 {focused&&query.trim()&&<div className="modern-search-results">{results.length?results.map(p=><Link key={p.id} href={'/product/'+p.id}><img src={imagePath(p.image)} alt=""/><span>{p.name}<small>{price(p.price)}</small></span><ArrowLeft size={15}/></Link>):<p>لا توجد منتجات مطابقة.</p>}<button type="submit">عرض جميع النتائج</button></div>}</form>
 <div className="modern-header-actions"><Link href="/account" aria-label="حسابي" className="modern-tool"><User size={21}/></Link><Link href="/wishlist" aria-label="المفضلة" className="modern-tool modern-wishlist"><Heart size={21}/></Link><button type="button" className="modern-tool modern-bag" data-cart-trigger onClick={openCart} aria-label={'السلة، '+count+' قطعة'} aria-haspopup="dialog" aria-controls="storekit-cart-drawer" aria-expanded={cartOpen}><ShoppingBag size={21}/><span>{count}</span></button><button type="button" className="modern-menu-toggle modern-tool" aria-label={menu?'إغلاق القائمة':'فتح القائمة'} aria-controls="modern-navigation" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button></div>
 </div><div className="modern-navigation-wrap"><nav id="modern-navigation" aria-label="التنقل الرئيسي" className={'modern-navigation container'+(menu?' is-open':'')}>{links.map(([href,label])=><Link key={href} href={href} aria-current={(href==='/'?path==='/':path.startsWith(href))?'page':undefined}>{label}</Link>)}<span className="modern-nav-note">اختَر ما يناسبك.</span></nav></div>
 </header>;
}
