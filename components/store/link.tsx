import type {AnchorHTMLAttributes} from 'react';
// Use normal document navigation so store links work independently of the
// client router, including inside mobile in-app browsers.
export default function StoreLink(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props}/>;}
