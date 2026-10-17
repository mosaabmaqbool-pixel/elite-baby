'use client';
import {createContext,useCallback,useContext,useEffect,useState,ReactNode} from 'react';
import type {Product} from '../../lib/catalog';
import type {Category,Content,Settings} from '../../lib/store-config';
export type CartItem={product:string;option:string;quantity:number;name:string;price:number;image:string;label:string;sku?:string;variantId?:string;stock:number|null;unavailable:boolean};
export type Customer={id:string;name:string;phone:string;verified:boolean;csrf:string};
export type CustomerAddress={id:string;label:string;region:string;city:string;address:string;notes:string};
type State={customer:Customer|null;addresses:CustomerAddress[];cart:CartItem[];wishlist:string[];orders:any[]};
export type CatalogData={products:Product[];categories:Category[];settings:Settings;content:Content};
type Context=State & CatalogData & {cartAdded:number;cartOpen:boolean;openCart:()=>void;closeCart:()=>void;busy:boolean;ready:boolean;error:string;notice:string;mutate:(data:unknown,message?:string,options?:{openCart?:boolean})=>Promise<boolean>;refresh:()=>Promise<void>;notify:(message:string)=>void;categoryName:(id:string)=>string};
const Context=createContext<Context|null>(null);
export function StoreProvider({children,initialCatalog}:{children:ReactNode;initialCatalog:CatalogData}){const [catalog,setCatalog]=useState(initialCatalog),[state,setState]=useState<State>({cart:[],wishlist:[],orders:[],customer:null,addresses:[]});const [cartAdded,setCartAdded]=useState(0),[cartOpen,setCartOpen]=useState(false);const openCart=useCallback(()=>setCartOpen(true),[]),closeCart=useCallback(()=>setCartOpen(false),[]);const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
async function refresh(){try{const [r,c]=await Promise.all([fetch('/api/store',{cache:'no-store'}),fetch('/api/catalog',{cache:'no-store'})]);const data=await r.json() as any,catalog=await c.json() as any;if(!r.ok||!c.ok)throw new Error(data.error||catalog.error);setState(data);setCatalog(catalog);setError('');setReady(true);}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل السلة');}}
function notify(message:string){setNotice(message);}
// Keep legacy call-site options in Context; only the explicit openCart() action opens the drawer.
async function mutate(data:unknown,message?:string){if(busy)return false;setBusy(true);try{const r=await fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json',...(state.customer?{'X-CSRF-Token':state.customer.csrf}:{})},body:JSON.stringify(data)});const result=await r.json() as any;if(!r.ok)throw new Error(result.error);if(result.cart){setState(result);setReady(true);}setError('');if((data as {action?:string})?.action==='add'&&result.cart)setCartAdded(n=>n+1);if(message)notify(message);return true;}catch(e){setError(e instanceof Error?e.message:'حدث خطأ');return false;}finally{setBusy(false);}}
useEffect(()=>{if(!window.location.pathname.startsWith('/admin'))refresh();},[]);useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
return <Context.Provider value={{...state,...catalog,cartAdded,cartOpen,openCart,closeCart,busy,ready,error,notice,mutate,refresh,notify,categoryName:id=>catalog.categories.find(c=>c.id===id)?.name||'الكل'}}>{children}{notice&&!cartOpen&&<div className="toast" role="status">{notice}</div>}{error&&!cartOpen&&<div className="error-bar" role="alert">{error}<button onClick={refresh}>إعادة المحاولة</button><button aria-label="إغلاق التنبيه" onClick={()=>setError('')}>×</button></div>}</Context.Provider>;
}
export function useStore(){const ctx=useContext(Context);if(!ctx)throw new Error('StoreProvider missing');return ctx;}
