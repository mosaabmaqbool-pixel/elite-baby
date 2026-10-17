import {env} from 'cloudflare:workers';
import {normalizeSiteUrl} from './seo';
export function siteUrl(){const value=(env as unknown as {SITE_URL?:string}).SITE_URL;if(!value)throw new Error('Configure SITE_URL in the hosting environment');return normalizeSiteUrl(value);}
