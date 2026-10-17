import {notFound} from 'next/navigation';
import {catalog} from '../../../lib/admin/catalog-db';
import {ProductDetail} from '../../../components/store/detail';
import {productMetadata,productSchema,breadcrumb,categoryPath,productPath} from '../../../lib/seo';
import {siteUrl} from '../../../lib/seo-runtime';
import {JsonLd} from '../../../components/seo/json-ld';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {products}=await catalog();const {id}=await params;const p=products.find(p=>p.id===id);if(!p)notFound();return productMetadata(siteUrl(),p);}
export default async function Page({params}:{params:Promise<{id:string}>}){const {products,categories}=await catalog();const {id}=await params;const p=products.find(p=>p.id===id);if(!p)notFound();const c=categories.find(c=>c.id===p.category);return <><JsonLd data={productSchema(siteUrl(),p)}/><JsonLd data={breadcrumb(siteUrl(),[{name:'الرئيسية',path:'/'},...(c?[{name:c.name,path:categoryPath(c.id)}]:[]),{name:p.name,path:productPath(p.id)}])}/><ProductDetail key={id} product={p}/></>;}
