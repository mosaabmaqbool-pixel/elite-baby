import {HttpError,requirePermission,securityGuard,auditStatement} from './auth';
import type {Admin} from './auth';

// Membership and revision are checked in the same statement that saves the order.
export const saveCategoryProductOrderSql=`WITH eligible AS (
 SELECT p.id FROM store_products p JOIN store_categories c ON c.id=p.category
 WHERE p.active=1 AND p.archived=0 AND c.active=1
 AND (COALESCE(json_extract(c.data,'$.parentId'),'')=''
   OR EXISTS (SELECT 1 FROM store_categories parent WHERE parent.id=json_extract(c.data,'$.parentId') AND parent.active=1 AND COALESCE(json_extract(parent.data,'$.parentId'),'')=''))
 AND (p.category=?1 OR json_extract(c.data,'$.parentId')=?1)
)
UPDATE store_categories SET data=json_set(data,'$.productOrder',json(?2),'$.productOrderRevision',?3+1)
WHERE id=?1 AND active=1 AND COALESCE(json_extract(data,'$.productOrderRevision'),0)=?3
 AND (COALESCE(json_extract(data,'$.parentId'),'')=''
   OR EXISTS (SELECT 1 FROM store_categories parent WHERE parent.id=json_extract(store_categories.data,'$.parentId') AND parent.active=1 AND COALESCE(json_extract(parent.data,'$.parentId'),'')=''))
 AND (SELECT COUNT(*) FROM eligible)=json_array_length(?2)
 AND NOT EXISTS (SELECT 1 FROM json_each(?2) item WHERE NOT EXISTS (SELECT 1 FROM eligible WHERE eligible.id=item.value))`;

export async function saveCategoryProductOrder(db:any,user:Admin,input:any){
 requirePermission(user,'products.manage');
 const {category,ids,revision}=input;
 if(typeof category!=='string'||!category||category.length>100
  ||!Array.isArray(ids)||ids.length>1000
  ||ids.some(id=>typeof id!=='string'||!id||id.length>100)
  ||new Set(ids).size!==ids.length
  ||!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER)
  throw new HttpError(400,'بيانات ترتيب المنتجات غير صالحة');
 const guard=crypto.randomUUID();
 try{
  await db.batch([
   db.prepare(saveCategoryProductOrderSql).bind(category,JSON.stringify(ids),revision),
   securityGuard(db,guard),
   auditStatement(db,user.id,'reorder:category-products',category),
   db.prepare('DELETE FROM inventory_guards WHERE id=?').bind(guard)
  ]);
 }catch(error){
  if(error instanceof Error&&/reservation_must_succeed/.test(error.message))
   throw new HttpError(409,'تغيّر ترتيب التصنيف أو قائمة منتجاته. حدّث الصفحة ثم أعد المحاولة.');
  throw error;
 }
 return {success:true,category,ids,revision:revision+1};
}
