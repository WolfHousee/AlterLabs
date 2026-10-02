import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
const expected=[['virtual-content-creator',7999],['virtual-engineer',14999],['virtual-operations-manager',9999],['virtual-team-leader',12999],['virtual-sales-agent-chat',6999],['virtual-support-agent-chat',5999],['virtual-sales-agent-voice',9999],['virtual-support-agent-voice',7999]];
const root=path.resolve('workforce');const origin='https://workforce.alterlabs.in';
const titles=new Set();const descriptions=new Set();const files=['index.html',...expected.map(([slug])=>slug+'/index.html')];
const sitemap=await fs.readFile(path.join(root,'sitemap.xml'),'utf8');const robots=await fs.readFile(path.join(root,'robots.txt'),'utf8');
assert.match(robots,/Allow: \/\n/);assert.match(robots,/Sitemap: https:\/\/workforce\.alterlabs\.in\/sitemap.xml/);assert.equal((sitemap.match(/<loc>/g)||[]).length,9);
for(const [i,file] of files.entries()){
 const html=await fs.readFile(path.join(root,file),'utf8');const route=i?'/'+expected[i-1][0]+'/':'/';
 assert.match(html,/<html lang="en-IN">/);assert.equal((html.match(/<h1\b/g)||[]).length,1,file+' one H1');
 assert(!/noindex|nofollow/i.test(html),file+' indexable');assert(html.includes(`<link rel="canonical" href="${origin}${route}">`));assert(sitemap.includes(`<loc>${origin}${route}</loc>`));
 const title=html.match(/<title>(.*?)<\/title>/)[1];const description=html.match(/<meta name="description" content="([^"]+)"/)[1];assert(!titles.has(title));assert(!descriptions.has(description));titles.add(title);descriptions.add(description);
 assert(html.includes('software-based virtual employees'));assert(html.includes('not human employees'));assert(html.includes('₹9,999'));assert(html.includes('billed separately'));assert(html.includes('https://wa.me/917739108923?text='));assert(html.includes('/analytics-events.js'));
 assert(!/aggregateRating|reviewCount|InStock|limited spots|guaranteed/i.test(html));
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
 const faq=graph.find(g=>g['@type']==='FAQPage');for(const q of faq.mainEntity){assert(html.includes(q.name.replaceAll('&','&amp;')));assert(html.includes(q.acceptedAnswer.text.replaceAll('&','&amp;')));}
 if(i){const service=graph.find(g=>g['@type']==='Service');assert.equal(service.offers.price,String(expected[i-1][1]));assert.equal(service.offers.priceCurrency,'INR');assert.equal(service.url,origin+route);assert(graph.some(g=>g['@type']==='BreadcrumbList'));assert(html.includes('What stays human-reviewed'));assert(html.includes('Onboarding'));}
 else{assert(html.includes('₹24,999'));assert(html.includes('₹49,999'));for(const [slug] of expected)assert(html.includes(`href="/${slug}/"`));}
 for(const m of html.matchAll(/(?:src|href)="(\/(?!\/)[^"#?]*)(?:[#?][^"]*)?"/g)){if(m[1]==='')continue;const dest=path.join(root,m[1]);const stat=await fs.stat(dest);assert(stat.isFile()||await fs.stat(path.join(dest,'index.html')));}
}
const manifest=JSON.parse(await fs.readFile('scripts/workforce/reference/manifest.json','utf8'));
for(const file of manifest.files){const actual=crypto.createHash('sha256').update(await fs.readFile(file.path)).digest('hex');assert.equal(actual,file.sha256,'Live asset changed: '+file.path);}
const report={verifiedAt:new Date().toISOString(),pages:9,uniqueTitles:titles.size,uniqueDescriptions:descriptions.size,sitemapUrls:9,liveAssetHashesVerified:manifest.files.length,checks:['self-canonicals','lang en-IN','one H1','indexable HTML','visible FAQ and matching schema','INR prices','human disclosure','usage disclosure','internal links','live analytics and conversion targets','no fabricated reviews or availability']};
await fs.mkdir('deployment/workforce',{recursive:true});await fs.writeFile('deployment/workforce/seo-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
