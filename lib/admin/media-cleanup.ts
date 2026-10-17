// Reuse private settings storage for a durable cleanup queue; no schema migration.
const PREFIX='media_cleanup:';
export function collectMediaIds(values:unknown[]):string[]{
 const ids=new Set<string>();
 for(const value of values){
  const source=typeof value==='string'?value:JSON.stringify(value??'');
  for(const match of source.matchAll(/\/api\/media\/([a-f0-9-]{36})/g))ids.add(match[1]);
 }
 return [...ids];
}
export function queueMediaCleanup(db:any,ids:string[]){
 return [...new Set(ids)].map(id=>db.prepare('INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING').bind(PREFIX+id,String(Date.now())));
}
async function referenced(db:any,id:string){
 const path='/api/media/'+id;
 // Include hidden/archived products, shared category/banner assets and order snapshots.
 for(const [table,column] of [['store_products','data'],['store_variants','data'],['store_categories','data'],['store_settings','value'],['preview_orders','items']]){
  if(await db.prepare(`SELECT 1 FROM ${table} WHERE instr(${column},?)>0 LIMIT 1`).bind(path).first())return true;
 }
 return false;
}
export async function retryMediaCleanup(db:any,bucket:any){
 try{
  const pending=await db.prepare("SELECT key FROM store_settings WHERE key LIKE 'media_cleanup:%' ORDER BY value,key LIMIT 20").all();
  if(!pending.results.length)return;
  if(!bucket){console.error('Media cleanup pending: MEDIA binding unavailable');return;}
  for(const {key} of pending.results){
   const id=key.slice(PREFIX.length);
   try{
    if(!await referenced(db,id)){
     // Keep metadata and queue until R2 succeeds. Repeating delete is safe.
     await bucket.delete(id);
     await db.batch([db.prepare('DELETE FROM store_assets WHERE id=?').bind(id),db.prepare('DELETE FROM store_settings WHERE key=?').bind(key)]);
    }else{
     await db.prepare('DELETE FROM store_settings WHERE key=?').bind(key).run();
    }
   }catch{
    console.error('Media cleanup failed; queued for retry',id);
    await db.prepare('UPDATE store_settings SET value=? WHERE key=?').bind(String(Date.now()),key).run();
   }
  }
 }catch{
  // An already saved/deleted product must not become a failed operation.
  console.error('Media cleanup deferred; pending entries retained');
 }
}
