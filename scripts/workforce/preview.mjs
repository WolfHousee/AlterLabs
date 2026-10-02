import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('workforce');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+pathname);const relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
 try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html'); const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}
 catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await fs.readFile(path.join(root,'404.html')));}
}).listen(4884,'127.0.0.1',()=>console.log('Workforce preview http://127.0.0.1:4884'));
