import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),temp=mkdtempSync(resolve(tmpdir(),'storekit-reference-'));
try{
symlinkSync(resolve(root,'node_modules'),resolve(temp,'node_modules'));
writeFileSync(resolve(temp,'link.mjs'),`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`);
writeFileSync(resolve(temp,'navigation.mjs'),`export const usePathname=()=>'/';export const useRouter=()=>({push(){}});`);
for(const file of ['components/admin/shell.tsx','components/admin/link.tsx','components/admin/fields.tsx','components/admin/product-editor.tsx','components/admin/design-editor.tsx','lib/admin/copy.ts','lib/admin/permissions.ts','components/store/link.tsx','components/store/header.tsx','components/shared/dropdown.tsx','components/store/home.tsx','components/store/footer.tsx','components/store/products.tsx','components/store/image-zoom.tsx','components/store/social.tsx','components/store/provider.tsx','lib/product-designs.ts','components/store/design-selector.tsx','lib/catalog.ts','lib/social.ts','lib/store-config.ts','lib/shipping.ts']){
let s=readFileSync(resolve(root,file),'utf8').replace(/from 'next\/link'/g,`from '${temp}/link.mjs'`).replace(/from 'next\/navigation'/g,`from '${temp}/navigation.mjs'`).replace(/from (['"])(\.[^'"]+)\1/g,(_m,q,path)=>`from ${q}${path}.mjs${q}`);
const out=resolve(temp,file.replace(/\.tsx?$/,'.mjs'));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);
}
const {Home}=await import(temp+'/components/store/home.mjs'),{Footer}=await import(temp+'/components/store/footer.mjs'),{StoreProvider}=await import(temp+'/components/store/provider.mjs'),config=await import(temp+'/lib/store-config.mjs'),catalog=await import(temp+'/lib/catalog.mjs');
const initialCatalog={products:catalog.products.map((p,i)=>({...p,available:true,featured:i<4,newArrival:p.badge==='جديد',images:[catalog.imagePath(p.image)],stock:null,optionGroups:[],variants:[]})),categories:catalog.categories,settings:config.defaultSettings,content:config.defaultContent};
const render=(component,content=config.defaultContent)=>renderToStaticMarkup(React.createElement(StoreProvider,{initialCatalog:{...initialCatalog,content}},React.createElement(component)));
const {Header}=await import(temp+'/components/store/header.mjs');const header=render(Header);assert.match(header,/<span dir="ltr">MyStore<\/span>/);assert.ok(header.includes('/images/logo.svg'));
for(const href of ['/', '/cart','/products','/categories','/offers','/about']){assert.ok(header.includes('href=\"'+href+'\"'),href);assert.ok(existsSync(resolve(root,'app',href==='/'?'page.tsx':href.slice(1)+'/page.tsx')),href);}
assert.match(header,/<form class=\"search\" action=\"\/products\" method=\"get\"/);
const {default:StoreLink}=await import(temp+'/components/store/link.mjs');const nativeLink=StoreLink({href:'/cart',children:'السلة'});assert.equal(nativeLink.type,'a');assert.equal(nativeLink.props.href,'/cart');assert.equal(nativeLink.props.onClick,undefined);

const html=render(Home),sections=['reference-hero container','collection-section container','reference-benefit-band','selection-section container','reference-collections container','reference-new container','reference-story container'];
let last=-1;for(const section of sections){const index=html.indexOf(section);assert.ok(index>last,section);last=index;}
for(const c of initialCatalog.categories)assert.ok(html.includes('href=\"/categories/'+c.id+'\"'));
assert.ok(!html.includes('hero-product-pick'));assert.ok(!html.includes('اختيارنا لهذا الموسم'));
assert.equal((html.match(/class="product-card"/g)||[]).length,8);assert.equal((html.match(/class="collection-banner /g)||[]).length,2);assert.equal((html.match(/class="category-card /g)||[]).length,4);
assert.ok(html.includes('لمسة فخامة'));assert.ok(html.includes('اختر التصميم')===false);assert.ok(html.includes('ترتيب المنتجات'));assert.ok(html.includes('وصل حديثًا'));
for(const match of html.matchAll(/<img[^>]+src="([^"]+)"/g))if(match[1].startsWith('/images/'))assert.ok(existsSync(resolve(root,'public'+match[1])),match[1]);
const disabled=render(Home,{...config.defaultContent,heroEnabled:false,categoriesEnabled:false,productsEnabled:false,newEnabled:false,collectionsEnabled:false,storyEnabled:false});for(const section of sections.filter(x=>x!=='reference-benefit-band'))assert.ok(!disabled.includes(section));
const footer=render(Footer);assert.ok(!footer.includes('قريبًا'));const connected=renderToStaticMarkup(React.createElement(StoreProvider,{initialCatalog:{...initialCatalog,settings:{...initialCatalog.settings,whatsapp:'972599000000',facebook:'https://facebook.com/test',instagram:'https://instagram.com/test'}}},React.createElement(Footer)));for(const href of ['https://wa.me/972599000000','https://facebook.com/test','https://instagram.com/test'])assert.ok(connected.includes(href));assert.match(footer,/type="email"/);assert.ok(footer.includes('اشتركي'));assert.ok(footer.includes('MyStore'));assert.ok(!footer.includes('المفضلة'));assert.ok(!footer.includes('footer-brand'));assert.ok(connected.includes('newsletter-bottom container'));assert.equal((connected.match(/<svg aria-hidden="true" width="20"/g)||[]).length,3);
assert.equal(config.referenceContent({heroTitle:'عنوان المتجر',heroImage:'/api/media/custom',storyText:'نص خاص'}).heroTitle,'عنوان المتجر');assert.equal(config.referenceContent({heroImage:'/api/media/custom'}).heroImage,'/api/media/custom');assert.equal(config.referenceContent({heroTitle:'لأن بيتك\nيشبهك.'}).heroTitle,config.defaultContent.heroTitle);
assert.deepEqual(execFileSync('git',['show','b638bfdf1fd9e9ade30dbb472759193997675e2f:public/images/logo.svg']),readFileSync(resolve(root,'public/images/logo.svg')));
assert.deepEqual(execFileSync('git',['show','b638bfdf1fd9e9ade30dbb472759193997675e2f:lib/catalog.ts']),readFileSync(resolve(root,'lib/catalog.ts')));
const css=readFileSync(resolve(root,'app/storefront.css'),'utf8');assert.ok(css.includes('@media(max-width:600px)'));assert.ok(css.includes('@media(max-width:360px)'));assert.ok(css.includes('object-fit:contain'));assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
console.log('PASS reference section order, eight original products, four categories, hero asset, two collection banners and newsletter.');
console.log('PASS content switches, uploaded images/custom text preserved, original logo/catalog unchanged and responsive RTL stylesheet.');
const {Dropdown}=await import(resolve(temp,'components/shared/dropdown.mjs'));
const dropdownHTML=renderToStaticMarkup(React.createElement('form',null,React.createElement(Dropdown,{name:'region',required:true,value:'', 'aria-label':'المنطقة'},React.createElement('option',{value:'',disabled:true},'اختاري المنطقة'),React.createElement('option',{value:'الضفة الغربية'},'الضفة الغربية'))));
assert.match(dropdownHTML,/role="combobox"/);assert.match(dropdownHTML,/aria-required="true"/);assert.match(dropdownHTML,/اختاري المنطقة/);
for(const file of ['components/store/checkout.tsx','components/store/catalog.tsx','components/store/detail.tsx','components/store/home.tsx','components/admin/dashboard.tsx','components/admin/fields.tsx'])assert.ok(!readFileSync(resolve(root,file),'utf8').includes('<select'));
console.log('PASS accessible shared in-page dropdowns replace all store and admin native controls.');
const {AdminShell}=await import(resolve(temp,'components/admin/shell.mjs'));const {ProductEditor}=await import(resolve(temp,'components/admin/product-editor.mjs'));
for(const gender of ['male','female']){const adminHTML=renderToStaticMarkup(React.createElement(AdminShell,{user:{id:'preview',name:'حساب اختبار',email:'preview@example.invalid',csrf:'preview',gender,role:'admin'}},React.createElement(ProductEditor,{categories:catalog.categories,onSave(){},onClose(){},busy:false,product:{...initialCatalog.products[0],description:'أضيفي نص المنتج كما هو',images:[],regularPrice:10,optionGroups:[],variants:[]}})));
assert.ok(adminHTML.includes(gender==='male'?'أضف منتجًا':'أضيفي منتجًا'));assert.ok(adminHTML.includes(gender==='male'?'اترك المخزون':'اتركي المخزون'));assert.ok(adminHTML.includes(gender==='male'?'أضف تصميمًا':'أضيفي تصميمًا'));assert.ok(adminHTML.includes('أضيفي نص المنتج كما هو'));}
console.log('PASS admin sidebar, product forms and design actions render male/female copy without altering editable product text.');
}finally{rmSync(temp,{recursive:true,force:true});}
