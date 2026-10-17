import {env,waitUntil} from 'cloudflare:workers';

type OrderNotice={id:string;test:boolean;customer:{name:string;phone:string;region:string;city:string;address:string};items:{name:string;label:string;quantity:number;price:number}[];subtotal:number;discount:number;shipping:number;total:number;paymentMethod:'cash_on_delivery'};
type Config={WHATSAPP_ACCESS_TOKEN?:string;WHATSAPP_PHONE_NUMBER_ID?:string;WHATSAPP_ADMIN_NUMBER?:string;WHATSAPP_TEMPLATE_NAME?:string;WHATSAPP_TEMPLATE_LANGUAGE?:string;WHATSAPP_API_VERSION?:string};
const required=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_ADMIN_NUMBER','WHATSAPP_TEMPLATE_NAME','WHATSAPP_TEMPLATE_LANGUAGE','WHATSAPP_API_VERSION'] as const;
const clean=(value:unknown)=>String(value??'').replace(/[\s\u0000-\u001f\u007f]+/g,' ').trim();
const money=(value:number)=>(Math.round(value*100)/100).toFixed(2)+' ₪';
function log(orderId:string,reason:string,details:Record<string,unknown>={}){console.error(JSON.stringify({event:'whatsapp_order_notification_failed',orderId,reason,...details}));}
function redact(message:unknown,config:Config,order:OrderNotice){let result=clean(message);for(const secret of [config.WHATSAPP_ACCESS_TOKEN,config.WHATSAPP_ACCESS_TOKEN?.trim(),config.WHATSAPP_ADMIN_NUMBER,config.WHATSAPP_ADMIN_NUMBER?.replace(/[+\s()-]/g,''),config.WHATSAPP_PHONE_NUMBER_ID,order.customer.name,order.customer.phone,order.customer.address])if(secret)result=result.split(secret).join('[redacted]');return result.slice(0,300);}
function chunks(text:string){const parts:string[]=[];let remaining=Array.from(text);while(remaining.length){parts.push(remaining.slice(0,900).join(''));remaining=remaining.slice(900);}return parts.length?parts:['لا توجد منتجات'];}
export function orderTemplateParameters(order:OrderNotice){const products=order.items.map(item=>`${clean(item.name)}${item.label?' — '+clean(item.label):''} | الكمية: ${item.quantity} | سعر القطعة: ${money(item.price)} | المجموع: ${money(item.price*item.quantity)}`).join(' ؛ ');const parts=chunks(products);return parts.map((part,i)=>[
 clean(order.id)+(order.test?' (طلب تجريبي)':'')+(parts.length>1?` (جزء ${i+1}/${parts.length})`:''),
 clean(order.customer.name),clean(order.customer.phone),clean(order.customer.region),clean(order.customer.city+' — '+order.customer.address),part,
 money(order.subtotal),money(order.discount),money(order.shipping),money(order.total),'الدفع عند الاستلام'
 ]);}
// Called only after the order transaction commits. All notification failures are isolated.
export async function sendWhatsAppOrderNotice(order:OrderNotice){const config=env as unknown as Config;const missing=required.filter(key=>!config[key]?.trim());if(missing.length){log(order.id,'not_configured',{missing});return;}
const token=config.WHATSAPP_ACCESS_TOKEN!.trim(),sender=config.WHATSAPP_PHONE_NUMBER_ID!.trim(),recipient=config.WHATSAPP_ADMIN_NUMBER!.replace(/[+\s()-]/g,''),version=config.WHATSAPP_API_VERSION!.trim(),template=config.WHATSAPP_TEMPLATE_NAME!.trim(),language=config.WHATSAPP_TEMPLATE_LANGUAGE!.trim();
if(!/^\d{5,30}$/.test(sender)||!/^\d{8,15}$/.test(recipient)||!/^v\d{1,2}\.\d{1,2}$/.test(version)||!/^[a-z0-9_]{1,512}$/.test(template)||!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)){log(order.id,'invalid_configuration');return;}
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let accepted=0;
try{const batches=orderTemplateParameters(order);for(const parameters of batches){const response=await fetch(`https://graph.facebook.com/${version}/${sender}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:recipient,type:'template',template:{name:template,language:{code:language},components:[{type:'body',parameters:parameters.map(text=>({type:'text',text}))}]}})});
const payload=await response.json().catch(()=>null) as any;
if(!response.ok||!payload?.messages?.[0]?.id){const error=payload?.error;log(order.id,'cloud_api_rejected',{httpStatus:response.status,code:typeof error?.code==='number'?error.code:undefined,subcode:typeof error?.error_subcode==='number'?error.error_subcode:undefined,message:error?.message?redact(error.message,config,order):'لم يقبل WhatsApp الرسالة',acceptedParts:accepted});return;}
accepted++;console.info(JSON.stringify({event:'whatsapp_order_notification_accepted',orderId:order.id,part:accepted,parts:batches.length,messageId:payload.messages[0].id}));
}}catch{log(order.id,controller.signal.aborted?'timeout':'network_or_processing_error',{acceptedParts:accepted});}finally{clearTimeout(timer);}}
export function queueWhatsAppOrderNotice(order:OrderNotice){try{waitUntil(sendWhatsAppOrderNotice(order).catch(()=>log(order.id,'unexpected_notification_error')));}catch{log(order.id,'background_scheduling_failed');}}
