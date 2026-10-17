'use client';

import {useEffect,useRef} from 'react';
import {LoaderCircle,Minus,Plus,ShoppingCart,Trash2,X} from 'lucide-react';
import Link from './link';
import {imagePath,price} from '../../lib/catalog';
import {useStore} from './provider';
import './cart-drawer.css';

export function CartDrawer(){
  const {cart,cartOpen,closeCart,busy,ready,error,refresh,mutate,settings}=useStore();
  const dialog=useRef<HTMLDialogElement>(null);
  const count=cart.reduce((n,item)=>n+item.quantity,0);
  const subtotal=cart.reduce((n,item)=>n+item.price*item.quantity,0);
  const unavailable=cart.some(item=>item.unavailable);

  useEffect(()=>{
    const node=dialog.current;
    if(!cartOpen||!node)return;
    const active=document.activeElement;
    const body=document.body;
    const previous={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow};
    const scroll={x:window.scrollX,y:window.scrollY};
    // A fixed body also locks background scrolling on mobile Safari.
    body.style.position='fixed';body.style.top=`-${scroll.y}px`;body.style.left=`-${scroll.x}px`;body.style.width='100%';body.style.overflow='hidden';
    node.showModal();
    return ()=>{
      if(node.open)node.close();
      Object.assign(body.style,previous);
      window.scrollTo({left:scroll.x,top:scroll.y,behavior:'instant'});
      if(active instanceof HTMLElement&&active.isConnected)active.focus({preventScroll:true});
    };
  },[cartOpen,closeCart]);

  return <dialog id="storekit-cart-drawer" ref={dialog} className="cart-drawer" aria-labelledby="storekit-cart-title" aria-modal="true" dir="rtl"
    onCancel={event=>{event.preventDefault();closeCart();}}
    onClose={()=>{if(!dialog.current?.open)closeCart();}}
    onClick={event=>{if(event.target===event.currentTarget)closeCart();}}>
    {cartOpen&&<div className="cart-drawer-panel">
      <header className="cart-drawer-header">
        <span className="cart-drawer-brand" lang="en">ELITE BABY</span>
        <div className="cart-drawer-heading"><h2 id="storekit-cart-title">سلتك</h2><span className="cart-drawer-count" aria-label={'عدد القطع: '+count}>{count.toLocaleString('ar')}</span>
          <button type="button" className="cart-drawer-close" onClick={closeCart} aria-label="إغلاق السلة"><X size={25}/></button>
        </div>
      </header>

      <div className="cart-drawer-items" aria-busy={busy}>
        {error&&<div className="cart-drawer-error" role="alert"><p>{error}</p><button type="button" onClick={()=>void refresh()} disabled={busy}>تحديث السلة</button></div>}
        {!ready?<div className="cart-drawer-empty" role="status">{!error&&<LoaderCircle size={28} className="cart-drawer-spinner"/>}<p>{error?'تعذر تحميل السلة. جرّبي تحديثها.':'جارٍ تحميل السلة…'}</p></div>
          :!cart.length?<div className="cart-drawer-empty"><ShoppingCart size={40}/><h3>سلتك بانتظار أول قطعة</h3><p>اختاري ما يعجبك وأضيفيه إلى السلة.</p><Link href="/products" className="cart-drawer-browse">تصفّحي المنتجات</Link></div>
          :<ul className="cart-drawer-list">{cart.map(item=>{
            const label=item.name+(item.label?'، '+item.label:'');
            return <li className="cart-drawer-item" key={item.product+':'+item.option}>
              <Link href={'/product/'+encodeURIComponent(item.product)} className="cart-drawer-photo" aria-label={'تفاصيل '+label}>
                {item.image?<img src={imagePath(item.image)} alt={label} width={112} height={128} loading="lazy"/>:<ShoppingCart size={28}/>}
              </Link>
              <div className="cart-drawer-copy"><h3><Link href={'/product/'+encodeURIComponent(item.product)}>{item.name}</Link></h3>{item.label&&<p className="cart-drawer-option">{item.label}</p>}
                <strong className="cart-drawer-price">{price(item.price)}</strong>
                {item.quantity>1&&<p className="cart-drawer-line-total">مجموع القطعة: {price(item.price*item.quantity)}</p>}
                {item.unavailable&&<p className="cart-drawer-unavailable">الكمية أو الخيار غير متاح. عدّلي الكمية أو أزيلي القطعة.</p>}
              </div>
              <div className="cart-drawer-item-actions">
                <div className="cart-drawer-quantity" role="group" aria-label={'كمية '+label}>
                  <button type="button" disabled={busy||item.quantity<=1} aria-label={'تقليل كمية '+label} onClick={()=>void mutate({action:'quantity',product:item.product,option:item.option,quantity:item.quantity-1})}><Minus size={19}/></button>
                  <output aria-label={'الكمية: '+item.quantity}>{item.quantity.toLocaleString('ar')}</output>
                  <button type="button" disabled={busy||item.quantity>=Math.min(20,item.stock??20)} aria-label={'زيادة كمية '+label} onClick={()=>void mutate({action:'quantity',product:item.product,option:item.option,quantity:item.quantity+1})}><Plus size={19}/></button>
                </div>
                <button type="button" className="cart-drawer-remove" disabled={busy} aria-label={'إزالة '+label+' من السلة'} onClick={()=>void mutate({action:'quantity',product:item.product,option:item.option,quantity:0},'تمت إزالة القطعة')}><Trash2 size={21}/><span>إزالة</span></button>
              </div>
            </li>;
          })}</ul>}
      </div>

      <footer className="cart-drawer-footer">
        {ready&&cart.length>0&&<>
          <div className="cart-drawer-subtotal"><span>المجموع الفرعي</span><strong>{price(subtotal)}</strong></div>
          <p className="cart-drawer-shipping">التوصيل يُحسب حسب المنطقة عند إتمام الطلب.</p>
          <p className="cart-drawer-status" role="status" aria-live="polite">{busy&&<><LoaderCircle size={15} className="cart-drawer-spinner"/> جارٍ تحديث السلة…</>}</p>
          {unavailable?<p className="cart-drawer-checkout-note" role="status">راجعي القطع غير المتاحة قبل إتمام الطلب.</p>:!settings.checkoutEnabled?<p className="cart-drawer-checkout-note" role="status">استقبال الطلبات متوقف مؤقتًا.</p>:null}
          {busy||unavailable||!settings.checkoutEnabled?<button type="button" className="cart-drawer-checkout" disabled>إتمام الطلب</button>:<Link href="/checkout" className="cart-drawer-checkout">إتمام الطلب</Link>}
        </>}
        <button type="button" className="cart-drawer-continue" onClick={closeCart}>متابعة التسوّق</button>
      </footer>
    </div>}
  </dialog>;
}
