// Read-only audit. No deployment, database writes, or R2 writes/deletes.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, writeFile, readFile, stat, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function summarize(files) {
  const groups = new Map();
  for (const f of files.filter(f => f.status === 'ok')) {
    const k = f.sha256 + ':' + f.actualSize;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(f);
  }
  const duplicates = [...groups.values()].filter(g => g.length > 1).map(g => ({
    sha256: g[0].sha256, size: g[0].actualSize,
    potentialSavingBytes: (g.length - 1) * g[0].actualSize,
    // This is evidence only: no survivor is chosen until references are reviewed.
    assets: g.map(f => ({id:f.id, name:f.name, mime:f.mime, storedHash:f.content_hash})),
  }));
  return {registeredAssets:files.length, downloaded:files.filter(f=>f.status==='ok').length,
    failed:files.filter(f=>f.status!=='ok').length, duplicateGroups:duplicates.length,
    redundantCopies:duplicates.reduce((n,g)=>n+g.assets.length-1,0),
    potentialSavingBytes:duplicates.reduce((n,g)=>n+g.potentialSavingBytes,0), duplicates};
}

async function hashFile(file) {
  const h=createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

async function main() {
  const argv=process.argv.slice(2);
  if (argv.length!==2 || argv[0]!=='--config') throw new Error('Usage: node scripts/audit-r2-duplicates.mjs --config audit-config.json');
  const input=JSON.parse(await readFile(path.resolve(argv[1]),'utf8'));
  if(!/^[a-f0-9]{32}$/i.test(input.accountId||'')) throw new Error('Invalid Cloudflare accountId');
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.databaseId||'')) throw new Error('Invalid D1 databaseId');
  if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(input.bucketName||'')) throw new Error('Invalid R2 bucketName');
  const wrangler=path.resolve('node_modules/wrangler/bin/wrangler.js');
  await stat(wrangler);
  const output=path.resolve('media-audit-'+new Date().toISOString().replace(/[:.]/g,'-'));
  await mkdir(output); // Never overwrite an earlier audit.
  const objects=path.join(output,'objects'); await mkdir(objects);
  const cfg=path.join(output,'read-only-wrangler.json');
  await writeFile(cfg,JSON.stringify({name:'storekit-media-audit',account_id:input.accountId,
    d1_databases:[{binding:'AUDIT_DB',database_name:'audit-selected-database',database_id:input.databaseId}]}));
  const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'};
  function run(args) {
    const r=spawnSync(process.execPath,[wrangler,...args,'--config',cfg],{encoding:'utf8',maxBuffer:20*1024*1024,timeout:120000,env,windowsHide:true});
    // Do not copy provider stdout/stderr into a report (could contain secrets).
    if(r.error || r.status!==0) throw new Error('Cloudflare read failed (authentication, resource, permissions, network, or missing object).');
    return r.stdout;
  }
  function query(sql) {
    const response=JSON.parse(run(['d1','execute','AUDIT_DB','--remote','--json','--command',sql]));
    if(!Array.isArray(response)||response.some(x=>x.success===false)||!Array.isArray(response[0]?.results)) throw new Error('Unexpected D1 response');
    return response[0].results;
  }
  const columns=query('PRAGMA table_info(store_assets)');
  for(const name of ['id','name','mime','size']) if(!columns.some(c=>c.name===name)) throw new Error('Unexpected store_assets schema');
  const hasHash=columns.some(c=>c.name==='content_hash');
  const rows=[]; let after='';
  for(;;) {
    // The cursor is restricted to UUID syntax before interpolation.
    const page=query(`SELECT id,name,mime,size,${hasHash?'content_hash':'NULL AS content_hash'} FROM store_assets WHERE id > '${after}' ORDER BY id LIMIT 100`);
    if(!page.length) break;
    if(page.some(r=>!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(r.id))) throw new Error('Unexpected asset ID; audit stopped safely');
    rows.push(...page);after=page.at(-1).id;
  }
  await writeFile(path.join(output,'asset-records.json'),JSON.stringify(rows,null,2));
  const files=[];
  for(const [index,row] of rows.entries()) {
    console.log(`[${index+1}/${rows.length}] Reading ${row.id}`);
    const file=path.join(objects,row.id);
    try {
      run(['r2','object','get',input.bucketName+'/'+row.id,'--remote','--file',file]);
      const actualSize=(await stat(file)).size, sha256=await hashFile(file);
      files.push({...row,status:'ok',actualSize,sha256,
        sizeMismatch:actualSize!==Number(row.size),hashMismatch:!!row.content_hash&&row.content_hash!==sha256});
    } catch {
      await rm(file,{force:true});
      files.push({...row,status:'failed',reason:'Could not read object; missing file, permissions or network. No deletion was performed.'});
    }
    // Save progress so interrupted audits keep useful evidence.
    await writeFile(path.join(output,'files.json'),JSON.stringify(files,null,2));
  }
  const report={createdAt:new Date().toISOString(),mode:'read-only',
    scope:'D1-registered assets only; R2-only orphan objects are NOT inventoried.',
    databaseHasContentHash:hasHash,completeForRegisteredAssets:files.every(f=>f.status==='ok'),
    warnings:['No files deleted; no database changes.','Not a full backup of D1 or R2.',
      'Pause image uploads/edits/deletes during the scan; this is not an atomic snapshot.',
      'Do not delete duplicates manually: product, variant, category, content and historical order references need review first.',
      'Only byte-identical files match; resized/recompressed pictures do not.'],
    ...summarize(files),
    metadataMismatches:files.filter(f=>f.sizeMismatch||f.hashMismatch).map(f=>({id:f.id,sizeMismatch:f.sizeMismatch,hashMismatch:f.hashMismatch})),
    failures:files.filter(f=>f.status!=='ok').map(f=>({id:f.id,reason:f.reason}))};
  await writeFile(path.join(output,'R2-DUPLICATES-REPORT.json'),JSON.stringify(report,null,2));
  console.log(`Report: ${path.join(output,'R2-DUPLICATES-REPORT.json')}`);
  console.log(`Duplicate groups: ${report.duplicateGroups}; unreadable files: ${report.failed}. No changes made.`);
  if(report.failed) process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(e.message);process.exitCode=1;});
