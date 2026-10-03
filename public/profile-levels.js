(()=>{
  const previous=window.childrenPage;
  window.childrenPage=function(){
    if(typeof previous==='function')previous();
    const select=document.querySelector('select[name="school_level"]');
    if(!select)return;
    const current=select.value;
    const levels=[
      ['', 'Pilih jenjang'],
      ['KB', 'KB (Kelompok Bermain)'],
      ['TK A', 'TK A'],
      ['TK B', 'TK B'],
      ['SD', 'SD'],
      ['SMP', 'SMP'],
      ['SMA/SMK', 'SMA / SMK']
    ];
    select.innerHTML=levels.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    if(levels.some(([value])=>value===current))select.value=current;
  };
})();
