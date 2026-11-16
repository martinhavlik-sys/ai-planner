import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';

export async function startLocalTest(directory,{port=4173}={}) {
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('Neplatný port lokálneho testu.');
  const root=await realpath(directory);
  for(const file of ['index.html','report/index.html'])await stat(resolve(root,file));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png'};
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'");
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Povolené je iba lokálne čítanie súborov.');return;}
    try {
      const host=new URL('http://'+req.headers.host).hostname;
      if(!['127.0.0.1','localhost'].includes(host)){res.writeHead(403);res.end('Nepovolený hostiteľ.');return;}
      const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(path.split('/').some(p=>p.startsWith('.'))||path.includes('\\')||path.includes('\0'))throw Error();
      let file=resolve(root,'.'+path);
      if(file!==root&&!file.startsWith(root+sep))throw Error();
      if((await stat(file)).isDirectory())file=resolve(file,'index.html');
      file=await realpath(file);
      if(!file.startsWith(root+sep))throw Error();
      const data=await readFile(file);
      res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Content-Length':data.length});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404);res.end('Súbor neexistuje.');}
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  return {server,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((ok,fail)=>server.close(e=>e?fail(e):ok()))};
}
