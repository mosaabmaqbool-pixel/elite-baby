'use client';
import {ShoppingCart} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useStore} from './provider';

export function FloatingCart(){
  const {cart,ready,cartAdded,cartOpen,openCart}=useStore();
  const path=usePathname();
  const count=cart.reduce((total,item)=>total+item.quantity,0);
  if(!ready||!count||path==='/cart'||path==='/checkout')return null;
  return <button type="button" key={cartAdded} onClick={openCart} data-cart-trigger aria-haspopup="dialog" aria-controls="storekit-cart-drawer" aria-expanded={cartOpen} className={'floating-cart'+(cartAdded?' floating-cart-arriving':'')} aria-label={'فتح سلة المشتريات، '+count+' قطعة'}>
    <ShoppingCart size={26} aria-hidden="true"/>
    <span className="floating-cart-count" aria-hidden="true">{count}</span>
  </button>;
}
