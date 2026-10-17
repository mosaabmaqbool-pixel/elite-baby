import type {AnchorHTMLAttributes} from 'react';
// Admin sections share one catch-all page. A document navigation ensures that
// the server checks the session and renders the requested section every time.
export function AdminLink(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props}/>;}
