const enc = new TextEncoder();
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT 1 AS ok').first();
        return json({ ok: row?.ok === 1, service: 'AnakBerani API' });
      }
      if (url.pathname === '/api/register' && request.method === 'POST') return register(request, env);
      if (url.pathname === '/api/login' && request.method === 'POST') return login(request, env);
      if (url.pathname === '/api/logout' && request.method === 'POST') return logout(request, env);

      const user = await requireUser(request, env);
      if (!user) return json({ error: 'UNAUTHORIZED' }, 401);

      if (url.pathname === '/api/me' && request.method === 'GET') {
        return json({ user: { id: user.id, email: user.email, display_name: user.display_name } });
      }
      if (url.pathname === '/api/children') {
        if (request.method === 'GET') return listChildren(user, env);
        if (request.method === 'POST') return createChild(request, user, env);
      }
      if (url.pathname === '/api/checkins') {
        if (request.method === 'GET') return listCheckins(user, env);
        if (request.method === 'POST') return createCheckin(request, user, env);
      }
      if (url.pathname === '/api/incidents') {
        if (request.method === 'GET') return listIncidents(user, env);
        if (request.method === 'POST') return createIncident(request, user, env);
      }
      if (url.pathname === '/api/progress') {
        if (request.method === 'GET') return getProgress(url, user, env);
        if (request.method === 'PUT') return saveProgress(request, user, env);
      }
      if (url.pathname === '/api/lessons/complete' && request.method === 'POST') {
        return completeLesson(request, user, env);
      }
      if (url.pathname === '/api/lessons/completed' && request.method === 'GET') {
        return completedLessons(url, user, env);
      }
      return json({ error: 'NOT_FOUND' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'SERVER_ERROR' }, 500);
    }
  }
};

async function register(request, env) {
  const b = await readJson(request);
  const email = normalizeEmail(b.email);
  const password = String(b.password || '');
  const displayName = clean(b.display_name, 80);
  if (!email || password.length < 8) return json({ error: 'Email valid dan password minimal 8 karakter.' }, 400);
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: 'Email sudah terdaftar.' }, 409);
  const salt = randomB64(16);
  const hash = await hashPassword(password, salt);
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO users (id,email,password_hash,password_salt,display_name) VALUES (?,?,?,?,?)')
    .bind(id, email, hash, salt, displayName).run();
  return createSessionResponse({ id, email, display_name: displayName }, env, 201);
}

async function login(request, env) {
  const b = await readJson(request);
  const email = normalizeEmail(b.email);
  const password = String(b.password || '');
  const user = await env.DB.prepare('SELECT id,email,password_hash,password_salt,display_name FROM users WHERE email = ?').bind(email).first();
  if (!user) return json({ error: 'Email atau password salah.' }, 401);
  const hash = await hashPassword(password, user.password_salt);
  if (!timingSafeEqual(hash, user.password_hash)) return json({ error: 'Email atau password salah.' }, 401);
  return createSessionResponse(user, env, 200);
}

async function createSessionResponse(user, env, status) {
  const token = randomB64(32);
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(tokenHash, user.id, expires).run();
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', `anakberani_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
  return new Response(JSON.stringify({ user: { id: user.id, email: user.email, display_name: user.display_name } }), { status, headers });
}

async function logout(request, env) {
  const token = cookie(request, 'anakberani_session');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', 'anakberani_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(JSON.stringify({ ok: true }), { headers });
}

async function requireUser(request, env) {
  const token = cookie(request, 'anakberani_session');
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(`SELECT u.id,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > ?`).bind(tokenHash, new Date().toISOString()).first();
  return user || null;
}

