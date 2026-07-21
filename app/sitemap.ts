import type {MetadataRoute} from 'next'; export default function sitemap():MetadataRoute.Sitemap{return ['','/privacidade'].map(p=>({url:`https://vitinhobarber.com.br${p}`,lastModified:new Date()}))}
