import {catalog} from '../../lib/admin/catalog-db';
import {siteUrl} from '../../lib/seo-runtime';
import {sitemapXml} from '../../lib/seo';
export const dynamic='force-dynamic';
export async function GET(){const {products,categories}=await catalog();return new Response(sitemapXml(siteUrl(),products,categories),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});}
