import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),temp=mkdtempSync(resolve(tmpdir(),'storekit-photo-'));
try{
symlinkSync(resolve(root,'node_modules'),resolve(temp,'node_modules'));
writeFileSync(resolve(temp,'link.mjs'),`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`);
writeFileSync(resolve(temp,'navigation.mjs'),`export const useRouter=()=>({push(){}});`);
for(const file of ['components/store/link.tsx','components/shared/dropdown.tsx','components/store/detail.tsx','components/store/products.tsx','components/store/image-zoom.tsx','components/store/provider.tsx','lib/product-designs.ts','components/store/design-selector.tsx','lib/catalog.ts','lib/store-config.ts','lib/shipping.ts']){
let s=readFileSync(resolve(root,file),'utf8').replace(/from 'next\/link'/g,`from '${temp}/link.mjs'`).replace(/from 'next\/navigation'/g,`from '${temp}/navigation.mjs'`).replace(/from (['"])(\.[^'"]+)\1/g,(_m,q,path)=>`from ${q}${path}.mjs${q}`);
const out=resolve(temp,file.replace(/\.tsx?$/,'.mjs'));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
}
const {ProductCard,QuickView}=await import(temp+'/components/store/products.mjs');
const {ProductDetail}=await import(temp+'/components/store/detail.mjs'),{StoreProvider}=await import(temp+'/components/store/provider.mjs'),config=await import(temp+'/lib/store-config.mjs');
const p={id:'photo',name:'طقم دعاسات',category:'mats',image:'/api/media/00000000-0000-0000-0000-000000000001',images:['/api/media/00000000-0000-0000-0000-000000000001'],description:'سطر أول\nسطر ثانٍ',short:'تفاصيل',price:100,rating:0,stock:null,color:'#e2c19c',options:[],optionGroups:[],variants:[]};
const html=renderToStaticMarkup(React.createElement(StoreProvider,{initialCatalog:{products:[p],categories:[{id:'mats',name:'دعاسات'}],settings:config.defaultSettings,content:config.defaultContent}},React.createElement(ProductDetail,{product:p})));
assert.ok(html.indexOf('product-image-button')<html.indexOf('product-description'));
assert.match(html,/aria-haspopup="dialog"/);assert.match(html,/description preserve-lines/);assert.ok(html.includes('سطر أول\nسطر ثانٍ'));assert.ok(html.includes('تكبير الصورة'));
assert.ok(!html.includes('متوفر · null'));
const render=(child,product=p)=>renderToStaticMarkup(React.createElement(StoreProvider,{initialCatalog:{products:[product],categories:[{id:'mats',name:'دعاسات'}],settings:config.defaultSettings,content:config.defaultContent}},child));
const card=render(React.createElement(ProductCard,{product:p}));assert.match(card,/<button[^>]+class="product-popup-trigger"[^>]+aria-haspopup="dialog"/);assert.match(card,/<button[^>]+class="product-title-trigger"/);
const popup=render(React.createElement(QuickView,{product:p,close(){}}));assert.match(popup,/<dialog class="quick-dialog product-popup"/);assert.ok(popup.indexOf('product-image-button')<popup.indexOf('product-popup-description'));assert.ok(popup.includes('سطر أول\nسطر ثانٍ'));assert.ok(popup.includes('إغلاق'));
const {DesignSelector}=await import(temp+'/components/store/design-selector.mjs');
const {appendDesign,rebuildVariants,displayImage}=await import(temp+'/lib/product-designs.mjs');
const {cardCartChoice}=await import(temp+'/lib/product-designs.mjs');
assert.deepEqual(cardCartChoice(p),{requiresChoice:false,variant:undefined,sellable:true});
const fixed={...p,optionGroups:[{id:'size',active:true,values:[{id:'one',active:true}]}],variants:[{id:'fixed',active:true,available:true,stock:null,selections:{size:'one'}}]};
assert.equal(cardCartChoice(fixed).requiresChoice,false);assert.equal(cardCartChoice(fixed).variant.id,'fixed');
assert.equal(cardCartChoice({...fixed,optionGroups:[{...fixed.optionGroups[0],values:[...fixed.optionGroups[0].values,{id:'two',active:true}]}]}).requiresChoice,true);
assert.equal(cardCartChoice({...fixed,optionGroups:[{...fixed.optionGroups[0],kind:'design'}]}).requiresChoice,true);
assert.equal(cardCartChoice({...fixed,variants:[{...fixed.variants[0],stock:0}]}).sellable,false);
console.log('PASS direct cart for no options and a fixed single option; design/multiple choices require selection; sold-out variants cannot be added.');

const initial={...p,sku:'FIRST',stock:7,firstDesignName:'ورود بيج'};
const two=appendDesign(initial),dg=two.optionGroups.find(g=>g.kind==='design');
assert.equal(dg.values.length,2);assert.equal(dg.values[0].label,'ورود بيج');assert.equal(dg.values[0].image,p.image);
assert.equal(two.variants[0].sku,'FIRST');assert.equal(two.variants[0].stock,7);assert.deepEqual(two.variants[0].images,p.images);
assert.equal(initial.optionGroups.length,0);assert.equal(two.variants.length,2);
dg.values[1].label='زهور';dg.values[1].image='/images/second.webp';
const three=appendDesign(two);assert.equal(three.optionGroups[0].values.length,3);assert.equal(three.variants[0].id,two.variants[0].id);
const reordered={...two,optionGroups:[{...dg,values:[dg.values[1],dg.values[0]]}]};reordered.variants=rebuildVariants(two,reordered.optionGroups);
assert.equal(reordered.variants[0].id,two.variants[1].id);assert.equal(reordered.variants[1].sku,'FIRST');assert.equal(reordered.variants[1].stock,7);assert.equal(displayImage(reordered),'/images/second.webp');
assert.throws(()=>appendDesign({...p,images:[]}),/صورة المنتج/);
console.log('PASS existing product becomes first design; subsequent additions and reordering preserve IDs, image, SKU and optional stock.');

const dp={...p,optionGroups:[{id:'design',name:'التصميم',kind:'design',active:true,values:Array.from({length:16},(_,i)=>({id:'d'+i,label:'تصميم '+i,image:p.image,active:true}))}],variants:Array.from({length:16},(_,i)=>({id:'v'+i,selections:{design:'d'+i},label:'التصميم: تصميم '+i,stock:null,available:true,active:true,images:[p.image]}))};
const selected=renderToStaticMarkup(React.createElement(DesignSelector,{product:dp,selection:{design:'d7'},choose(){}}));assert.equal((selected.match(/class="design-thumb /g)||[]).length,16);assert.equal((selected.match(/aria-pressed="true"/g)||[]).length,1);assert.ok(selected.includes('التصميم: تصميم 7'));
const singleCard=render(React.createElement(ProductCard,{product:dp}));assert.equal((singleCard.match(/class="product-card"/g)||[]).length,1);assert.ok(singleCard.includes('متوفر بـ 16 تصميم'));
const untouched=render(React.createElement(ProductDetail,{product:dp}),dp);assert.ok(untouched.includes('اختاري التصميم أولًا'));assert.ok(!untouched.includes('التصميم: تصميم 0'));
const designPopup=render(React.createElement(QuickView,{product:dp,close(){}}));assert.equal((designPopup.match(/class="design-thumb /g)||[]).length,16);assert.equal((designPopup.match(/aria-pressed="true"/g)||[]).length,0);assert.ok(designPopup.indexOf('product-image-button')<designPopup.indexOf('design-selector'));assert.ok(designPopup.includes('اختاري التصميم لإضافته للسلة'));
console.log('PASS first image for display only, all equal designs below the popup image and no automatic selection.');
console.log('PASS 16 thumbnail selector, selected Arabic label/state, one parent card and explicit choice before cart.');
console.log('PASS product photo and name open popup, popup shows full image then description.');
console.log('PASS full product photo, zoom entry point, description beneath gallery and multiline Arabic content render.');
}finally{rmSync(temp,{recursive:true,force:true});}
