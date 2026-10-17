import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const tmp=mkdtempSync(join(tmpdir(),'storekit-dedup-'));
try{
 for(const name of ['media-cleanup','media-upload']){
  const source=readFileSync(`lib/admin/${name}.ts`,'utf8').replace("from './media-cleanup'","from './media-cleanup.mjs'");
  writeFileSync(join(tmp,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 }
 const {uploadImage}=await import(join(tmp,'media-upload.mjs'));
 const {queueMediaCleanup,retryMediaCleanup}=await import(join(tmp,'media-cleanup.mjs'));
 const sql=new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE store_assets(id TEXT PRIMARY KEY,mime TEXT NOT NULL,size INTEGER NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE store_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE store_products(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE store_variants(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE store_categories(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE preview_orders(id TEXT PRIMARY KEY,items TEXT NOT NULL);
 INSERT INTO store_assets VALUES('legacy','image/png',3,'old.png','2026-01-01');`);
 const before=sql.prepare('SELECT * FROM store_assets').all();
 sql.exec(readFileSync('drizzle/0007_media_content_hash.sql','utf8'));
 assert.deepEqual(sql.prepare('SELECT id,mime,size,name,created_at FROM store_assets').all(),before);
 assert.equal(sql.prepare('SELECT content_hash FROM store_assets').get().content_hash,null);
 let failInsert=false,ambiguous=false;
 const db={prepare(query){const statement=(args=[])=>({bind(...next){return statement(next);},
  async first(){return sql.prepare(query).get(...args)||null;},
  async all(){return {results:sql.prepare(query).all(...args)};},
  async run(){if(query.startsWith('INSERT INTO store_assets')&&failInsert)throw Error('database unavailable');const result=sql.prepare(query).run(...args);if(query.startsWith('INSERT INTO store_assets')&&ambiguous)throw Error('response lost');return result;}
 });return statement();},async batch(list){const result=[];for(const q of list)result.push(await q.run());return result;}};
 const objects=new Map();let puts=0,failPut=false,failDelete=false;
 const bucket={async head(id){return objects.has(id)?{size:objects.get(id).length}:null;},async put(id,bytes){if(failPut)throw Error('R2 failed');puts++;objects.set(id,new Uint8Array(bytes));},async delete(id){if(failDelete)throw Error('R2 delete failed');objects.delete(id);}};
 const bytes=new Uint8Array([1,2,3]);
 const a=await uploadImage(db,bucket,bytes,'image/png','a.png');
 const b=await uploadImage(db,bucket,bytes,'image/png','renamed.png');
 assert.equal(a.id,b.id);assert.equal(b.reused,true);assert.equal(puts,1);assert.equal(objects.size,1);
 const c=await uploadImage(db,bucket,new Uint8Array([1,2,4]),'image/png','a.png');
 assert.notEqual(a.id,c.id);assert.equal(objects.size,2);
 // Many simultaneous uploads resolve to one record and one final R2 object.
 const concurrent=await Promise.all(Array.from({length:12},(_,i)=>uploadImage(db,bucket,new Uint8Array([4,5,6]),'image/png',i+'.png')));
 assert.equal(new Set(concurrent.map(x=>x.id)).size,1);assert.equal(objects.size,3);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM store_assets WHERE content_hash IS NOT NULL').get().n,3);
 objects.delete(a.id);assert.equal((await uploadImage(db,bucket,bytes,'image/png','repair.png')).id,a.id);assert.ok(objects.has(a.id));
 // Failure before metadata creation does not invent a successful upload.
 failPut=true;await assert.rejects(uploadImage(db,bucket,new Uint8Array([7]),'image/png','failed.png'));failPut=false;
 failInsert=true;await assert.rejects(uploadImage(db,bucket,new Uint8Array([8]),'image/png','failed.png'));failInsert=false;assert.equal(objects.size,3);
 ambiguous=true;const committed=await uploadImage(db,bucket,new Uint8Array([9]),'image/png','committed.png');ambiguous=false;assert.ok(objects.has(committed.id));
 failInsert=true;failDelete=true;await assert.rejects(uploadImage(db,bucket,new Uint8Array([10]),'image/png','queued.png'));failInsert=false;failDelete=false;
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM store_settings WHERE key LIKE 'media_cleanup:%'").get().n,1);
 await retryMediaCleanup(db,bucket);assert.equal(objects.size,4);
 // A shared image remains while referenced by another product or an order.
 const path=a.url;
 sql.prepare('INSERT INTO store_products VALUES (?,?)').run('first',JSON.stringify({images:[path]}));
 sql.prepare('INSERT INTO store_products VALUES (?,?)').run('second',JSON.stringify({images:[path]}));
 sql.prepare('DELETE FROM store_products WHERE id=?').run('first');await db.batch(queueMediaCleanup(db,[a.id]));await retryMediaCleanup(db,bucket);assert.ok(objects.has(a.id));
 sql.prepare('INSERT INTO preview_orders VALUES (?,?)').run('order',JSON.stringify([{image:path}]));
 sql.prepare('DELETE FROM store_products WHERE id=?').run('second');await db.batch(queueMediaCleanup(db,[a.id]));await retryMediaCleanup(db,bucket);assert.ok(objects.has(a.id));
 sql.prepare('DELETE FROM preview_orders').run();await db.batch(queueMediaCleanup(db,[a.id]));await retryMediaCleanup(db,bucket);assert.ok(!objects.has(a.id));assert.equal(sql.prepare('SELECT id FROM store_assets WHERE id=?').get(a.id),undefined);
 const reuploaded=await uploadImage(db,bucket,bytes,'image/png','new.png');assert.notEqual(reuploaded.id,a.id);assert.ok(objects.has(reuploaded.id));
 console.log('PASS: additive migration, renamed duplicate, distinct bytes, concurrent uploads, missing R2 repair, R2/D1 failures, ambiguous commit, queued cleanup, shared product/order protection and re-upload after deletion.');
 sql.close();
}finally{rmSync(tmp,{recursive:true,force:true});}
