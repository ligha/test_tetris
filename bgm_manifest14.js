// 14曲のBGMマニフェスト：拍・テンポ・音階・資料出典を管理する。
// bars が空のエントリ＝旋律データ未入手（記憶だけで転譜していない）。
// abc/MIDI の一次資料が来たら bars を埋め、bgm_check.js（小節長＝meter*4）で検証する。
const BGM_MANIFEST=[
  {name:'Korobeiniki',        meter:2,bpm:140,key:[9,11,0,2,4,5,7],source:'Jack Campin abc + tetris_main_theme.mid',verified:true},
  {name:'Kalinka',            meter:2,bpm:140,key:[9,11,0,2,4,5,7,10],source:'John Chambers abc + folkinfo',verified:true},
  {name:'Kamarinskaya',       meter:2,bpm:126,key:[2,4,5,7,9,11,0],source:'未入手',verified:false},
  {name:'Amurskie Volny',     meter:3,bpm:90, key:[2,4,5,7,9,11,0],source:'未入手（ワルツ）',verified:false},
  {name:'Katyusha',           meter:2,bpm:120,key:[4,5,7,9,11,0,2],source:'abcnotation pghardy/0302 (Paul Hardy Session Tunebook 2026, K:Em, Q:1/4=120)',verified:true},
  {name:'Troika',             meter:2,bpm:140,key:[2,4,5,7,9,11,0,1],source:'abcnotation colinhume.com/ABC.txt/1419 (K:Dm, Q:1/4=140)',verified:true},
  {name:'Po Ulice Peterburg', meter:2,bpm:112,key:[9,11,0,2,4,5,7],source:'未入手（原題要確認）',verified:false},
  {name:'Valenki',            meter:3,bpm:88, key:[9,11,0,2,4,5,7],source:'未入手（ワルツ）',verified:false},
  {name:'Vo Pole Beryoza',    meter:2,bpm:108,key:[9,11,0,2,4,5,7],source:'abcnotation musicaviva.com/russia/the-birch-tree (X:7955, K:Am)',verified:true},
  {name:'Smuglyanka',         meter:2,bpm:120,key:[9,11,0,2,4,5,7],source:'未入手（「スメドヴォ」の誤記と推定）',verified:false},
  {name:'Lezginka',           meter:4,bpm:180,key:[2,4,5,7,9,11,0,1],source:'abcnotation voluntocracy.org/Music/Lezginka (J.Chambers, K:Dm, M:4/4, Q:1/2=110)',verified:true},
  {name:'Svetit Mesyats',     meter:2,bpm:112,key:[9,11,0,2,4,5,7],source:'未入手（月は輝く）',verified:false},
  {name:'Yablochko',          meter:2,bpm:132,key:[9,11,0,2,4,5,7],source:'未入手（小さなリンゴ）',verified:false},
  {name:'Ogonki',             meter:3,bpm:92, key:[9,11,0,2,4,5,7],source:'未入手（ともしび・ワルツ）',verified:false},
  {name:'Veseliy Molodets',   meter:2,bpm:124,key:[9,11,0,2,4,5,7],source:'未入手（陽気な若者・原題要確認）',verified:false},
  {name:'Nedelya',            meter:2,bpm:104,key:[9,11,0,2,4,5,7],source:'未入手（一週間・原題要確認）',verified:false}
];
const fs=require('fs'),path=require('path');
const h=fs.readFileSync(path.join(__dirname,'tetris_gpfix.html'),'utf8');
const TRACKS=eval(h.match(/const BGM_TRACKS=\[[\s\S]*?\n\];/)[0].match(/\[[\s\S]*\]/)[0]);
const filled=new Set(TRACKS.map(t=>t.name));
let missing=0;
console.log('=== manifest vs BGM_TRACKS ===');
BGM_MANIFEST.forEach(m=>{
  const t=TRACKS.find(x=>x.name===m.name);
  const ok=t&&t.bars&&t.bars.length;
  if(!ok){missing++;console.log('  '+m.name.padEnd(18)+' meter '+(m.meter)+'/4 bpm '+m.bpm+'  bars: '+(t?t.bars.length:0)+'  <- '+m.source);}
  else{
    const span=m.meter*4, bad=t.bars.filter(b=>b.slice(0,b.length-1).reduce((a,e)=>a+e[1],0)!==span).length;
    console.log('  '+m.name.padEnd(18)+' meter '+(m.meter)+'/4 bpm '+m.bpm+'  bars: '+t.bars.length+(bad?'  BAD bars: '+bad:'  ok'));
  }
});
console.log('\ntracks in game: '+TRACKS.length+', melody data missing: '+missing);
console.log('level rotation: 5レベルごとに曲替え、'+TRACKS.length+'曲を周回 (bgmTrackForLevel)');
process.exit(0);
