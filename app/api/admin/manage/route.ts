import {saveCategorySql,deleteCategorySql} from '../../../../lib/admin/category-records';
import {saveCategoryProductOrder} from '../../../../lib/admin/category-product-order';
import {env} from 'cloudflare:workers';
import {collectMediaIds,queueMediaCleanup,retryMediaCleanup} from '../../../../lib/admin/media-cleanup';
import {validAdminGender} from '../../../../lib/admin/copy';
import {shippingRegions,normalizeShippingRates} from '../../../../lib/shipping';
import {database} from '../../../../db/store';
import {catalog,settings} from '../../../../lib/admin/catalog-db';
import {requireApi,body,json,fail,HttpError,identity,validatePassword,hashPassword,verifyPassword,limit,audit,requirePermission,guardedSecurityBatch,securityGuard,auditStatement} from '../../../../lib/admin/auth';
import {productInput,text,money,quantity,optionalStock,image,link} from '../../../../lib/admin/validation';
import {can,normalizedPermissions} from '../../../../lib/admin/permissions';
import {defaultContent,defaultSettings} from '../../../../lib/store-config';

export async function GET(request:Request){
try{
const user=await requireApi(request);
const db=database(),all=await catalog(true);

const [orders,coupons,users]=await Promise.all([
db.prepare('SELECT o.*,m.status,m.notes,m.coupon,m.discount,m.test FROM preview_orders o LEFT JOIN order_management m ON m.order_id=o.id ORDER BY o.created_at DESC').all<any>(),
db.prepare('SELECT * FROM store_coupons ORDER BY code').all<any>(),
db.prepare("SELECT u.id,u.name,u.email,u.gender,u.active,u.primary_admin,u.force_password_change,u.temporary_password_expires,u.created_at,COALESCE(a.role,'admin') AS role,COALESCE(a.permissions,'[]') AS permissions FROM admin_users u LEFT JOIN admin_access a ON a.admin_id=u.id ORDER BY u.created_at").all<any>()
]);

const parsedOrders=orders.results.map((r:any)=>({
...r,
customer:JSON.parse(r.customer),
items:JSON.parse(r.items),
status:r.status||'new',
notes:r.notes||'',
test:r.test!==0
}));

const customers=can(user,'customers.view')
?(await db.prepare('SELECT c.id,c.name,c.phone_e164 AS phone,c.status,c.phone_verified_at,COUNT(o.id) order_count FROM customers c LEFT JOIN preview_orders o ON o.customer_id=c.id GROUP BY c.id').all()).results
:[];

return json({
...all,
products:can(user,'products.view')||can(user,'inventory.view')?all.products:[],
orders:can(user,'orders.view')?parsedOrders:[],
coupons:can(user,'coupons.view')?coupons.results.map((r:any)=>({
...JSON.parse(r.data),
id:r.id,
code:r.code,
active:!!r.active,
uses:r.uses
})):[],
users:user.primary_admin?users.results.map((u:any)=>({
...u,
role:u.primary_admin?'super':u.role,
permissions:JSON.parse(u.permissions)
})):[],
customers,
user:{
id:user.id,
name:user.name,
email:user.email,
gender:user.gender,
csrf:user.csrf,
primary_admin:user.primary_admin,
role:user.role,
permissions:user.permissions
}
});

}catch(e){
return fail(e);
}
}

