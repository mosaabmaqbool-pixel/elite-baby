'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ImageOff,Maximize2,X} from 'lucide-react';
import {imagePath} from '../../lib/catalog';
import './order-design-image.css';

type Props={image?:unknown;name:string;design?:string};

export function OrderDesignImage({image,name,design}:Props){
 // Read the order's existing image reference without looking up or saving media.
 const path=typeof image==='string'?image.trim():'';
 const src=path&&!path.startsWith('//')&&!path.includes(':')?imagePath(path):'';
 const [open,setOpen]=useState(false),[failedSrc,setFailedSrc]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),titleId=useId(),descriptionId=useId();
 const unavailable=!src||failedSrc===src;
 const alt='التصميم المطلوب: '+name+(design?' — '+design:'');
 useEffect(()=>{setOpen(false);},[src]);
 useEffect(()=>{
  if(!open)return;
  const node=dialog.current;if(!node)return;
  const previous=document.body.style.overflow;
  node.showModal();document.body.style.overflow='hidden';
  return ()=>{node.close();document.body.style.overflow=previous;trigger.current?.focus();};
 },[open]);
 function failed(){setFailedSrc(src);setOpen(false);}
 if(unavailable)return <span className="admin-order-image-unavailable" role="img" aria-label={'الصورة غير متوفرة: '+name}><ImageOff size={22} aria-hidden="true"/><span>الصورة غير متوفرة</span></span>;
 return <>
  <button ref={trigger} type="button" className="admin-order-image-open" aria-label={'تكبير صورة '+alt} aria-haspopup="dialog" onClick={()=>setOpen(true)}>
   <img src={src} alt={alt} width={88} height={88} loading="lazy" decoding="async" onError={failed}/>
   <span className="admin-order-image-hint" aria-hidden="true"><Maximize2 size={15}/></span>
  </button>
  {open&&<dialog ref={dialog} className="admin-order-image-dialog" aria-labelledby={titleId} aria-describedby={design?descriptionId:undefined}
   onCancel={event=>{event.preventDefault();setOpen(false);}} onClose={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
   <div className="admin-order-image-heading"><div><h3 id={titleId}>{name}</h3>{design&&<p id={descriptionId}>{design}</p>}</div><button type="button" aria-label="إغلاق صورة التصميم" onClick={()=>setOpen(false)}><X size={22}/></button></div>
   <img className="admin-order-image-full" src={src} alt={alt} decoding="async" onError={failed}/>
  </dialog>}
 </>;
}
