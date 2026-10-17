'use client';
import {useEffect,useRef,useState} from 'react';
import type {KeyboardEvent,PointerEvent} from 'react';
import {ChevronLeft,ChevronRight,Maximize2,Plus,Minus,X} from 'lucide-react';
import {imagePath} from '../../lib/catalog';
import './image-gallery.css';

type Props={src:string;alt:string;images?:string[];onImageChange?:(src:string)=>void};
type Gesture={id:number;x:number;y:number;gallery:string};

export function ProductImage({src,alt,images,onImageChange}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const viewport=useRef<HTMLDivElement>(null);
  const gesture=useRef<Gesture|null>(null);
  const suppressClick=useRef(false);
  const [open,setOpen]=useState(false),[scale,setScale]=useState(1);
  const photos=[...new Set((images?.length?images:[src]).filter(Boolean))];
  const current=photos.includes(src)?src:photos[0]||src;
  const index=Math.max(0,photos.indexOf(current));
  const multiple=photos.length>1&&!!onImageChange;
  const gallery=photos.join('\n');
  const position=`${(index+1).toLocaleString('ar')} / ${photos.length.toLocaleString('ar')}`;

  function move(step:number){
    if(!multiple)return;
    const next=index+step;
    if(next<0||next>=photos.length)return;
    onImageChange?.(photos[next]);
  }
  function begin(event:PointerEvent<HTMLElement>,enabled:boolean){
    suppressClick.current=false;
    if(event.isPrimary===false){gesture.current=null;suppressClick.current=true;return;}
    if(!enabled||event.button!==0)return;
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,gallery};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function track(event:PointerEvent<HTMLElement>){
    const start=gesture.current;
    if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>8)suppressClick.current=true;
  }
  function finish(event:PointerEvent<HTMLElement>,enabled:boolean){
    const start=gesture.current;
    if(!start||start.id!==event.pointerId)return;
    gesture.current=null;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.hypot(dx,dy)>8)suppressClick.current=true;
    if(enabled&&start.gallery===gallery&&Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.4)move(dx<0?1:-1);
  }
  function cancel(){if(gesture.current)suppressClick.current=true;gesture.current=null;}
  function keyboard(event:KeyboardEvent<HTMLElement>,enabled=true){
    if(!multiple||!enabled)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?1:-1);}
  }
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.showModal();
    return ()=>{dialog.current?.close();document.body.style.overflow=previous;};
  },[open]);
  useEffect(()=>{setScale(1);viewport.current?.scrollTo(0,0);},[current,open]);
  function close(){setOpen(false);}
  return <>
    <div className="detail-image product-image-button product-image-gallery" role="group" aria-label={'صور '+alt} onKeyDown={event=>keyboard(event)}>
      <button className="product-gallery-open" type="button" data-gallery-swipe={multiple?'true':undefined}
        onPointerDown={event=>begin(event,multiple)} onPointerMove={track} onPointerUp={event=>finish(event,multiple)} onPointerCancel={cancel}
        onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')suppressClick.current=false;}}
        onClick={event=>{if(suppressClick.current){event.preventDefault();suppressClick.current=false;return;}setOpen(true);}}
        aria-label={'تكبير صورة '+alt+(multiple?'، الصورة '+(index+1)+' من '+photos.length:'')} aria-haspopup="dialog">
        <img src={imagePath(current)} alt={alt} draggable={false}/>
        <span className="image-expand"><Maximize2 size={18}/> تكبير الصورة</span>
      </button>
      {multiple&&<>
        <span className="product-gallery-position" aria-live="polite" aria-atomic="true">{position}</span>
        <button type="button" className="product-gallery-nav product-gallery-previous" onClick={()=>move(-1)} disabled={index===0} aria-label="الصورة السابقة"><ChevronRight size={22}/></button>
        <button type="button" className="product-gallery-nav product-gallery-next" onClick={()=>move(1)} disabled={index===photos.length-1} aria-label="الصورة التالية"><ChevronLeft size={22}/></button>
      </>}
    </div>
    {open&&<dialog ref={dialog} className="image-zoom-dialog" aria-label={'صورة مكبرة: '+alt} onKeyDown={event=>keyboard(event,scale===1)} onCancel={close} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <div className="image-zoom-header"><strong>{alt}</strong><button type="button" className="icon-button" onClick={close} aria-label="إغلاق الصورة"><X size={22}/></button></div>
      <div className="image-zoom-viewport" ref={viewport} data-gallery-swipe={multiple&&scale===1?'true':undefined}
        onPointerDown={event=>begin(event,multiple&&scale===1)} onPointerMove={track} onPointerUp={event=>finish(event,multiple&&scale===1)} onPointerCancel={cancel}>
        <div className="image-zoom-canvas" style={{width:scale*100+'%',height:scale*100+'%'}}><img src={imagePath(current)} alt={alt} draggable={false}/></div>
      </div>
      {multiple&&<div className="product-gallery-zoom-nav"><button type="button" className="product-gallery-nav" onClick={()=>move(-1)} disabled={index===0} aria-label="الصورة السابقة"><ChevronRight size={22}/></button><span aria-live="polite" aria-atomic="true">{position}</span><button type="button" className="product-gallery-nav" onClick={()=>move(1)} disabled={index===photos.length-1} aria-label="الصورة التالية"><ChevronLeft size={22}/></button></div>}
      <div className="image-zoom-tools"><button type="button" className="icon-button" aria-label="تصغير الصورة" disabled={scale<=1} onClick={()=>setScale(s=>Math.max(1,s-.5))}><Minus size={20}/></button><output aria-live="polite">{Math.round(scale*100)}٪</output><button type="button" className="icon-button" aria-label="تكبير الصورة" disabled={scale>=3} onClick={()=>setScale(s=>Math.min(3,s+.5))}><Plus size={20}/></button><button type="button" className="text-link" onClick={()=>setScale(1)}>الحجم الأصلي</button></div>
      <p className="image-zoom-hint">{multiple&&scale===1?'اسحبي لليسار للصورة التالية، ولليمين للصورة السابقة، أو كبّري الصورة لرؤية التفاصيل.':'كبّري الصورة، ثم اسحبي لعرض التفاصيل.'}</p>
    </dialog>}
  </>;
}
