import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
function wrangler(args,capture=false){
 const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:capture?'pipe':'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(result.status!==0){if(capture)process.stderr.write(result.stderr||result.stdout||'Wrangler gagal.');throw new Error('Perintah gagal: wrangler '+args.join(' '));}
 return result.stdout;
}
try{
 await import('./build-content.mjs');
 wrangler(['whoami']);
 wrangler(['deploy','--dry-run']);
 const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
 const binding=config.d1_databases.find(x=>x.binding==='DB');
 let databases=JSON.parse(wrangler(['d1','list','--json'],true));
 let database=databases.find(x=>x.name==='anakberani-db');
 if(!database){
  wrangler(['d1','create','anakberani-db','--location','apac','--update-config=false']);
  databases=JSON.parse(wrangler(['d1','list','--json'],true));
  database=databases.find(x=>x.name==='anakberani-db');
 }
 if(!database?.uuid)throw new Error('ID database tidak ditemukan. Deployment dihentikan.');
 binding.database_id=database.uuid;
 writeFileSync('wrangler.jsonc',JSON.stringify(config,null,2)+'\n');
 wrangler(['d1','migrations','apply','anakberani-db','--remote']);
 wrangler(['types']);
 const result=wrangler(['deploy'],true);process.stdout.write(result);
 const live=result.match(/https:\/\/anakberani-app\.[a-z0-9-]+\.workers\.dev/);
 if(!live)throw new Error('Deploy selesai, tetapi URL workers.dev tidak ditemukan; periksa dashboard.');
 const response=await fetch(live[0]+'/api/health');
 const health=await response.json();
 if(!response.ok||health.ok!==true)throw new Error('Health check live gagal. Periksa wrangler tail.');
 console.log('Health check D1 berhasil: '+live[0]);
 console.log('Lanjutkan pengujian register/login dan aktivitas di URL live. Commit database_id yang diperbarui.');
}catch(error){console.error(error.message);process.exitCode=1;}
