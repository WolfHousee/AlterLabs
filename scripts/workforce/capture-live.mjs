import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('workforce');
const ref = path.resolve('scripts/workforce/reference');
await fs.mkdir(ref,{recursive:true});
await fs.mkdir(path.join(root,'assets'),{recursive:true});
const manifest = {capturedAt:new Date().toISOString(),source:'https://alterlabs.in/',files:[]};
async function get(url, dest) {
  const r = await fetch(url); if(!r.ok)throw Error(url+' HTTP '+r.status);
  const b = Buffer.from(await r.arrayBuffer());
  await fs.mkdir(path.dirname(dest),{recursive:true}); await fs.writeFile(dest,b);
  manifest.files.push({url,path:path.relative(process.cwd(),dest).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length});
  return b.toString('utf8');
}
const html = await get('https://alterlabs.in/solutions/voice-support/',path.join(ref,'service.html'));
const cssUrl = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)[1];
const css = await get('https://alterlabs.in'+cssUrl,path.join(root,cssUrl));
for(const m of new Set([...css.matchAll(/url\((?:["']?)([^)'"\s]+)(?:["']?)\)/g)].map(m=>m[1]))) {
  if(m.startsWith('data:'))continue;
  const u = new URL(m,'https://alterlabs.in'+cssUrl);
  await get(u.href,path.join(root,u.pathname));
}
await get('https://alterlabs.in/analytics-events.js',path.join(root,'analytics-events.js'));
for(const name of ['favicon.svg','favicon-32.png','apple-touch-icon.png'])await get('https://alterlabs.in/'+name,path.join(root,name));
await fs.writeFile(path.join(ref,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Captured exact live assets: '+manifest.files.length+' files');
