import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec(readFileSync('database-empty.sql','utf8'));
for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n, 0, `${name} must be empty`);
}
for (const table of ['admin_users','admin_sessions','admin_access','admin_audit','customers','customer_sessions','customer_otp_challenges','preview_orders']) {
 assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n, 0);
}
const hosting=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
assert.deepEqual(hosting,{d1:'DB',r2:'MEDIA'});
assert.ok(!existsSync('restore-database-d1.sql'));
assert.ok(!existsSync('checkpoints'));
const config=readFileSync('vite.config.ts','utf8');
assert.ok(!config.includes('workers.dev'));
assert.ok(!readFileSync('build/sites-vite-plugin.ts','utf8').includes('localUserId'));
assert.match(readFileSync('app/api/admin/auth/route.ts','utf8'),/WHERE NOT EXISTS \(SELECT 1 FROM admin_users\)/);
db.close();
console.log('PASS clean database, zero accounts/sessions/orders, no old project binding, no development account, first-admin setup retained');
