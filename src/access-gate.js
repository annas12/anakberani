import router from './router.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const emailOk=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function entitlementFor(env,email){
  return env.DB.prepare(`SELECT id,email,status,expires_at,user_id,activated_at
    FROM access_entitlements
    WHERE lower(email)=lower(?)
    LIMIT 1`).bind(email).first();
}

function accessIsActive(row){
  if(!row||row.status!=='active')return false;
  if(!row.expires_at)return true;
  const expiry=Date.parse(row.expires_at);
  return !Number.isNaN(expiry)&&expiry>Date.now();
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isRegistration=request.method==='POST'&&(url.pathname==='/api/auth/register'||url.pathname==='/api/register');
    if(!isRegistration)return router.fetch(request,env,ctx);

    let payload;
    try{payload=await request.clone().json();}
    catch{return json({error:'Data aktivasi tidak valid.'},400);}

    const email=typeof payload?.email==='string'?payload.email.trim().toLowerCase():'';
    if(!emailOk(email))return json({error:'Gunakan email pembelian yang valid.'},400);

    const entitlement=await entitlementFor(env,email);
    if(!entitlement)return json({error:'Email ini belum memiliki akses AnakBerani. Gunakan email yang sama saat membeli.'},403);
    if(!accessIsActive(entitlement))return json({error:'Akses AnakBerani untuk email ini tidak aktif atau sudah berakhir. Hubungi admin jika Anda merasa ini keliru.'},403);

    const response=await router.fetch(request,env,ctx);
    if(response.ok){
      try{
        const data=await response.clone().json();
        if(data?.user?.id){
          await env.DB.prepare(`UPDATE access_entitlements
            SET user_id=?, activated_at=COALESCE(activated_at,CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP
            WHERE id=?`).bind(data.user.id,entitlement.id).run();
        }
      }catch{}
    }
    return response;
  }
};
