export const shippingRegions=[{id:'westBank',name:'الضفة الغربية'},{id:'jerusalem',name:'القدس'},{id:'interior',name:'الداخل المحتل'}] as const;
export type ShippingRates=Record<typeof shippingRegions[number]['id'],number>;
export function normalizeShippingRates(saved:{shipping?:number;shippingRates?:Partial<ShippingRates>}){return Object.fromEntries(shippingRegions.map(r=>[r.id,saved.shippingRates?.[r.id]??saved.shipping??0])) as ShippingRates;}
export function shippingPrice(settings:{testMode:boolean;shipping:number;shippingRates?:Partial<ShippingRates>},region:string){const item=shippingRegions.find(r=>r.name===region);return !item?0:normalizeShippingRates(settings)[item.id];}
