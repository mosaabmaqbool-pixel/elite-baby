import {visibleCategories} from '../category-tree';
import {normalizeShippingRates} from '../shipping';
import {database} from '../../db/store';
import {products as originals,categories as originalCategories,Product,imagePath} from '../catalog';
import {defaultSettings,defaultContent,referenceContent,Category,Settings,Content,Variant,effectivePrice} from '../store-config';
export async function ensureCatalog(){const db=database();if(await db.prepare("SELECT key FROM store_settings WHERE key='catalog_seed_v1'").first())return;const statements:any[]=[];originalCategories.forEach((c,i)=>statements.push(db.prepare('INSERT INTO store_categories (id,data,active,position) VALUES (?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(c.id,JSON.stringify({...c,description:'وصف التصنيف'}),i)));originals.forEach((p,i)=>{const groups=[{id:'legacy',name:'الخيار المتاح',active:true,values:p.options.map((label,i)=>({id:'legacy-'+i,label,active:true}))}];const data={...p,images:[imagePath(p.image)],sku:'',available:true,featured:i<4,newArrival:p.badge==='جديد',optionGroups:groups,regularPrice:p.price};statements.push(db.prepare('INSERT INTO store_products (id,category,data,active,archived,stock,position,revision) VALUES (?,?,?,1,0,100,?,1) ON CONFLICT(id) DO NOTHING').bind(p.id,p.category,JSON.stringify(data),i));p.options.forEach((label,j)=>statements.push(db.prepare('INSERT INTO store_variants (id,product_id,data,stock,active) VALUES (?,?,?,100,1) ON CONFLICT(id) DO NOTHING').bind(p.id+'-legacy-'+j,p.id,JSON.stringify({id:p.id+'-legacy-'+j,label,legacyOption:label,selections:{legacy:'legacy-'+j},sku:'',images:[],available:true}))));});statements.push(db.prepare('INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING').bind('catalog_seed_v1','1'));await db.batch(statements);}
export async function settings(){const {results}=await database().prepare("SELECT key,value FROM store_settings WHERE key IN ('settings','content')").all<any>();const map=Object.fromEntries(results.map((r:any)=>[r.key,JSON.parse(r.value)]));return {settings:{...defaultSettings,...map.settings,shippingRates:normalizeShippingRates(map.settings||{})} as Settings,content:referenceContent(map.content) as Content};}
function categoriesFromRows(rows:any[],admin=false){
 const categories=rows.map((r:any)=>({...JSON.parse(r.data),id:r.id,active:!!r.active,position:r.position})) as Category[];
 return admin?categories:visibleCategories(categories);
}

// Category headings and metadata do not need products, variants or store settings.
export async function catalogCategories(){
 await ensureCatalog();
 const {results}=await database().prepare('SELECT * FROM store_categories WHERE active=1 ORDER BY position,id').all<any>();
 return categoriesFromRows(results);
}

export async function catalog(admin=false){
 await ensureCatalog();
 const db=database();
 const [ps,cs,vs,config]=await Promise.all([
  db.prepare(admin?'SELECT * FROM store_products ORDER BY position,id':'SELECT p.* FROM store_products p JOIN store_categories c ON c.id=p.category WHERE p.active=1 AND p.archived=0 AND c.active=1 ORDER BY p.position,p.id').all<any>(),
  db.prepare(admin?'SELECT * FROM store_categories ORDER BY position,id':'SELECT * FROM store_categories WHERE active=1 ORDER BY position,id').all<any>(),
  db.prepare(admin?'SELECT * FROM store_variants':'SELECT * FROM store_variants WHERE active=1').all<any>(),
  settings()
 ]);
 // Group once instead of repeatedly searching every variant for every product.
 const variantsByProduct=new Map<string,Variant[]>();
 for(const row of vs.results){
  const data=JSON.parse(row.data);
  const variant={...data,id:row.id,productId:row.product_id,stock:data.trackStock===false?null:row.stock,active:!!row.active} as Variant;
  const group=variantsByProduct.get(row.product_id);
  if(group)group.push(variant);else variantsByProduct.set(row.product_id,[variant]);
 }
 const products=ps.results.map((r:any)=>{
  const data=JSON.parse(r.data);
  const options=new Set<unknown>(data.options||[]);
  const price=data.salePrice??data.regularPrice??data.price;
  const displayImage=data.productImage||data.optionGroups?.find((g:any)=>g.kind==='design'&&g.active)?.values.find((x:any)=>x.active)?.image||data.image||data.images?.[0]||'';
  const variants=(variantsByProduct.get(r.id)||[]).filter((v:any)=>v.id&&(options.has('@'+v.id)||options.has(v.legacyOption))).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
  return {...data,productImage:data.productImage||'',image:displayImage,id:r.id,category:r.category,active:!!r.active,archived:!!r.archived,stock:data.trackStock===false?null:r.stock,revision:r.revision,position:r.position,price,oldPrice:data.salePrice!==undefined?data.regularPrice:undefined,variants} as Product;
 });
 const categories=categoriesFromRows(cs.results,admin);
 const visibleIds=new Set(categories.map(c=>c.id));
 return {products:admin?products:products.filter(p=>visibleIds.has(p.category)),categories,...config};
}
export async function resolveCart(productId:string,option:string,data?:Awaited<ReturnType<typeof catalog>>){data=data||await catalog();const p=data.products.find(x=>x.id===productId);if(!p||p.available===false)throw new Error('المنتج غير متاح');const v=p.variants?.find((x:any)=>'@'+x.id===option||x.legacyOption===option);if(p.optionGroups?.some(g=>g.active)&&!v)throw new Error('الخيار لم يعد متاحًا');if(v&&(!v.active||!v.available||!p.optionGroups?.filter(g=>g.active).every(g=>g.values.some(x=>x.id===v.selections[g.id]&&x.active))))throw new Error('الخيار غير متاح');return {p,v,price:effectivePrice({price:p.regularPrice??p.price,salePrice:p.salePrice},v),stock:v?v.stock:p.stock??(p.trackStock===false?null:0),option:v?'@'+v.id:'default',label:v?.label||'',image:v?.images?.[0]||p.productImage||p.image||p.images?.[0]};}
export async function cartLines(session:string){const data=await catalog();const {results}=await database().prepare('SELECT product,option,quantity FROM cart_items WHERE session=?').bind(session).all<any>();return Promise.all(results.map(async(item:any)=>{try{const {p,v,price,stock,label,image}=await resolveCart(item.product,item.option,data);return {...item,name:p.name,price,image,label,variantId:v?.id,selections:v?.selections||{},sku:v?.sku||p.sku,stock,unavailable:stock!==null&&item.quantity>stock};}catch{return {...item,name:'منتج غير متاح',price:0,image:'',label:item.option,stock:0,unavailable:true};}}));}
