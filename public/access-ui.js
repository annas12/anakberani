(()=>{
  const BUY_URL='https://anakberani.techo.web.id';
  const WA_NUMBER='6289691965404';
  const WA_TEXT='Halo Admin AnakBerani, saya minta bantuan untuk login/aktivasi akun AnakBerani. Email pembelian saya: ';
  const waUrl='https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(WA_TEXT);

  function loginPage(){
    document.getElementById('app').innerHTML=`<main class="auth-shell"><div class="auth-brand"><span class="badge">🛡️ AnakBerani</span><h1>Berani Aman,<br>Lawan Bully.</h1><p>Belajar menjaga diri, berlatih mengambil keputusan, dan bercerita bersama orang tua.</p><div class="callout info">Akses AnakBerani hanya untuk pembeli yang sudah memiliki email aktif.</div></div><form class="card auth-card" onsubmit="event.preventDefault();authenticate(this,false)"><h2>Selamat datang kembali</h2><p>Masuk untuk melanjutkan latihan anak.</p><label>Email<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Password<input name="password" type="password" minlength="8" maxlength="256" autocomplete="current-password" required></label><button class="btn btn-primary btn-block" type="submit">Masuk</button><button class="btn btn-outline btn-block" type="button" onclick="location.href='${BUY_URL}'">Belum punya akun? Beli AnakBerani</button><button class="btn btn-soft btn-block" type="button" onclick="paidActivationPage()">Sudah membeli? Aktifkan akun</button><a class="btn btn-outline btn-block" href="${waUrl}" target="_blank" rel="noopener noreferrer">💬 Bingung login? Minta bantuan WhatsApp</a><p class="tiny">Gunakan email yang sama dengan email pembelian.</p></form></main>`;
  }

  window.paidActivationPage=function(){
    document.getElementById('app').innerHTML=`<main class="auth-shell"><div class="auth-brand"><span class="badge">🛡️ AnakBerani</span><h1>Aktivasi akun</h1><p>Gunakan email yang sama dengan saat membeli AnakBerani.</p><div class="callout info">Sistem akan memeriksa apakah email Anda sudah memiliki akses aktif.</div></div><form class="card auth-card" onsubmit="event.preventDefault();authenticate(this,true)"><h2>Aktifkan akun pembeli</h2><p>Buat password untuk login AnakBerani.</p><label>Nama orang tua<input name="display_name" maxlength="80" autocomplete="name" required></label><label>Email pembelian<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Password baru<input name="password" type="password" minlength="8" maxlength="256" autocomplete="new-password" required></label><button class="btn btn-primary btn-block" type="submit">Aktifkan akun</button><button class="btn btn-outline btn-block" type="button" onclick="authPage()">Kembali ke login</button><button class="btn btn-soft btn-block" type="button" onclick="location.href='${BUY_URL}'">Belum membeli? Beli AnakBerani</button><a class="btn btn-outline btn-block" href="${waUrl}" target="_blank" rel="noopener noreferrer">💬 Butuh bantuan? Chat WhatsApp</a><p class="tiny">Jika email belum ditemukan, pastikan email yang dipakai sama dengan saat pembayaran atau hubungi admin.</p></form></main>`;
  };

  window.authPage=function(){loginPage();};
})();
