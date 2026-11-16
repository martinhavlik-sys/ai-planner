import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {startLocalTest} from './lokalny-test-server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),allowed=new Set(['--iba-build','--bez-buildu','--port']);
try {
  for(let i=0;i<args.length;i++){
    if(!allowed.has(args[i]))throw Error('Použite --iba-build, --bez-buildu alebo --port ČÍSLO.');
    if(args[i]==='--port')i++;
  }
  const i=args.indexOf('--port'),port=i<0?4173:Number(args[i+1]);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port musí byť číslo od 1 do 65535.');
  if(args.includes('--iba-build')&&args.includes('--bez-buildu'))throw Error('Vyberte iba jeden spôsob prípravy buildu.');
  if(!args.includes('--bez-buildu')){
    const env={...process.env,CLOUDFLARE_TEST_EXPORT:'1',WORKERS_CI:'0',WORKERS_CI_BRANCH:'',NEXT_PUBLIC_LOCAL_TEST:'1',NEXT_PUBLIC_TEST_READ_ONLY:'0',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',NEXT_TELEMETRY_DISABLED:'1'};
    console.log('Pripravujem lokálny TEST bez cloudového pripojenia.');
    await rm(resolve(root,'out'),{recursive:true,force:true});
    const code=await new Promise((ok,fail)=>{const child=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'build'],{cwd:root,env,stdio:'inherit'});child.once('error',fail);child.once('exit',ok);});
    if(code!==0)throw Error('Build zlyhal. Overte Node.js a spustite pnpm install --frozen-lockfile.');
    await writeFile(resolve(root,'out/lokalny-test.json'),JSON.stringify({mode:'local-no-cloud',builtAt:new Date().toISOString()})+'\n');
  }
  const manifest=JSON.parse(await readFile(resolve(root,'out/lokalny-test.json'),'utf8'));
  if(manifest.mode!=='local-no-cloud')throw Error('Výstup nie je lokálny TEST. Spustite príkaz bez --bez-buildu.');
  if(args.includes('--iba-build')){console.log('PASS: lokálny TEST je pripravený v out/.');process.exit(0);}
  const app=await startLocalTest(resolve(root,'out'),{port});
  console.log(`Lokálny TEST: ${app.url}\nReport: ${app.url}/report\nDáta zostávajú v tomto prehliadači. Server ukončíte Ctrl+C.`);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().then(()=>process.exit(0));});
}catch(error){
  console.error(error?.code==='EADDRINUSE'?'Port je obsadený. Použite napríklad --port 4174.':error.message);
  process.exitCode=1;
}
