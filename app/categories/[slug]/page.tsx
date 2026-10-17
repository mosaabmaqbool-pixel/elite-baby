import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {catalogCategories} from '../../../lib/admin/catalog-db';
import {Catalog} from '../../../components/store/catalog';
import {publicMetadata,breadcrumb,categoryPath} from '../../../lib/seo';
import {siteUrl} from '../../../lib/seo-runtime';
import {JsonLd} from '../../../components/seo/json-ld';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const categories=await catalogCategories();const {slug}=await params;const c=categories.find(c=>c.id===slug);if(!c)notFound();return publicMetadata(siteUrl(),categoryPath(c.id),'ELITE BABY | '+c.name,c.description||'تصفحي منتجات '+c.name+' في متجر ELITE BABY.',c.image||'/images/elite-baby-logo.jpg');}
export default async function Page({params}:{params:Promise<{slug:string}>}){const categories=await catalogCategories();const {slug}=await params;const c=categories.find(c=>c.id===slug);if(!c)notFound();return <><JsonLd data={breadcrumb(siteUrl(),[{name:'الرئيسية',path:'/'},{name:'التصنيفات',path:'/categories'},{name:c.name,path:categoryPath(c.id)}])}/><Suspense><Catalog key={slug} category={slug}/></Suspense></>;}
