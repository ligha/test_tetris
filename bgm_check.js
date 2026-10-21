// BGM melody sanity check (all tracks)
const fs=require('fs');
const h=fs.readFileSync(require('path').join(__dirname,'tetris_gpfix.html'),'utf8');
const m=h.match(/const BGM_TRACKS=\[[\s\S]*?\n\];/);
if(!m){console.log('BGM_TRACKS not found');process.exit(1);}
const TRACKS=eval(m[0].slice(m[0].indexOf('[')));
const bpm=+h.match(/const BGM_BPM=(\d+)/)[1];
const NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const nm=n=>n?NM[n%12]+(Math.floor(n/12)-1):'rest';
let bad=0;
TRACKS.forEach(tr=>{
  const span=(tr.meter||2)*4, u=60/((tr.bpm||bpm)*4);
  let total=0;
  console.log('\n=== '+tr.name+' ===  meter '+(tr.meter||2)+'/4, bpm '+(tr.bpm||bpm));
  tr.bars.forEach((b,i)=>{
    const evs=b.slice(0,b.length-1),bass=b[b.length-1];
    const s=evs.reduce((a,e)=>a+e[1],0);
    total+=s;
    if(s!==span){bad++;console.log('BAD bar '+(i+1)+': '+s+' sixteenths (expected '+span+')');}
    console.log('bar '+(i+1)+': '+evs.map(e=>nm(e[0])+'('+e[1]+')').join(' ')+'  | bass '+nm(bass));
  });
  console.log('bars='+tr.bars.length+', sixteenths='+total+', loop = '+(total*u).toFixed(1)+' s');
  if(tr.key){                                   // 曲ごとの音階（臨時記号の許容範囲）
    const off=tr.bars.flatMap(b=>b.slice(0,b.length-1).filter(e=>e[0]).map(e=>e[0]%12)).filter(c=>!tr.key.includes(c));
    if(off.length){bad++;console.log('BAD '+tr.name+' off-key: '+Array.from(new Set(off)).map(c=>NM[c]).join(' '));}
  }
});
// 音階チェック: コロブチカ旋律はA自然短音階のみ（臨時記号不可。参照MIDI・abcboth F自然音を使う）
const AMIN=[9,11,0,2,4,5,7];
const off=TRACKS[0].bars.flatMap(b=>b.slice(0,b.length-1).filter(e=>e[0]).map(e=>e[0]%12)).filter(c=>!AMIN.includes(c));
if(off.length){bad++;console.log('\nBAD Korobeiniki off-scale pitches: '+Array.from(new Set(off)).map(c=>NM[c]).join(' '));}
console.log('\nbad='+bad);
process.exit(bad===0?0:1);