import type {Category} from './store-config';

// Existing categories without parentId remain root categories.
export function rootCategories(categories:Category[]){return categories.filter(c=>!c.parentId);}
export function childCategories(categories:Category[],parentId:string){return categories.filter(c=>c.parentId===parentId);}
export function categoryMatches(categories:Category[],productCategory:string,selected:string){
 return selected==='all'||productCategory===selected||categories.some(c=>c.id===productCategory&&c.parentId===selected);
}
export function visibleCategories(categories:Category[]){
 const roots=new Set(rootCategories(categories).filter(c=>c.active!==false).map(c=>c.id));
 return categories.filter(c=>c.active!==false&&(!c.parentId||roots.has(c.parentId)));
}
export function categoryLabel(categories:Category[],category:Category){
 const parent=categories.find(c=>c.id===category.parentId);
 return parent?parent.name+' / '+category.name:category.name;
}
