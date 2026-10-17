import {Home} from '../components/store/home';
import {settings} from '../lib/admin/catalog-db';
import {publicMetadata,homeSchema} from '../lib/seo';
import {siteUrl} from '../lib/seo-runtime';
import {JsonLd} from '../components/seo/json-ld';
export function generateMetadata(){return publicMetadata(siteUrl(),'/','ELITE BABY | عالم صغير، حب كبير','اكتشفي عالم ELITE BABY للملابس والمفارش وإكسسوارات البيبي وهدايا المواليد.');}
export default async function Page(){const data=await settings();return <><JsonLd data={homeSchema(siteUrl(),data.settings)}/><Home/></>;}
