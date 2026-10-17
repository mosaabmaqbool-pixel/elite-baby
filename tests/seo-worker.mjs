import os from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
// Some isolated containers cannot enumerate interfaces; this affects the test host only.
try{os.networkInterfaces()}catch{os.networkInterfaces=()=>({});syncBuiltinESMExports();}
const root=process.cwd();
const mfDir=readdirSync(root+'/node_modules/.pnpm').find(x=>x.startsWith('miniflare@'));
const {Miniflare}=await import(root+'/node_modules/.pnpm/'+mfDir+'/node_modules/miniflare/dist/src/index.js');
const mf=new Miniflare({modules:[{type:'ESModule',path:root+'/dist/server/index.js'},...readdirSync(root+'/dist/server',{recursive:true}).filter(p=>/\.m?js$/.test(p)&&p!=='index.js').map(p=>({type:'ESModule',path:root+'/dist/server/'+p}))],modulesRoot:root+'/dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],bindings:{SITE_URL:'https://storekit.example'},d1Databases:['DB'],r2Buckets:['MEDIA'],assets:{directory:root+'/dist/client',binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:true,has_user_worker:true}},cf:false});
try{
const db=await mf.getD1Database('DB');for(const file of readdirSync(root+'/drizzle').filter(x=>x.endsWith('.sql')).sort()){const sql=readFileSync(root+'/drizzle/'+file,'utf8');for(const statement of sql.split(';').map(x=>x.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean))await db.prepare(statement).run();}
for(const path of ['/','/product/nasma','/product/missing','/categories/mats','/categories/missing','/totally-missing','/admin','/admin/login','/cart','/checkout','/sitemap.xml','/robots.txt']){
const r=await mf.dispatchFetch('https://storekit.example'+path,{redirect:'manual'}),body=await r.text();console.log(JSON.stringify({path,status:r.status,canonical:body.match(/rel="canonical"[^>]*href="([^"]*)"/)?.[1],robots:r.headers.get('x-robots-tag'),hasJsonLd:body.includes('application/ld+json'),title:body.match(/<title>(.*?)<\/title>/)?.[1]}));
if(r.status===500)console.log(body.slice(0,2500));if(path.includes('missing'))assert.equal(r.status,404,path);else if(path==='/admin')assert.ok([302,303,307].includes(r.status));else assert.equal(r.status,200,path);
if(['/cart','/checkout','/admin/login'].includes(path))assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
if(['/','/product/nasma','/categories/mats'].includes(path)){assert.ok(body.includes('rel="canonical"'));assert.ok(body.includes('property="og:title"'));assert.ok(body.includes('application/ld+json'));}
}

const existing=await db.prepare("SELECT data FROM store_products WHERE id='nasma'").first();const data=JSON.parse(existing.data);
data.optionGroups=[{id:'design',name:'التصميم',kind:'design',active:true,values:[{id:'a',label:'ورود',active:true},{id:'b',label:'سادة',active:true}]}];data.options=['@seo-v1','@seo-v2'];data.regularPrice=100;data.salePrice=undefined;
await db.prepare("DELETE FROM store_variants WHERE product_id='nasma'").run();
await db.prepare("UPDATE store_products SET data=? WHERE id='nasma'").bind(JSON.stringify(data)).run();
for(const [id,value,price,stock] of [['seo-v1','a',130,3],['seo-v2','b',90,0]])await db.prepare('INSERT INTO store_variants (id,product_id,data,stock,active) VALUES (?,\'nasma\',?,?,1)').bind(id,JSON.stringify({selections:{design:value},label:value,sku:id,price,available:true,images:['/images/bedding.webp']}),stock).run();
const getSchema=async()=>{const r=await mf.dispatchFetch('https://storekit.example/product/nasma?tracking=test');assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('href="https://storekit.example/product/nasma"'));return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1])).find(x=>x['@type']==='Product');};
let product=await getSchema();assert.deepEqual(product.offers.map(x=>x.price),[130,90]);assert.deepEqual(product.offers.map(x=>x.availability),['https://schema.org/InStock','https://schema.org/OutOfStock']);assert.ok(product.offers.every(x=>x.priceCurrency==='ILS'));
await db.prepare("UPDATE store_variants SET stock=0 WHERE product_id='nasma'").run();product=await getSchema();assert.ok(product.offers.every(x=>x.availability==='https://schema.org/OutOfStock'));
await db.prepare("UPDATE store_products SET active=0 WHERE id='nasma'").run();assert.equal((await mf.dispatchFetch('https://storekit.example/product/nasma')).status,404);assert.ok(!(await (await mf.dispatchFetch('https://storekit.example/sitemap.xml')).text()).includes('/product/nasma'));
console.log('PASS real Cloudflare Worker HTTP metadata, canonical query normalization, variant prices/availability/ILS, all-out-of-stock offers, hidden product 404 and dynamic sitemap exclusion.');
}finally{await mf.dispose();}