async function listChildren(user, env) {
  const r = await env.DB.prepare('SELECT id,name,birth_year,school_level,created_at FROM children WHERE user_id=? ORDER BY created_at').bind(user.id).all();
  return json({ children: r.results });
}
async function createChild(request, user, env) {
  const b = await readJson(request);
  const name = clean(b.name, 80);
  const year = Number.isInteger(Number(b.birth_year)) ? Number(b.birth_year) : null;
  const school = clean(b.school_level, 30);
  if (!name) return json({ error: 'Nama/panggilan anak diperlukan.' }, 400);
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO children (id,user_id,name,birth_year,school_level) VALUES (?,?,?,?,?)').bind(id,user.id,name,year,school).run();
  await env.DB.prepare('INSERT INTO training_progress (user_id,child_id) VALUES (?,?)').bind(user.id,id).run();
  return json({ id, name, birth_year: year, school_level: school }, 201);
}
async function listCheckins(user, env) {
  const r = await env.DB.prepare('SELECT id,child_id,value,note,created_at FROM checkins WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();
  return json({ checkins: r.results });
}
async function createCheckin(request, user, env) {
  const b = await readJson(request); const id = crypto.randomUUID();
  await assertChild(user.id, b.child_id, env);
  const value = clean(b.value, 30); if (!value) return json({ error:'value wajib' },400);
  await env.DB.prepare('INSERT INTO checkins (id,user_id,child_id,value,note) VALUES (?,?,?,?,?)').bind(id,user.id,b.child_id,value,clean(b.note,500)).run();
  return json({ id },201);
}
async function listIncidents(user, env) {
  const r = await env.DB.prepare('SELECT * FROM incidents WHERE user_id=? ORDER BY created_at DESC LIMIT 200').bind(user.id).all();
  return json({ incidents:r.results });
}
async function createIncident(request, user, env) {
  const b=await readJson(request); const id=crypto.randomUUID();
  if (b.child_id) await assertChild(user.id,b.child_id,env);
  const type=clean(b.incident_type,80); if(!type) return json({error:'incident_type wajib'},400);
  await env.DB.prepare(`INSERT INTO incidents (id,user_id,child_id,incident_type,incident_date,place,story,witness,reported_status,evidence_status) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,user.id,b.child_id||null,type,clean(b.incident_date,30),clean(b.place,150),clean(b.story,4000),clean(b.witness,500),clean(b.reported_status,80)||'Belum dilaporkan',clean(b.evidence_status,80)||'Tidak ada bukti').run();
  return json({id},201);
}
async function getProgress(url,user,env){
  const childId=url.searchParams.get('child_id'); if(!childId) return json({error:'child_id wajib'},400); await assertChild(user.id,childId,env);
  const row=await env.DB.prepare('SELECT * FROM training_progress WHERE user_id=? AND child_id=?').bind(user.id,childId).first();
  return json({progress:row});
}
async function saveProgress(request,user,env){
  const b=await readJson(request); await assertChild(user.id,b.child_id,env);
  const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
  await env.DB.prepare(`INSERT INTO training_progress (user_id,child_id,xp,streak,mental,voice,boundary_score,situation,safety,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id,child_id) DO UPDATE SET xp=excluded.xp,streak=excluded.streak,mental=excluded.mental,voice=excluded.voice,boundary_score=excluded.boundary_score,situation=excluded.situation,safety=excluded.safety,updated_at=CURRENT_TIMESTAMP`)
    .bind(user.id,b.child_id,Math.max(0,Number(b.xp)||0),Math.max(0,Number(b.streak)||0),clamp(b.mental),clamp(b.voice),clamp(b.boundary),clamp(b.situation),clamp(b.safety)).run();
  return json({ok:true});
}
async function completeLesson(request,user,env){
  const b=await readJson(request); await assertChild(user.id,b.child_id,env); const lesson=clean(b.lesson_id,50); if(!lesson)return json({error:'lesson_id wajib'},400);
  await env.DB.prepare('INSERT OR IGNORE INTO completed_lessons (user_id,child_id,lesson_id) VALUES (?,?,?)').bind(user.id,b.child_id,lesson).run(); return json({ok:true});
}
async function completedLessons(url,user,env){
  const childId=url.searchParams.get('child_id'); if(!childId)return json({error:'child_id wajib'},400); await assertChild(user.id,childId,env);
  const r=await env.DB.prepare('SELECT lesson_id,completed_at FROM completed_lessons WHERE user_id=? AND child_id=? ORDER BY completed_at').bind(user.id,childId).all(); return json({lessons:r.results});
}
async function assertChild(userId,childId,env){ const r=await env.DB.prepare('SELECT id FROM children WHERE id=? AND user_id=?').bind(childId,userId).first(); if(!r) throw new Error('CHILD_NOT_FOUND'); }

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function readJson(request){try{return await request.json()}catch{return {}}}
function clean(v,max=200){return String(v??'').trim().slice(0,max)}
function normalizeEmail(v){const s=String(v||'').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''}
function cookie(request,name){const all=request.headers.get('Cookie')||''; for(const part of all.split(';')){const [k,...rest]=part.trim().split('='); if(k===name)return rest.join('=')} return ''}
function randomB64(bytes){const a=crypto.getRandomValues(new Uint8Array(bytes)); return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256(s){const buf=await crypto.subtle.digest('SHA-256',enc.encode(s)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function hashPassword(password,saltB64){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']); const salt=Uint8Array.from(atob(saltB64.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)); const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},key,256); return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function timingSafeEqual(a,b){if(a.length!==b.length)return false; let x=0; for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i); return x===0}
