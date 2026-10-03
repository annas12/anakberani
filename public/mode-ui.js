(()=>{
  function setMode(mode){
    if(mode!=='child'&&mode!=='parent')return;
    S.mode=mode;
    S.page='home';
    S.lesson=null;
    save();
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function modeChooser(compact=false){
    const childActive=S.mode==='child';
    return `<div class="mode-chooser ${compact?'compact':''}">
      <div class="mode-chooser-head">
        <strong>Siapa yang sedang menggunakan?</strong>
        <span>Pilih tampilan yang sesuai</span>
      </div>
      <div class="mode-choice-grid">
        <button class="mode-choice child ${childActive?'active':''}" onclick="setAnakBeraniMode('child')" type="button">
          <span class="mode-choice-icon">👦</span>
          <span class="mode-choice-copy"><b>Mode Anak</b><small>Latihan, simulasi, check-in, dan program 30 hari</small></span>
          <span class="mode-choice-state">${childActive?'✓ Sedang aktif':'Pilih'}</span>
        </button>
        <button class="mode-choice parent ${!childActive?'active':''}" onclick="setAnakBeraniMode('parent')" type="button">
          <span class="mode-choice-icon">👨‍👩‍👦</span>
          <span class="mode-choice-copy"><b>Mode Orang Tua</b><small>Pantau progress, kejadian, dan pendampingan anak</small></span>
          <span class="mode-choice-state">${!childActive?'✓ Sedang aktif':'Pilih'}</span>
        </button>
      </div>
    </div>`;
  }

  window.setAnakBeraniMode=setMode;
  window.toggleMode=function(){setMode(S.mode==='child'?'parent':'child');};

  window.sidebar=function(){
    return `<aside class="sidebar">
      <div class="brand"><div class="brandmark">🛡️</div>AnakBerani</div>
      <div class="tagline">Berani Aman, Lawan Bully<br>${S.mode==='child'?'Tempat latihan supaya kamu lebih tenang, tegas, dan berani menjaga diri.':'Dashboard orang tua untuk mendampingi, memantau, dan melatih keberanian anak secara aman.'}</div>
      ${modeChooser(true)}
      <div class="navlist">${currentNavs().map(n=>`<button class="navbtn ${S.page===n[0]?'active':''}" onclick="go('${n[0]}')"><span class="ico">${n[1]}</span>${n[2]}</button>`).join('')}</div>
      <div class="sidefoot"><div class="callout info tiny" style="margin-bottom:10px"><b>Prinsip utama:</b><br>Jangan mulai. Jika diserang, lindungi diri. Saat ancaman berhenti, kamu juga berhenti.</div></div>
    </aside>`;
  };

  window.layout=function(content,title='Beranda'){
    document.getElementById('app').innerHTML=`<div class="shell">${sidebar()}<section class="main"><div class="accountbar"><strong>${esc(A.child.name)}</strong><button class="btn btn-outline" onclick="chooseChildren()">Ganti / tambah profil</button><button class="btn btn-outline" onclick="logout()">Keluar</button></div><div class="mobile-mode-wrap">${modeChooser(false)}</div><div class="topbar"><div class="breadcrumb">AnakBerani / ${title}</div><div style="display:flex;gap:8px"><span class="statuschip mode-status ${S.mode}">${S.mode==='parent'?'👨‍👩‍👦 Mode Orang Tua':'👦 Mode Anak'}</span><span class="statuschip">🔥 ${S.streak} hari</span></div></div><main class="page">${content}</main></section>${mobilebar()}</div>`;
  };
})();