export async function POST(request:Request){
try{
const user=await requireApi(request,true),
data=await body(request),
db=database();

const entity=String(data.entity||''),
action=String(data.action||'save'),
id=String(data.id||crypto.randomUUID());

if(id.length>100)
throw new HttpError(400,'معرّف غير صالح');

const keys:Record<string,string>={
product:'products.manage',
category:'categories.manage',
inventory:'inventory.manage',
order:'orders.manage',
coupon:'coupons.manage',
content:'content.manage',
user:'users.manage'
};

if(keys[entity])
requirePermission(user,keys[entity]);

if(entity==='reorder')
requirePermission(user,data.kind==='categories'?'categories.manage':'products.manage');

if(entity==='settings'){
const fields=Object.keys(data.value||{});
const social=['whatsapp','facebook','instagram'];

if(fields.some(k=>social.includes(k)))
requirePermission(user,'social.manage');

if(fields.some(k=>!social.includes(k)))
requirePermission(user,'settings.manage');
}

if(entity==='product'){

if(action==='delete'){

if(!user.primary_admin)
throw new HttpError(403,'حذف المنتجات متاح للسوبر أدمن فقط');

const row=await db
.prepare('SELECT id,data FROM store_products WHERE id=?')
.bind(id)
.first<any>();

if(!row)
throw new HttpError(404,'المنتج غير موجود');

const variantRows=await db
.prepare('SELECT data FROM store_variants WHERE product_id=?')
.bind(id)
.all<any>();

const mediaIds=collectMediaIds([
row.data,
...variantRows.results.map((variant:any)=>variant.data)
]);

await db.batch([
...queueMediaCleanup(db,mediaIds),
db.prepare('DELETE FROM cart_items WHERE product=?').bind(id),
db.prepare('DELETE FROM favorites WHERE product=?').bind(id),
db.prepare('DELETE FROM customer_favorites WHERE product=?').bind(id),
db.prepare('DELETE FROM store_variants WHERE product_id=?').bind(id),
db.prepare('DELETE FROM store_products WHERE id=?').bind(id)
]);

// Cleanup is attempted after the audit; pending IDs survive a failed R2 request.

}

else if(action==='duplicate'){

const all=await catalog(true),
p=all.products.find(x=>x.id===id);

if(!p)
throw new HttpError(404,'المنتج غير موجود');

const newId=crypto.randomUUID();

const clone={
...p,
name:p.name+' — نسخة',
active:false,
archived:false,
sku:'',
variants:p.variants?.map(v=>({
...v,
id:crypto.randomUUID(),
sku:''
}))
};

await saveProduct(newId,clone,db);

}

else if(['archive','restore','hide','show'].includes(action)){

const column=
action==='archive'||action==='restore'
?'archived'
:'active';

const value=
action==='archive'||action==='show'
?1
:0;

await db
.prepare(`UPDATE store_products SET ${column}=?,revision=revision+1 WHERE id=?`)
.bind(value,id)
.run();

}

else if(action==='save'){
await saveProduct(id,data.value,db);
}

else{
throw new HttpError(400,'عملية غير معروفة');
}

}

else if(entity==='category'){

if(action==='delete'){
const result=await db.prepare(deleteCategorySql).bind(id).run();
if(!result.meta.changes)
throw new HttpError(409,'لا يمكن حذف التصنيف: تأكد أنه موجود وانقل منتجاته وتصنيفاته الفرعية أولًا');
}
else if(action==='save'){
const v=data.value;
if(!v||typeof v!=='object')throw new HttpError(400,'بيانات التصنيف غير صالحة');
const name=text(v.name,100),parentId=text(v.parentId||'',100);
if(!name)throw new HttpError(400,'اسم التصنيف مطلوب');
const result=await db.prepare(saveCategorySql).bind(
id,
JSON.stringify({name,parentId,image:image(v.image||''),description:text(v.description||'',300),color:'#eeeeee'}),
v.active===false?0:1,
quantity(v.position||0),
parentId
).run();
if(!result.meta.changes)throw new HttpError(409,'اختر تصنيفًا رئيسيًا موجودًا. لا يمكن ربط التصنيف بنفسه أو نقل تصنيف يحتوي تصنيفات فرعية إلى داخل تصنيف آخر');
}
else{throw new HttpError(400,'عملية غير معروفة');}
}

else if(entity==='reorder'){

if(data.kind==='category-products')
return json(await saveCategoryProductOrder(db,user,data));

if(
!['categories','products'].includes(data.kind)
||!Array.isArray(data.ids)
||data.ids.length>1000
)
throw new HttpError(400,'ترتيب غير صالح');

const table=
data.kind==='categories'
?'store_categories'
:'store_products';

await db.batch(
data.ids.map(
(item:any,i:number)=>
db.prepare(`UPDATE ${table} SET position=? WHERE id=?`)
.bind(i,text(item,100))
)
);

}

else if(entity==='inventory'){

const {stock,trackStock}=optionalStock(data.stock);

const table=
data.variant
?'store_variants'
:'store_products';

const result=await db
.prepare(`UPDATE ${table} SET stock=?,data=json_set(data,'$.trackStock',json(?)) WHERE id=?`)
.bind(stock,JSON.stringify(trackStock),id)
.run();

if(!result.meta.changes)
throw new HttpError(404,'السجل غير موجود');

await db
.prepare(
data.variant
?'UPDATE store_products SET revision=revision+1 WHERE id=(SELECT product_id FROM store_variants WHERE id=?)'
:'UPDATE store_products SET revision=revision+1 WHERE id=?'
)
.bind(id)
.run();

}

else if(entity==='order'){

const config=await settings();

if(!config.settings.orderStatuses.some(x=>x.id===data.status))
throw new HttpError(400,'حالة الطلب غير صالحة');

if(!await db
.prepare('SELECT id FROM preview_orders WHERE id=?')
.bind(id)
.first())
throw new HttpError(404,'الطلب غير موجود');

await db
.prepare('INSERT INTO order_management (order_id,status,notes) VALUES (?,?,?) ON CONFLICT(order_id) DO UPDATE SET status=excluded.status,notes=excluded.notes')
.bind(
id,
data.status,
text(data.notes||'',10000)
)
.run();

}

else if(entity==='coupon'){

if(action==='delete'){

await db
.prepare('UPDATE store_coupons SET active=0 WHERE id=?')
.bind(id)
.run();

}

else{

const v=data.value,
code=text(v.code,50).toUpperCase();

if(!/^[A-Z0-9_-]{2,50}$/.test(code))
throw new HttpError(400,'رمز الكوبون: حروف إنجليزية وأرقام فقط');

if(!['percent','fixed'].includes(v.type))
throw new HttpError(400,'نوع خصم غير صالح');

const amount=money(v.amount);

if(amount<=0||(v.type==='percent'&&amount>100))
throw new HttpError(400,'قيمة الخصم غير صالحة');

const start=text(v.start||'',30),
end=text(v.end||'',30);

if(
(start&&!Number.isFinite(Date.parse(start)))
||(end&&!Number.isFinite(Date.parse(end)))
||(start&&end&&Date.parse(end)<Date.parse(start))
)
throw new HttpError(400,'راجعي تواريخ الكوبون');

const val={
code,
type:v.type,
amount,
minimum:money(v.minimum),
start,
end,
limit:quantity(v.limit),
active:v.active!==false
};

await db
.prepare('INSERT INTO store_coupons (id,code,data,active,uses) VALUES (?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET code=excluded.code,data=excluded.data,active=excluded.active')
.bind(
id,
code,
JSON.stringify(val),
val.active?1:0
)
.run();

}

}

else if(entity==='settings'||entity==='content'){

const current=await settings();

const val:any={
...current[entity]
};

for(const [key,value] of Object.entries(data.value||{})){

const defaults:any=
entity==='settings'
?defaultSettings
:defaultContent;

if(!(key in defaults))
throw new HttpError(400,'حقل إعداد غير معروف');

if(key==='shipping'&&data.value.shippingRates===undefined)
val.shippingRates=normalizeShippingRates({
shipping:money(value)
});

if(key==='shippingRates'){

if(
!value
||typeof value!=='object'
||Array.isArray(value)
||Object.keys(value).some(
k=>!shippingRegions.some(r=>r.id===k)
)
)
throw new HttpError(400,'أسعار توصيل غير صالحة');

val[key]=Object.fromEntries(
shippingRegions.map(
r=>[r.id,money((value as any)[r.id])]
)
);

continue;
}

if(key==='orderStatuses'){

if(
!Array.isArray(value)
||value.length<1
||value.length>30
)
throw new HttpError(400,'أضيفي حالة طلب واحدة على الأقل');

const ids=new Set();

val[key]=value.map((x:any)=>{

const id=text(x.id,50),
name=text(x.name,100);

if(!id||!name||ids.has(id))
throw new HttpError(400,'حالة طلب فارغة أو مكررة');

ids.add(id);

return {id,name};

});

continue;
}

if(typeof defaults[key]==='boolean'){

if(typeof value!=='boolean')
throw new HttpError(400,'حالة غير صالحة');

val[key]=value;

}

else if(typeof defaults[key]==='number'){

val[key]=
key==='lowStock'
?quantity(value)
:money(value);

}

else if(/Image$/.test(key)){

val[key]=image(value);

}

else if(/Link$/.test(key)){

val[key]=link(value);

}

else if(['facebook','instagram'].includes(key)){

const url=link(value);

if(url&&!url.startsWith('https://'))
throw new HttpError(400,'رابط اجتماعي غير صالح');

val[key]=url;

}

else if(key==='whatsapp'){

const n=text(value,30)
.replace(/[+\s()-]/g,'');

if(n&&!/^\d{8,15}$/.test(n))
throw new HttpError(400,'أدخلي رقم واتساب مع رمز البلد');

val[key]=n;

}

else{

val[key]=text(
value,
key==='storeName'
?100
:key==='phone'
?30
:key==='email'
?254
:key==='address'
?500
:key.endsWith('Title')
?200
:key.endsWith('Button')
?100
:12000
);

}

}

await db
.prepare('INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
.bind(entity,JSON.stringify(val))
.run();

}

else if(entity==='user'){

if(action==='create'){

const {name,email}=identity(data.value);

if(await db
.prepare('SELECT id FROM admin_users WHERE email=?')
.bind(email)
.first())
throw new HttpError(409,'البريد مستخدم مسبقًا');

const password=validatePassword(data.value.password);

if(password!==data.value.confirm)
throw new HttpError(400,'تأكيد كلمة المرور غير مطابق');

const gender=data.value.gender??'female';

if(!validAdminGender(gender))
throw new HttpError(400,'اختيار ذكر / أنثى غير صالح');

const role=data.value.role||'admin';

if(!['admin','staff'].includes(role))
throw new HttpError(400,'نوع الحساب غير صالح');

let permissions:string[];

try{
permissions=normalizedPermissions(
data.value.permissions||[]
);
}
catch{
throw new HttpError(400,'صلاحيات غير صالحة');
}

await db.batch([
db.prepare('INSERT INTO admin_users (id,name,email,password_hash,active,primary_admin,created_at,gender) VALUES (?,?,?,?,1,0,?,?)')
.bind(
id,
name,
email,
await hashPassword(password),
new Date().toISOString(),
gender
),
db.prepare('INSERT INTO admin_access (admin_id,role,permissions) VALUES (?,?,?)')
.bind(
id,
role,
JSON.stringify(permissions)
)
]);

}

else if(action==='reset-password'){

if(!user.primary_admin||id===user.id)
throw new HttpError(403,'إعادة التعيين متاحة للسوبر أدمن لحسابات الموظفين والأدمن فقط');

await limit(
request,
'admin-password-reset',
user.id
);

const actor=await db
.prepare('SELECT password_hash FROM admin_users WHERE id=?')
.bind(user.id)
.first<any>();

if(!await verifyPassword(
String(data.value?.current||''),
actor.password_hash
))
throw new HttpError(400,'كلمة مرور السوبر أدمن غير صحيحة');

const target=await db
.prepare('SELECT primary_admin,active,password_hash FROM admin_users WHERE id=?')
.bind(id)
.first<any>();

if(!target)
throw new HttpError(404,'الحساب غير موجود');

if(target.primary_admin)
throw new HttpError(403,'لا يمكن إعادة تعيين حساب سوبر أدمن بهذه الطريقة');

if(!target.active)
throw new HttpError(409,'الحساب معطّل. إعادة التعيين لا تعيد تفعيله');

const password=validatePassword(
data.value?.password
);

if(password!==data.value?.confirm)
throw new HttpError(400,'تأكيد كلمة المرور غير مطابق');

if(await verifyPassword(
password,
target.password_hash
))
throw new HttpError(400,'يجب اختيار كلمة مرور مؤقتة جديدة');

const guard=crypto.randomUUID(),
expires=Date.now()+24*60*60*1000;

await guardedSecurityBatch([
db.prepare('UPDATE admin_users SET password_hash=?,force_password_change=1,temporary_password_expires=? WHERE id=? AND primary_admin=0 AND active=1 AND password_hash=? AND EXISTS (SELECT 1 FROM admin_users a JOIN admin_sessions s ON s.admin_id=a.id WHERE a.id=? AND a.primary_admin=1 AND a.active=1 AND a.force_password_change=0 AND a.password_hash=? AND s.hash=? AND s.expires>?)')
.bind(
await hashPassword(password),
expires,
id,
target.password_hash,
user.id,
actor.password_hash,
user.sessionHash,
Date.now()
),
securityGuard(db,guard),
db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(id),
auditStatement(
db,
user.id,
'admin_forced_password_reset',
id
),
db.prepare('DELETE FROM inventory_guards WHERE id=?').bind(guard)
]);

return json({
success:true,
id
});

}

else if(action==='access'){

const target=await db
.prepare('SELECT primary_admin,gender FROM admin_users WHERE id=?')
.bind(id)
.first<any>();

if(!target)
throw new HttpError(404,'الحساب غير موجود');

if(target.primary_admin)
throw new HttpError(409,'صلاحيات السوبر أدمن محفوظة ولا يمكن تخفيضها');

const gender=data.value.gender??target.gender;

if(!validAdminGender(gender))
throw new HttpError(400,'اختيار ذكر / أنثى غير صالح');

const role=data.value.role;

if(!['admin','staff'].includes(role))
throw new HttpError(400,'نوع الحساب غير صالح');

let permissions:string[];

try{
permissions=normalizedPermissions(
data.value.permissions||[]
);
}
catch{
throw new HttpError(400,'صلاحيات غير صالحة');
}

await db.batch([
db.prepare('UPDATE admin_users SET gender=? WHERE id=?')
.bind(gender,id),

db.prepare('INSERT INTO admin_access (admin_id,role,permissions) VALUES (?,?,?) ON CONFLICT(admin_id) DO UPDATE SET role=excluded.role,permissions=excluded.permissions')
.bind(
id,
role,
JSON.stringify(permissions)
),

db.prepare('DELETE FROM admin_sessions WHERE admin_id=?')
.bind(id)
]);

}

else if(action==='toggle'){

const target=await db
.prepare('SELECT primary_admin,gender FROM admin_users WHERE id=?')
.bind(id)
.first<any>();

if(!target)
throw new HttpError(404,'الحساب غير موجود');

if(target.primary_admin)
throw new HttpError(409,'لا يمكن تعطيل حساب السوبر أدمن');

const active=data.active===true?1:0;

await db.batch([
db.prepare('UPDATE admin_users SET active=? WHERE id=?')
.bind(active,id),

...(
!active
?[
db.prepare('DELETE FROM admin_sessions WHERE admin_id=?')
.bind(id)
]
:[]
)
]);

}

else{
throw new HttpError(400,'عملية غير صالحة');
}

}

else{
throw new HttpError(400,'عملية غير معروفة');
}

await audit(
user.id,
entity+':'+action,
id
);

if(user.primary_admin)await retryMediaCleanup(db,(env as any).MEDIA);

return json({
success:true,
id
});

}
catch(e){

if(
e instanceof Error
&&/UNIQUE constraint/.test(e.message)
)
return json({
error:'الاسم أو الرمز مستخدم مسبقًا'
},409);

return fail(e);
}
}

async function saveProduct(
id:string,
raw:any,
db:any
){

const v=productInput(raw);

if(!await db
.prepare('SELECT id FROM store_categories WHERE id=?')
.bind(v.category)
.first())
throw new HttpError(
400,
'اختاري تصنيفًا موجودًا'
);

const existing=await db
.prepare('SELECT revision,data FROM store_products WHERE id=?')
.bind(id)
.first();

if(
existing
&&raw.revision!==undefined
&&existing.revision!==raw.revision
)
throw new HttpError(
409,
'تم تعديل المنتج من جلسة أخرى. حدّثي القائمة قبل الحفظ'
);

const oldVariants=await db.prepare('SELECT data FROM store_variants WHERE product_id=?').bind(id).all();
const oldMedia=collectMediaIds([existing?.data,...oldVariants.results.map((v:any)=>v.data)]);

const {
variants,
stock,
active,
archived,
...data
}=v;

const statements=[
...queueMediaCleanup(db,oldMedia.filter(key=>!collectMediaIds([v]).includes(key))),
db.prepare('INSERT INTO store_products (id,category,data,active,archived,stock,position,revision) VALUES (?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET category=excluded.category,data=excluded.data,active=excluded.active,archived=excluded.archived,stock=excluded.stock,revision=revision+1')
.bind(
id,
v.category,
JSON.stringify(data),
active?1:0,
archived?1:0,
stock,
quantity(raw.position||0)
),

db.prepare('UPDATE store_variants SET active=0 WHERE product_id=?')
.bind(id)
];

for(const variant of variants){

const existingVariant=await db
.prepare('SELECT product_id FROM store_variants WHERE id=?')
.bind(variant.id)
.first();

if(
existingVariant
&&existingVariant.product_id!==id
)
throw new HttpError(
400,
'معرف تركيبة مستخدم في منتج آخر'
);

const {
stock,
active,
...data
}=variant;

statements.push(
db.prepare('INSERT INTO store_variants (id,product_id,data,stock,active) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,stock=excluded.stock,active=excluded.active')
.bind(
variant.id,
id,
JSON.stringify(data),
stock,
active?1:0
)
);

}

await db.batch(statements);

}
