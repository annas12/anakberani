const branches = [
 ['ejekan','Ejekan','Seorang teman mengejek caramu berbicara di depan kelas.'],
 ['penghinaan','Penghinaan','Teman memanggilmu dengan julukan yang menyakitkan.'],
 ['barang','Barang diambil','Pensilmu diambil dan tidak dikembalikan.'],
 ['dorongan','Dorongan','Seseorang mendorongmu saat antre di kantin.'],
 ['intimidasi','Intimidasi','Beberapa anak menghalangi jalanmu keluar kelas.'],
 ['ancaman','Ancaman','Seseorang mengancam akan menyakitimu setelah sekolah.'],
 ['cyber','Cyberbullying','Pesan menghina dan foto memalukan dibagikan di grup kelas.'],
 ['kelompok','Tekanan kelompok','Teman memaksamu ikut mengejek anak lain agar diterima kelompok.'],
 ['fisik','Serangan fisik','Seseorang memukulmu dan masih mencoba menyerang.'],
 ['saksi','Teman melihat bullying','Kamu melihat temanmu diintimidasi oleh beberapa anak.']
].map(([id,title,scene])=>{
 const digital=id==='cyber', physical=id==='fisik', witness=id==='saksi', threat=['ancaman','intimidasi','dorongan'].includes(id);
 const safe=digital?'Jangan balas. Simpan pesan jika aman, blokir/laporkan, dan minta pendampingan orang dewasa.':physical?'Lindungi diri, buat jarak, dan cari jalan keluar sambil meminta bantuan. Jika perlu, bela diri hanya untuk menghentikan serangan.':witness?'Ajak orang dewasa membantu dan dukung teman dari tempat aman.':threat?'Jaga jarak, menuju tempat ramai, dan segera beri tahu orang dewasa tepercaya.':'Ucapkan batas singkat dengan tenang dan bergerak menuju tempat aman.';
 const scores=[100,100,100,100,100,100];
 return {id,title,start:'start',nodes:{
 start:{text:scene,options:[{text:safe,next:'support',scores,feedback:'Kamu memilih langkah yang menjaga keselamatan. Perilaku pelaku tetap tanggung jawab pelaku.'},{text:digital?'Balas menghina di grup.':'Tantang dan ancam akan membalas.',next:'escalation',scores:[30,0,20,30,0,30],feedback:'Membalas ancaman dapat memperbesar bahaya. Kamu bisa mengubah pilihan di langkah berikutnya.'},{text:'Diam dan simpan semuanya sendiri.',next:'isolation',scores:[0,40,20,0,20,20],feedback:'Diam bisa menjadi reaksi takut. Kamu tidak salah karena takut; mari cari dukungan sekarang.'}]},
 support:{text:digital?'Pesan berhenti, tetapi kamu masih khawatir saat masuk sekolah.':'Kamu sudah mendekati tempat aman. Pelaku berhenti, tetapi kamu masih merasa takut.',options:[{text:'Berhenti berkonfrontasi, temui orang dewasa, dan ceritakan kejadian.',next:'end',scores,feedback:'Saat ancaman berhenti, kamu juga berhenti. Dukungan orang dewasa membantu mencegah kejadian berulang.'},{text:'Kembali mengejar atau mempermalukan pelaku.',next:'escalation',scores:[20,0,0,20,0,20],feedback:'Jangan mengejar atau membalas. Utamakan jarak dan bantuan.'}]},
 isolation:{text:digital?'Pesan kembali masuk dan membuatmu takut.':'Gangguan berulang saat tidak ada guru di dekatmu.',options:[{text:'Cari tempat aman dan hubungi orang dewasa tepercaya sekarang.',next:'support',scores,feedback:'Kamu boleh meminta bantuan kapan saja, walaupun sebelumnya belum bercerita.'},{text:'Tetap sendirian dan berharap berhenti.',next:'end',scores:[0,20,0,0,10,10],feedback:'Kamu layak dilindungi. Setelah latihan ini, pilih satu orang dewasa yang bisa kamu ajak bicara.'}]},
 escalation:{text:digital?'Balasan makin mengancam dan menyebut akan menunggumu di sekolah.':'Situasi meningkat: pelaku mendekat, mendorong, dan mengancam memukul.',options:[{text:digital?'Hentikan percakapan, simpan ancaman jika aman, dan segera minta orang dewasa mengatur perlindungan.':'Lindungi diri, buat jarak, panggil bantuan. Jika benar-benar diserang, hentikan serangan seperlunya lalu pergi ketika aman.',next:'end',scores,feedback:'Keselamatan lebih utama daripada menang. Jangan mengejar; berhenti saat ancaman selesai.'},{text:'Ajak teman membalas bersama-sama.',next:'end',scores:[0,0,0,0,0,0],feedback:'Pengeroyokan dan balas dendam menambah bahaya. Minta bantuan orang dewasa untuk melindungimu.'}]}
 }};
});
