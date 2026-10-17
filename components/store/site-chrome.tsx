'use client';
import {usePathname} from 'next/navigation';
import {Header} from './header';
import {Footer} from './footer';
import {FloatingCart} from './floating-cart';
import {CartDrawer} from './cart-drawer';
export function SiteChrome({children}:{children:React.ReactNode}){const admin=usePathname().startsWith('/admin');return <div className={admin?'admin-surface':'storefront-shell baby-theme'}>{!admin&&<><a className="skip-link" href="#content">انتقلي إلى المحتوى</a><Header/></>}<div id="content">{children}</div>{!admin&&<><Footer/><FloatingCart/><CartDrawer/></>}</div>;}
