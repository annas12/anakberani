import { pbkdf2Sync } from 'node:crypto';
import { program, lessons, branches } from './content.js';
const enc = new TextEncoder();
const skills = ['mental','voice','boundary','situation','safety','emotion'];
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new HttpError(status,message)};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const text=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
const stmt=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const all=async(env,sql,...args)=>(await stmt(env,sql,...args).all()).results;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
function token(request){return (request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('anakberani_session='))?.slice(19)||'';}
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256);
 return Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('');
}
function equal(a,b){return a.length===b.length&&crypto.subtle.timingSafeEqual(enc.encode(a),enc.encode(b));}
async function body(request){
 if(!request.headers.get('Content-Type')?.includes('application/json'))fail(415,'Gunakan JSON.');
 const reader=request.body?.getReader(); if(!reader)fail(400,'Data diperlukan.');
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();fail(413,'Data terlalu besar.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'JSON tidak valid.');return value;}catch{fail(400,'JSON tidak valid.');}
}
async function owner(env,user,id){if(typeof id!=='string'||!id)fail(400,'Pilih profil anak.');const child=await stmt(env,'SELECT id,name,birth_year,school_level FROM children WHERE id=? AND user_id=?',id,user.id).first();if(!child)fail(404,'Profil tidak ditemukan.');return child;}
async function session(env,user,status=200){const value=random();await stmt(env,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await hash(value),user.id,new Date(Date.now()+30*86400000).toISOString()).run();return json({user:{id:user.id,email:user.email,display_name:user.display_name}},status,{'Set-Cookie':`anakberani_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`});}
async function auth(request,env,path){
 if(path==='/api/auth/logout'){const value=token(request);if(value)await stmt(env,'DELETE FROM sessions WHERE token_hash=?',await hash(value)).run();return json({ok:true},200,{'Set-Cookie':'anakberani_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
 const b=await body(request),email=text(b.email,254).toLowerCase(),password=b.password;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<8||password.length>256)fail(400,'Gunakan email valid dan password 8–256 karakter.');
 const now=Math.floor(Date.now()/1000),ipKey=await hash('ip:'+(request.headers.get('CF-Connecting-IP')||'local')),key=await hash((request.headers.get('CF-Connecting-IP')||'local')+':'+email);
 await stmt(env,'DELETE FROM auth_limits WHERE expires<?',now).run();
 const ipLimit=await stmt(env,'INSERT INTO auth_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts',ipKey,now+900).first();
 if(ipLimit.attempts>60)fail(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
 const limit=await stmt(env,'INSERT INTO auth_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts',key,now+900).first();
 if(limit.attempts>10)fail(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
 let user=await stmt(env,'SELECT * FROM users WHERE email=?',email).first();
 if(path==='/api/auth/register'){
  if(user)fail(409,'Email sudah terdaftar. Silakan masuk.');
  const salt=random();user={id:crypto.randomUUID(),email,display_name:text(b.display_name,80)};
  try{await stmt(env,'INSERT INTO users(id,email,password_hash,password_salt,display_name) VALUES(?,?,?,?,?)',user.id,email,'pbkdf2-v2:'+await passwordHash(password,salt),salt,user.display_name).run();}catch(err){if(String(err.message).includes('UNIQUE'))fail(409,'Email sudah terdaftar.');throw err;}
  return session(env,user,201);
 }
 const candidate=await passwordHash(password,user?.password_salt||'unknown-user-salt');
 let valid=user&&equal('pbkdf2-v2:'+candidate,user.password_hash);
 if(user&&!user.password_hash.startsWith('pbkdf2-v2:')){
  const legacy=pbkdf2Sync(password,Buffer.from(user.password_salt,'base64url'),210000,32,'sha256').toString('hex');
  valid=equal(legacy,user.password_hash);
  if(valid){const salt=random();await stmt(env,'UPDATE users SET password_hash=?,password_salt=? WHERE id=?','pbkdf2-v2:'+await passwordHash(password,salt),salt,user.id).run();}
 }
 if(!valid)fail(401,'Email atau password salah.');
 return session(env,user);
}
async function progress(env,user,id){
 const [completed,days,simulations,exercises]=await Promise.all([
 all(env,'SELECT lesson_id,completed_at FROM completed_lessons WHERE child_id=? AND user_id=?',id,user.id),
 all(env,'SELECT day,completed_at FROM program_progress WHERE child_id=? AND completed_at IS NOT NULL',id),
 all(env,'SELECT scenario_id,scores,created_at FROM simulation_results WHERE child_id=? ORDER BY created_at',id),
 all(env,'SELECT exercise_id,completed_at FROM parent_child_exercises WHERE child_id=?',id)]);
 const scores=Object.fromEntries(skills.map(s=>[s,0]));
 for(const row of completed){const l=lessons.find(x=>x.id===row.lesson_id);if(l)scores[l.skill]+=6;}
 for(const row of days){scores[program[row.day-1].skill]+=3;scores.emotion+=1;}
 const best=new Map();for(const row of simulations){const value=JSON.parse(row.scores);const previous=best.get(row.scenario_id);if(!previous||value.reduce((a,b)=>a+b,0)>previous.reduce((a,b)=>a+b,0))best.set(row.scenario_id,value);}
 for(const value of best.values()){['voice','emotion','situation','boundary','safety','mental'].forEach((key,i)=>scores[key]+=Math.round(value[i]/20));}
 for(const s of skills)scores[s]=Math.min(100,scores[s]);
 const xp=completed.length*15+days.length*25+best.size*20+exercises.length*10;
 const dates=new Set([...completed,...days,...simulations,...exercises].map(x=>(x.completed_at||x.created_at).slice(0,10)));
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});let cursor=new Date(today+'T00:00:00Z'),streak=0;
 if(!dates.has(today))cursor.setUTCDate(cursor.getUTCDate()-1);
 while(dates.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
 await stmt(env,`INSERT INTO training_progress(user_id,child_id,xp,streak,mental,voice,boundary_score,situation,safety,emotion) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,child_id) DO UPDATE SET xp=excluded.xp,streak=excluded.streak,mental=excluded.mental,voice=excluded.voice,boundary_score=excluded.boundary_score,situation=excluded.situation,safety=excluded.safety,emotion=excluded.emotion,updated_at=CURRENT_TIMESTAMP`,user.id,id,xp,streak,scores.mental,scores.voice,scores.boundary,scores.situation,scores.safety,scores.emotion).run();
 return {xp,level:Math.floor(xp/100)+1,streak,skills:scores,completed:completed.map(x=>x.lesson_id),days:days.map(x=>x.day),simulations:best.size,exercises:exercises.map(x=>x.exercise_id)};
}
export default {async fetch(request,env){
 const url=new URL(request.url);let path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
  if(!['GET','HEAD'].includes(request.method)){
   const origin=request.headers.get('Origin');if((origin&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')fail(403,'Permintaan lintas situs ditolak.');
  }
  if(path==='/api/health'&&request.method==='GET'){await env.DB.prepare('SELECT 1 FROM program_progress LIMIT 1').all();return json({ok:true,service:'AnakBerani',database:'D1'});}
  if(['/api/register','/api/login','/api/logout'].includes(path))path=path.replace('/api/','/api/auth/');
  if(['/api/auth/register','/api/auth/login','/api/auth/logout'].includes(path)&&request.method==='POST')return await auth(request,env,path);
  const value=token(request);const user=value?await stmt(env,'SELECT u.id,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await hash(value),new Date().toISOString()).first():null;
  if(!user)fail(401,'Silakan masuk terlebih dahulu.');
  if(path==='/api/me'&&request.method==='GET')return json({user});
  if(path==='/api/children'){
   if(request.method==='GET')return json({children:await all(env,'SELECT id,name,birth_year,school_level FROM children WHERE user_id=? ORDER BY created_at,id',user.id)});
   if(request.method==='POST'){const b=await body(request),name=text(b.name,80);if(!name)fail(400,'Nama panggilan anak diperlukan.');const year=b.birth_year?Number(b.birth_year):null;if(year&&(!Number.isInteger(year)||year<1990||year>new Date().getFullYear()))fail(400,'Tahun lahir tidak valid.');const id=crypto.randomUUID();await stmt(env,'INSERT INTO children(id,user_id,name,birth_year,school_level) VALUES(?,?,?,?,?)',id,user.id,name,year,text(b.school_level,30)).run();return json({id,name,birth_year:year,school_level:text(b.school_level,30)},201);}
  }
  const match=path.match(/^\/api\/children\/([^/]+)(\/progress)?$/);
  if(match&&request.method==='GET'){const child=await owner(env,user,match[1]);return json(match[2]?{progress:await progress(env,user,child.id)}:{child});}
  const allowed=['/api/checkins','/api/incidents','/api/progress','/api/program/progress','/api/lessons/complete','/api/lessons/completed','/api/simulations/result','/api/exercises','/api/dashboard'];
  if(!allowed.includes(path))fail(404,'API tidak ditemukan.');
  if(!['GET','POST'].includes(request.method))fail(405,'Metode tidak didukung.');
  const b=request.method==='POST'?await body(request):{};const id=request.method==='POST'?b.child_id:url.searchParams.get('child_id');await owner(env,user,id);
  if(request.method==='GET'){
   if(path==='/api/progress')return json({progress:await progress(env,user,id)});
   if(path==='/api/checkins')return json({checkins:await all(env,'SELECT id,value,note,created_at FROM daily_checkins WHERE child_id=? ORDER BY created_at,id',id)});
   if(path==='/api/incidents')return json({incidents:await all(env,'SELECT * FROM incidents WHERE child_id=? AND user_id=? ORDER BY created_at,id',id,user.id)});
   if(path==='/api/lessons/completed')return json({lessons:await all(env,'SELECT lesson_id,completed_at FROM completed_lessons WHERE child_id=?',id)});
   if(path==='/api/program/progress')return json({program:await all(env,'SELECT p.*,r.note FROM program_progress p LEFT JOIN reflections r ON r.child_id=p.child_id AND r.day=p.day WHERE p.child_id=? ORDER BY p.day',id)});
   if(path==='/api/dashboard')return json({progress:await progress(env,user,id),checkins:await all(env,'SELECT id,value,note,created_at FROM daily_checkins WHERE child_id=? ORDER BY created_at,id',id),incidents:await all(env,'SELECT * FROM incidents WHERE child_id=? AND user_id=? ORDER BY created_at,id',id,user.id),program:await all(env,'SELECT p.*,r.note FROM program_progress p LEFT JOIN reflections r ON r.child_id=p.child_id AND r.day=p.day WHERE p.child_id=?',id),simulations:await all(env,'SELECT scenario_id,scores,created_at FROM simulation_results WHERE child_id=? ORDER BY created_at DESC LIMIT 100',id)});
  }else{
   if(path==='/api/checkins'){if(!['Aman','Diganggu','Takut','Dibully'].includes(b.value))fail(400,'Pilihan check-in tidak valid.');const item=crypto.randomUUID();await stmt(env,'INSERT INTO daily_checkins(id,user_id,child_id,value,note) VALUES(?,?,?,?,?)',item,user.id,id,b.value,text(b.note,1000)).run();return json({id:item},201);}
   if(path==='/api/incidents'){
    const type=text(b.incident_type,80),story=text(b.story,4000),date=text(b.incident_date,10);if(!type||!story||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))fail(400,'Isi jenis, tanggal, dan kronologi kejadian.');
    const item=crypto.randomUUID();await stmt(env,'INSERT INTO incidents(id,user_id,child_id,incident_type,incident_date,place,story,witness,reported_status,evidence_status,approximate_time,involved,repeated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',item,user.id,id,type,date,text(b.place,150),story,text(b.witness,500),text(b.reported_status,80)||'Belum',text(b.evidence_status,80)||'Tidak ada',text(b.approximate_time,30),text(b.involved,300),b.repeated===true?1:0).run();return json({id:item},201);
   }
   if(path==='/api/lessons/complete'){if(!lessons.some(x=>x.id===b.lesson_id))fail(400,'Materi tidak ditemukan.');await stmt(env,"INSERT OR IGNORE INTO completed_lessons(user_id,child_id,lesson_id,completed_at) VALUES(?,?,?,datetime('now','+7 hours'))",user.id,id,b.lesson_id).run();return json({ok:true});}
   if(path==='/api/program/progress'){
    if(!Number.isInteger(b.day)||b.day<1||b.day>30)fail(400,'Hari tidak valid.');const d=program[b.day-1];
    const answer=b.answer??null;if(answer!==null&&(!Number.isInteger(answer)||!d.options[answer]))fail(400,'Jawaban tidak valid.');
    if(!Array.isArray(b.checks)||b.checks.some(x=>!Number.isInteger(x)||x<0||x>=d.practice.length))fail(400,'Checklist tidak valid.');
    const note=text(b.note,2000),checks=[...new Set(b.checks)];
    if(b.complete===true&&(!d.options[answer]?.[1]||checks.length!==d.practice.length||note.length<3))fail(400,'Jawab skenario dengan tepat, selesaikan misi, dan isi refleksi.');
    await env.DB.batch([
     stmt(env,"INSERT INTO program_progress(user_id,child_id,day,answer,checks,completed_at) VALUES(?,?,?,?,?,CASE WHEN ? THEN datetime('now','+7 hours') ELSE NULL END) ON CONFLICT(child_id,day) DO UPDATE SET answer=excluded.answer,checks=excluded.checks,completed_at=COALESCE(program_progress.completed_at,excluded.completed_at),updated_at=CURRENT_TIMESTAMP",user.id,id,b.day,answer,JSON.stringify(checks),b.complete===true?1:0),
     stmt(env,'INSERT INTO reflections(child_id,day,note) VALUES(?,?,?) ON CONFLICT(child_id,day) DO UPDATE SET note=excluded.note,updated_at=CURRENT_TIMESTAMP',id,b.day,note)]);return json({ok:true});
   }
   if(path==='/api/simulations/result'){
    const scenario=branches.find(x=>x.id===b.scenario_id);if(!scenario||!Array.isArray(b.path)||b.path.length<2||b.path.length>8)fail(400,'Simulasi tidak valid.');
    let node=scenario.start;const scores=[0,0,0,0,0,0];for(const choice of b.path){const option=Number.isInteger(choice)?scenario.nodes[node]?.options[choice]:null;if(!option)fail(400,'Jalur simulasi tidak valid.');option.scores.forEach((n,i)=>scores[i]+=n);node=option.next;}
    if(node!=='end')fail(400,'Selesaikan simulasi dahulu.');const result=scores.map(n=>Math.round(n/b.path.length));
    await stmt(env,"INSERT INTO simulation_results(id,user_id,child_id,scenario_id,path,scores,created_at) VALUES(?,?,?,?,?,?,datetime('now','+7 hours'))",crypto.randomUUID(),user.id,id,scenario.id,JSON.stringify(b.path),JSON.stringify(result)).run();return json({scores:result},201);
   }
   if(path==='/api/exercises'){if(!['voice','belongings','exit','story'].includes(b.exercise_id))fail(400,'Latihan tidak valid.');await stmt(env,"INSERT OR IGNORE INTO parent_child_exercises(user_id,child_id,exercise_id,completed_at) VALUES(?,?,?,datetime('now','+7 hours'))",user.id,id,b.exercise_id).run();return json({ok:true});}
  }
  fail(405,'Metode tidak didukung.');
 }catch(err){if(err instanceof HttpError)return json({error:err.message},err.status);console.error(JSON.stringify({event:'api_error',path,message:err.message}));return json({error:'Terjadi kendala server. Coba lagi.'},500);}
}};
