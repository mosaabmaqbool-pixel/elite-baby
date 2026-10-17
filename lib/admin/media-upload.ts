import {queueMediaCleanup} from './media-cleanup';

type Asset = {id:string; mime:string; size:number};

// Web Crypto works in Workers. Names are deliberately excluded: equal bytes
// share one asset even if two administrators choose different filenames.
export async function uploadImage(db:any,bucket:any,bytes:Uint8Array,mime:string,name:string){
 const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const find=()=>db.prepare('SELECT id,mime,size FROM store_assets WHERE content_hash=?').bind(hash).first() as Promise<Asset|null>;
 const reuse=async(asset:Asset)=>{
  if(asset.mime!==mime||asset.size!==bytes.byteLength)throw new Error('Media fingerprint metadata mismatch');
  // An object may have been removed manually from R2. Repair the same key,
  // never replace the ID or break references held by products and orders.
  if(!await bucket.head(asset.id))await bucket.put(asset.id,bytes,{httpMetadata:{contentType:mime}});
  return {id:asset.id,url:'/api/media/'+asset.id,reused:true};
 };
 const existing=await find(); // Fails before writing R2 if migration is missing.
 if(existing)return reuse(existing);
 const id=crypto.randomUUID();
 await bucket.put(id,bytes,{httpMetadata:{contentType:mime}});
 try{
  await db.prepare('INSERT INTO store_assets (id,mime,size,name,created_at,content_hash) VALUES (?,?,?,?,?,?)')
   .bind(id,mime,bytes.byteLength,name.slice(0,150),new Date().toISOString(),hash).run();
  return {id,url:'/api/media/'+id,reused:false};
 }catch(error){
  // A UNIQUE index arbitrates concurrent uploads across Worker instances.
  // Also handle an ambiguous write result: never delete a committed winner.
  const winner=await find();
  if(winner?.id===id)return reuse(winner);
  try{await bucket.delete(id);}catch{
   await db.batch(queueMediaCleanup(db,[id]));
   console.error('Unused upload queued for cleanup',id);
  }
  if(winner)return reuse(winner);
  throw error;
 }
}
