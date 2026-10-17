// Store parentId in the existing JSON data; no schema migration is needed.
export const saveCategorySql=`INSERT INTO store_categories (id,data,active,position)
 SELECT ?1,?2,?3,?4 WHERE
 (?5='' OR (?5<>?1
   AND EXISTS (SELECT 1 FROM store_categories parent WHERE parent.id=?5 AND COALESCE(json_extract(parent.data,'$.parentId'),'')='')
   AND NOT EXISTS (SELECT 1 FROM store_categories child WHERE json_extract(child.data,'$.parentId')=?1)))
 ON CONFLICT(id) DO UPDATE SET data=json_set(excluded.data,
 '$.productOrder',json(COALESCE(json_extract(store_categories.data,'$.productOrder'),'[]')),
 '$.productOrderRevision',COALESCE(json_extract(store_categories.data,'$.productOrderRevision'),0)),
 active=excluded.active,position=excluded.position`;
export const deleteCategorySql=`DELETE FROM store_categories WHERE id=?1
 AND NOT EXISTS (SELECT 1 FROM store_products WHERE category=?1)
 AND NOT EXISTS (SELECT 1 FROM store_categories WHERE json_extract(data,'$.parentId')=?1)`;
