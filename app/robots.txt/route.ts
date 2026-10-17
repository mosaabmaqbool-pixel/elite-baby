import {siteUrl} from '../../lib/seo-runtime';
import {robotsText} from '../../lib/seo';
export const dynamic='force-dynamic';
export function GET(){return new Response(robotsText(siteUrl()),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
