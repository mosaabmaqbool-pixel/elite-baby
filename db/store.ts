import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Store database unavailable');return env.DB;}
export function visitor(request:Request){const existing=request.headers.get('cookie')?.match(/(?:^|;\s*)storekit_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];return existing||crypto.randomUUID();}
export function reply(request:Request,session:string,data:unknown,status=200){return Response.json(data,{status,headers:{'Set-Cookie':`storekit_visitor=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'}});}
export function safeWrite(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
