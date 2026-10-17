import type {Metadata} from 'next';
import type {Product} from './catalog';
import {imagePath} from './catalog';
import {effectivePrice} from './store-config';
import type {Category,Settings} from './store-config';
export const noIndex={index:false,follow:false};
export function normalizeSiteUrl(value:string){const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('SITE_URL must be an absolute site origin');return u.origin;}
export const absoluteUrl=(origin:string,path:string)=>new URL(path,origin+'/').href;
export function plainDescription(text:string){return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160);}
export function imageUrl(origin:string,image:string){return absoluteUrl(origin,/^https?:\/\//.test(image)?image:imagePath(image));}
export function publicMetadata(origin:string,path:string,title:string,description:string,image='/images/elite-baby-logo.jpg'):Metadata{
 const url=absoluteUrl(origin,path),summary=plainDescription(description),photo=imageUrl(origin,image);
 return {title:{absolute:title},description:summary,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{type:'website',title,description:summary,url,siteName:'ELITE BABY',locale:'ar_PS',images:[{url:photo,alt:title}]},twitter:{card:'summary_large_image',title,description:summary,images:[photo]}};
}
export const productPath=(id:string)=>'/product/'+encodeURIComponent(id);
export const categoryPath=(id:string)=>'/categories/'+encodeURIComponent(id);
export function productMetadata(origin:string,p:Product){return publicMetadata(origin,productPath(p.id),'ELITE BABY | '+p.name,p.description||p.short,p.image||p.images?.[0]||'/images/elite-baby-logo.jpg');}
export function breadcrumb(origin:string,items:{name:string;path:string}[]){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,item:absoluteUrl(origin,x.path)}))};}
export function productSchema(origin:string,p:Product){
 const url=absoluteUrl(origin,productPath(p.id)),groups=p.optionGroups?.filter(g=>g.active)||[];
 const variants=p.variants?.filter(v=>v.active&&groups.every(g=>g.values.some(x=>x.active&&x.id===v.selections[g.id])))||[];
 const offer=(price:number,available:boolean,sku?:string,name?:string)=>({'@type':'Offer',url,price,priceCurrency:'ILS',availability:'https://schema.org/'+(available?'InStock':'OutOfStock'),...(sku?{sku}:{}),...(name?{name}: {})});
 const images=[p.image,...(p.images||[]),...variants.flatMap(v=>v.images||[])].filter(Boolean).map(i=>imageUrl(origin,i));
 return {'@context':'https://schema.org','@type':'Product','@id':url+'#product',name:p.name,image:[...new Set(images)],description:plainDescription(p.description||p.short),...(p.sku?{sku:p.sku}:{}),brand:{'@type':'Brand',name:'ELITE BABY'},url,
 offers:groups.length?variants.map(v=>offer(effectivePrice({price:p.regularPrice??p.price,salePrice:p.salePrice},v),p.available!==false&&v.available&&(v.stock===null||v.stock>0),v.sku,v.name||v.label)):offer(effectivePrice({price:p.regularPrice??p.price,salePrice:p.salePrice}),p.available!==false&&(p.stock===null||(typeof p.stock==='number'&&p.stock>0)),p.sku)};
}
export function homeSchema(origin:string,settings:Settings){return [{'@context':'https://schema.org','@type':'OnlineStore','@id':origin+'/#organization',name:'ELITE BABY',url:origin+'/',logo:imageUrl(origin,'/images/elite-baby-logo.jpg'),...(settings.phone?{telephone:settings.phone}:{}),...(settings.email?{email:settings.email}:{}),sameAs:[settings.facebook,settings.instagram].filter(x=>/^https?:\/\//.test(x))},{'@context':'https://schema.org','@type':'WebSite','@id':origin+'/#website',name:'ELITE BABY',url:origin+'/',inLanguage:'ar',publisher:{'@id':origin+'/#organization'}}];}
export function serializeJsonLd(data:unknown){return JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
export function sitemapXml(origin:string,products:Product[],categories:Category[]){const paths=['/','/products','/categories','/offers','/about',...products.map(p=>productPath(p.id)),...categories.map(c=>categoryPath(c.id))];const escape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(paths)].map(path=>'<url><loc>'+escape(absoluteUrl(origin,path))+'</loc></url>').join('')+'</urlset>';}
export function robotsText(origin:string){return 'User-agent: *\nAllow: /\nAllow: /api/media/\n'+['/admin','/login','/cart','/checkout','/account','/wishlist','/api/'].map(p=>'Disallow: '+p+'\n').join('')+'\nSitemap: '+absoluteUrl(origin,'/sitemap.xml')+'\n';}
