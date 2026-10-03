import { pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { program, branches } from '../src/content.js';

test('Worker + D1: auth, ownership, activities, validated progress and session lifecycle',async()=>{
 const bundle=await build({entryPoints:['src/index.js'],bundle:true,write:false,format:'esm',platform:'neutral',external:['node:*']});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-02',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'test-db'}}));
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0001_initial.sql','0002_activity.sql']){const statements=readFileSync('migrations/'+file,'utf8').split(';').map(x=>x.trim()).filter(Boolean);await db.batch(statements.map(sql=>db.prepare(sql)));}
  let cookie='';
  const call=async(path,method='GET',data,customCookie=cookie,headers={})=>{const response=await mf.dispatchFetch('https://example.com/api'+path,{method,headers:{Cookie:customCookie,...(data!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:data!==undefined?JSON.stringify(data):undefined});return {status:response.status,data:await response.json(),headers:response.headers};};
  assert.equal((await call('/health')).status,200);
  const legacySalt=Buffer.from('legacy-test-salt').toString('base64url');
  await db.prepare('INSERT INTO users(id,email,password_hash,password_salt) VALUES(?,?,?,?)').bind('legacy','legacy@example.com',pbkdf2Sync('legacy-password',Buffer.from(legacySalt,'base64url'),210000,32,'sha256').toString('hex'),legacySalt).run();
  assert.equal((await call('/auth/login','POST',{email:'legacy@example.com',password:'legacy-password'})).status,200,'existing accounts migrate their password hash safely');
  assert.equal((await call('/children')).status,401);
  assert.equal((await call('/auth/register','POST',{email:'parent@example.com',password:'testing123'},'',{Origin:'https://evil.example'})).status,403);
  const registered=await call('/auth/register','POST',{email:'parent@example.com',password:'testing123',display_name:'Tester'});
  assert.equal(registered.status,201,JSON.stringify(registered.data));cookie=registered.headers.get('set-cookie').split(';')[0];
  for(const flag of ['HttpOnly','Secure','SameSite=Lax','Max-Age=2592000'])assert.ok(registered.headers.get('set-cookie').includes(flag));
  assert.equal((await call('/me')).status,200,'session cookie authenticates');
  assert.equal((await call('/auth/login','POST',{email:'parent@example.com',password:'wrong-password'})).status,401);
  assert.equal((await call('/auth/login','POST',{email:'parent@example.com',password:'testing123'})).status,200);
  const child=(await call('/children','POST',{name:'Test child'})).data.id;assert.ok(child);
  const second=(await call('/children','POST',{name:'Second child'})).data.id;
  assert.equal((await call('/children/'+child)).status,200);
  assert.equal((await call('/children/'+child+'/progress')).data.progress.xp,0);
  const other=await call('/auth/register','POST',{email:'other@example.com',password:'testing123'});const otherCookie=other.headers.get('set-cookie').split(';')[0];
  for(const path of ['/children/'+child,'/children/'+child+'/progress','/dashboard?child_id='+child,'/incidents?child_id='+child,'/checkins?child_id='+child,'/program/progress?child_id='+child])assert.equal((await call(path,'GET',undefined,otherCookie)).status,404,path);
  assert.equal((await call('/checkins','POST',{child_id:child,value:'Takut'},otherCookie)).status,404);
  assert.equal((await call('/checkins','POST',{child_id:child,value:'Takut',note:'Guru menemani'})).status,201);
  assert.equal((await call('/checkins','POST',{child_id:child,value:'fake'})).status,400);
  assert.equal((await call('/incidents','POST',{child_id:child,incident_type:'Ejekan',incident_date:'2026-10-03',story:'Catatan uji tanpa bukti',repeated:true})).status,201);
  assert.equal((await call('/incidents?child_id='+child)).data.incidents.length,1);
  assert.equal((await call('/incidents?child_id='+second)).data.incidents.length,0);
  assert.equal((await call('/program/progress','POST',{child_id:child,day:1,answer:0,checks:[],note:'',complete:true})).status,400);
  const d=program[0],payload={child_id:child,day:1,answer:d.options.findIndex(o=>o[1]),checks:d.practice.map((_,i)=>i),note:'Saya bisa meminta bantuan',complete:true};
  for(let i=0;i<2;i++)assert.equal((await call('/program/progress','POST',payload)).status,200);
  assert.equal((await call('/progress?child_id='+child)).data.progress.xp,25,'repeated completion does not duplicate XP');
  assert.equal((await call('/progress?child_id='+child)).data.progress.streak,1);
  assert.equal((await call('/program/progress?child_id='+child)).data.program[0].note,payload.note);
  assert.equal((await call('/lessons/complete','POST',{child_id:child,lesson_id:'L1'})).status,200);
  assert.equal((await call('/lessons/complete','POST',{child_id:child,lesson_id:'fake'})).status,400);
  assert.equal((await call('/simulations/result','POST',{child_id:child,scenario_id:'ejekan',path:[0]})).status,400);
  for(const scenario of branches){assert.equal((await call('/simulations/result','POST',{child_id:child,scenario_id:scenario.id,path:[0,0]})).status,201);}
  assert.equal((await call('/simulations/result','POST',{child_id:child,scenario_id:'ejekan',path:[1,0]})).status,201);
  assert.equal((await call('/exercises','POST',{child_id:child,exercise_id:'voice'})).status,200);
  const dashboard=(await call('/dashboard?child_id='+child)).data;assert.equal(dashboard.progress.xp,250);assert.equal(dashboard.progress.simulations,10);assert.equal(dashboard.checkins.length,1);
  assert.equal((await call('/auth/logout','POST',{})).status,200);assert.equal((await call('/me')).status,401);
  const login=await call('/auth/login','POST',{email:'parent@example.com',password:'testing123'});cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/dashboard?child_id='+child)).data.progress.xp,250,'data survives logout/login');
  await db.prepare("UPDATE sessions SET expires_at='2000-01-01'").run();assert.equal((await call('/me')).status,401);
  console.log('Verified auth, cookie flags, CSRF, cross-account isolation, child isolation, check-ins, incidents without evidence, 30-day gates, idempotent XP, 10 branching simulations, exercises, persistence, expiry, logout.');
 }finally{await mf.dispose();}
});

test('all 30 days have complete interactive content and all branches terminate',()=>{
 assert.equal(program.length,30);
 for(const d of program){for(const key of ['title','goal','learn','scenario','parent','reflect','pass','skill'])assert.ok(d[key]);assert.ok(d.practice.length);assert.ok(d.options.some(x=>x[1]));}
 assert.equal(branches.length,10);
 for(const scenario of branches){function visit(node,depth=0){assert.ok(depth<8);if(node==='end')return;assert.ok(scenario.nodes[node]);for(const o of scenario.nodes[node].options){assert.equal(o.scores.length,6);visit(o.next,depth+1);}}visit(scenario.start);}
});

