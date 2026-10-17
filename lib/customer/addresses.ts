import {HttpError} from '../admin/auth';
import {shippingRegions} from '../shipping';
export function addressInput(v:any){const label=String(v.label||'المنزل').trim(),city=String(v.city||'').trim(),address=String(v.address||'').trim(),notes=String(v.notes||'').trim(),region=String(v.region||'');if(label.length<1||label.length>50||city.length<2||city.length>100||address.length<5||address.length>500||notes.length>500||!shippingRegions.some(r=>r.name===region))throw new HttpError(400,'راجع بيانات العنوان والمنطقة');return {label,city,address,notes,region};}
