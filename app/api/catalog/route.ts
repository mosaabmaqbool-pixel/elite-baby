import {catalog} from '../../../lib/admin/catalog-db';
export async function GET(){try{return Response.json(await catalog(),{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'تعذر تحميل المنتجات'}, {status:503,headers:{'Cache-Control':'no-store'}});}}
