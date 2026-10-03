import app from './index.js';

const enc = new TextEncoder();
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
const text=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
const stmt=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const all=async(env,sql,...args)=>(await stmt(env,sql,...args).all()).results;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
const cookieToken=request=>(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('anakberani_session='))?.slice(19)||'';

async function readBody(request){
  if(!request.headers.get('Content-Type')?.includes('application/json')) fail(415,'Gunakan JSON.');
  const raw=await request.text();
  if(raw.length>16384) fail(413,'Data terlalu besar.');
  try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'JSON tidak valid.');return value;}catch{fail(400,'JSON tidak valid.');}
}

async function currentUser(request,env){
  const token=cookieToken(request);
  if(!token)return null;
  return stmt(env,'SELECT u.id,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await hash(token),new Date().toISOString()).first();
}

function adminEmails(env){
  return new Set(String(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
}

async function requireAdmin(request,env){
  const admins=adminEmails(env);
  if(!admins.size) fail(503,'ADMIN_EMAILS belum dikonfigurasi.');
  const user=await currentUser(request,env);
  if(!user) fail(401,'Silakan masuk terlebih dahulu.');
  if(!admins.has(user.email.toLowerCase())) fail(403,'Akses admin ditolak.');
  return user;
}

function ensureSameOrigin(request){
  if(['GET','HEAD'].includes(request.method))return;
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if((origin&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')fail(403,'Permintaan lintas situs ditolak.');
}

function expiryFrom(body){
  const plan=text(body.plan,20)||'1y';
  if(plan==='lifetime')return null;
  if(plan==='custom'){
    const value=text(body.expires_at,40);
    const time=Date.parse(value);
    if(!value||Number.isNaN(time)||time<=Date.now())fail(400,'Tanggal berakhir tidak valid.');
    return new Date(time).toISOString();
  }
  const date=new Date();
  if(plan==='6m')date.setUTCMonth(date.getUTCMonth()+6);
  else if(plan==='1y')date.setUTCFullYear(date.getUTCFullYear()+1);
  else fail(400,'Pilihan masa akses tidak valid.');
  return date.toISOString();
}

async function logAction(env,admin,action,row,oldStatus,newStatus,details=''){
  await stmt(env,'INSERT INTO admin_access_logs(id,admin_user_id,action,target_email,entitlement_id,old_status,new_status,details) VALUES(?,?,?,?,?,?,?,?)',crypto.randomUUID(),admin.id,action,row.email,row.id,oldStatus||null,newStatus||null,text(details,500)).run();
}

async function listAccess(env,url){
  const search=text(url.searchParams.get('search')||'',120).toLowerCase();
  const status=text(url.searchParams.get('status')||'',20);
  const source=text(url.searchParams.get('source')||'',20);
  const page=Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1));
  const limit=25,offset=(page-1)*limit;
  const where=[],args=[];
  if(search){where.push('lower(a.email) LIKE ?');args.push(`%${search}%`);}
  if(['active','revoked','expired'].includes(status)){where.push('a.status=?');args.push(status);}
  if(['manual','scalev'].includes(source)){where.push('a.source=?');args.push(source);}
  if(status==='unactivated')where.push('a.activated_at IS NULL');
  if(status==='activated')where.push('a.activated_at IS NOT NULL');
  const clause=where.length?'WHERE '+where.join(' AND '):'';
  const rows=await all(env,`SELECT a.id,a.email,a.source,a.status,a.starts_at,a.expires_at,a.activated_at,a.user_id,a.internal_note,a.created_at,a.updated_at,u.display_name FROM access_entitlements a LEFT JOIN users u ON u.id=a.user_id ${clause} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,...args,limit,offset);
  const total=await stmt(env,`SELECT COUNT(*) AS count FROM access_entitlements a ${clause}`,...args).first();
  return {items:rows,page,limit,total:Number(total?.count||0)};
}

async function createAccess(request,env,admin){
  const b=await readBody(request),email=text(b.email,254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email tidak valid.');
  const expires=expiryFrom(b),note=text(b.note,500);
  let row=await stmt(env,'SELECT * FROM access_entitlements WHERE lower(email)=?',email).first();
  if(row){
    const old=row.status;
    await stmt(env,"UPDATE access_entitlements SET status='active',source='manual',starts_at=COALESCE(starts_at,CURRENT_TIMESTAMP),expires_at=?,internal_note=?,revoked_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",expires,note,row.id).run();
    row=await stmt(env,'SELECT * FROM access_entitlements WHERE id=?',row.id).first();
    await logAction(env,admin,'reactivate',row,old,'active','Akses manual diperbarui.');
    return json({ok:true,item:row,updated:true});
  }
  row={id:crypto.randomUUID(),email};
  await stmt(env,"INSERT INTO access_entitlements(id,email,source,status,expires_at,internal_note) VALUES(?,?,'manual','active',?,?)",row.id,email,expires,note).run();
  row=await stmt(env,'SELECT * FROM access_entitlements WHERE id=?',row.id).first();
  await logAction(env,admin,'create',row,null,'active','Akses manual dibuat.');
  return json({ok:true,item:row},201);
}

async function mutateAccess(request,env,admin,id,action){
  let row=await stmt(env,'SELECT * FROM access_entitlements WHERE id=?',id).first();
  if(!row)fail(404,'Akses tidak ditemukan.');
  const old=row.status;
  if(action==='revoke'){
    await stmt(env,"UPDATE access_entitlements SET status='revoked',revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",id).run();
    row={...row,status:'revoked'};await logAction(env,admin,'revoke',row,old,'revoked');
  }else if(action==='reactivate'){
    const b=await readBody(request),expires=expiryFrom(b);
    await stmt(env,"UPDATE access_entitlements SET status='active',expires_at=?,revoked_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",expires,id).run();
    row={...row,status:'active',expires_at:expires};await logAction(env,admin,'reactivate',row,old,'active');
  }else{
    const b=await readBody(request),expires=expiryFrom(b),note=text(b.note,500);
    await stmt(env,'UPDATE access_entitlements SET expires_at=?,internal_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',expires,note,id).run();
    row={...row,expires_at:expires,internal_note:note};await logAction(env,admin,'update_expiry',row,old,old);
  }
  return json({ok:true,item:row});
}

async function adminApi(request,env,url){
  ensureSameOrigin(request);
  const admin=await requireAdmin(request,env);
  if(url.pathname==='/api/admin/access'){
    if(request.method==='GET')return json(await listAccess(env,url));
    if(request.method==='POST')return createAccess(request,env,admin);
    fail(405,'Metode tidak didukung.');
  }
  const match=url.pathname.match(/^\/api\/admin\/access\/([^/]+)(?:\/(revoke|reactivate))?$/);
  if(match){
    if(match[2]&&request.method==='POST')return mutateAccess(request,env,admin,match[1],match[2]);
    if(!match[2]&&request.method==='PATCH')return mutateAccess(request,env,admin,match[1],'update');
    fail(405,'Metode tidak didukung.');
  }
  fail(404,'Admin API tidak ditemukan.');
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    try{
      if(url.pathname==='/admin/access'){
        const user=await currentUser(request,env);
        if(!user)return Response.redirect(new URL('/?admin=1',url),302);
        if(!adminEmails(env).has(user.email.toLowerCase()))return new Response('Akses admin ditolak.',{status:403});
        return env.ASSETS.fetch(new Request(new URL('/admin-access.html',url),request));
      }
      if(url.pathname.startsWith('/api/admin/'))return await adminApi(request,env,url);
      return app.fetch(request,env,ctx);
    }catch(error){
      return json({error:error?.message||'Terjadi kesalahan.'},Number(error?.status)||500);
    }
  }
};
