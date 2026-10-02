import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const routes=['/','/products/','/bns/','/solutions/ai-automation/','/solutions/business-systems/','/solutions/ai-chatbot/','/solutions/voice-support/','/products/crm/','/products/lms/'];
const manifest={source:'https://alterlabs.in',capturedAt:new Date().toISOString(),files:[]};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const route of routes){const r=await fetch('https://alterlabs.in'+route);if(r.status!==200)throw Error(route+' HTTP '+r.status);const original=await r.text();if(original.includes('https://workforce.alterlabs.in/'))throw Error(route+' already integrated; inspect existing state');let html=original;
 const footer=/<nav class="(?:ip-footer__links|s09-footer__links|footer-links)"[\s\S]*?<\/nav>/;
 if(footer.test(html))html=html.replace(footer,m=>m.replace('</nav>','<a href="https://workforce.alterlabs.in/" data-analytics-event="workforce_product_click">Alter Workforce</a>\n</nav>'));
 else throw Error(route+' footer pattern missing');
 if(route==='/products/'){
   const anchor='<ul class="ip-cards ip-cards--products" role="list">';if(!html.includes(anchor))throw Error('Product card insertion anchor missing');
   html=html.replace(anchor,anchor+`\n<li class="ip-card ip-card--product"><span class="ip-card__icon ip-card__icon--product" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#ip-i-ops"/></svg></span><h2 class="ip-card__title"><a class="ip-card__link" href="https://workforce.alterlabs.in/" data-analytics-event="workforce_product_click">Alter Workforce</a></h2><p class="ip-card__description">Hire your next employee. Software-based virtual employees for content, engineering, operations, sales and support.</p><span class="ip-card__go"><span class="ip-card__arrow" aria-hidden="true"><svg focusable="false"><use href="#ip-i-arrow"/></svg></span><span class="ip-card__go-label">Explore Virtual Employees</span></span></li>`);
 }else if(route!=='/'){
   const insert=`<section class="ip-section"><div class="ip-wrap ip-split"><h2 class="ip-h2">Put this workflow to work</h2><div class="ip-prose"><p>Explore software-based virtual employees for the everyday work around your business systems, with agreed permissions and human oversight.</p><ul class="ip-links"><li><a href="https://workforce.alterlabs.in/" data-analytics-event="workforce_product_click">Explore Alter Workforce virtual employees</a></li></ul></div></div></section>\n`;
   const anchor='<section class="ip-contact"';const at=html.indexOf(anchor);if(at<0)throw Error(route+' contact insertion anchor missing');html=html.slice(0,at)+insert+html.slice(at);
 }
 const file=path.join('deployment/workforce/primary',route,'index.html');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,html);
 manifest.files.push({route,file:file.replaceAll('\\','/'),before_sha256:sha(original),after_sha256:sha(html),changes:route==='/products/'?'native product card and footer link':route==='/'?'footer product link':'contextual product section and footer link'});
}
await fs.writeFile('deployment/workforce/primary-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Prepared targeted integration for '+routes.length+' live pages; no live writes.');
