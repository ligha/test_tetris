// コロブチカ音程監査: BGMデータを参照MIDI（tetris_main_theme.mid = Nintendo版テーマ）と小節単位で照合する
const fs=require('fs'),path=require('path');
const DIR=__dirname;
const h=fs.readFileSync(path.join(DIR,'tetris_gpfix.html'),'utf8');
const TRACKS=eval(h.match(/const BGM_TRACKS=\[[\s\S]*?\n\];/)[0].match(/\[[\s\S]*\]/)[0]);
const NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const nm=n=>n?NM[n%12]+(Math.floor(n/12)-1):'rest';

// ---- 参照MIDIをパースし、各瞬間の最高音＝旋律声部を取り出す ----
const b=fs.readFileSync(path.join(DIR,'tetris_main_theme.mid'));
function vlq(i){let v=0;while(true){const c=b[i++];v=(v<<7)|(c&0x7f);if(!(c&0x80))break;}return [v,i];}
const ntrk=b.readUInt32BE(10),tpq=b.readUInt16BE(12);   // division（=1024）は offset 12 の16bit
let p=14;const ons=[];const trace=[];
for(let t=0;t<ntrk;t++){
  if(b.toString('ascii',p,p+4)!=='MTrk')break;
  const len=b.readUInt32BE(p+4);p+=8;const end=p+len;let tick=0,run=0;
  while(p<end){
    const pos=p;
    let [d,q]=vlq(p);p=q;tick+=d;
    let st=b[p++];if(st<0x80){st=run;p--;}else run=st;
    trace.push(pos+':d'+d+':'+st.toString(16)+':tick'+tick);
    if(st===0xFF){const ty=b[p++];const [l,q2]=vlq(p);p=q2+l;continue;}
    if(st===0xF0||st===0xF7){const [l,q2]=vlq(p);p=q2+l;continue;}
    const hi=st&0xF0;
    if(hi===0x90||hi===0x80){const note=b[p++],vel=b[p++];if(hi===0x90&&vel>0)ons.push({track:t,tick,note,pos,delta:d});}
    else if(hi===0xA0||hi===0xB0||hi===0xE0)p+=2;else if(hi===0xC0||hi===0xD0)p+=1;else p+=1;
  }
}
const byTick={};
ons.filter(e=>e.note>=67).forEach(e=>{byTick[e.tick]=(byTick[e.tick]||0)<e.note?e.note:byTick[e.tick];});
const ticks=Object.keys(byTick).map(Number).sort((a,b2)=>a-b2);
const start=ticks[0],barLen=tpq*2;                 // 2/4拍 = 2分音符 = 2*tpq (=2048tick)
const refBars=[];
ticks.forEach(tk=>{
  const bi=Math.floor((tk-start)/barLen);
  (refBars[bi]=refBars[bi]||[]).push(byTick[tk]);
});

// ---- 照合 ----
const A=[9,11,0,2,4,5,7];                          // A自然短音階の音名（A B C D E F G）
const refSet=new Set(ticks.map(tk=>byTick[tk]));
let bad=0;
const bgm=TRACKS[0];
console.log('=== Korobeiniki: BGM vs reference MIDI (top voice) ===');
bgm.bars.forEach((bar,i)=>{
  const evs=bar.slice(0,bar.length-1);
  const mine=evs.filter(e=>e[0]).map(e=>e[0]);
  const ref=refBars[i]||[];
  const scaleOk=mine.every(n=>A.includes(n%12));
  const foreign=mine.filter(n=>!refSet.has(n));
  let flag='';
  if(!scaleOk)flag+=' [off-scale]';
  if(foreign.length)flag+=' [pitch not in reference: '+foreign.map(nm).join(' ')+']';
  if(!scaleOk||foreign.length)bad++;
  console.log('bar '+(i+1)+': BGM '+mine.map(nm).join(' ')+'  | ref '+ref.map(nm).join(' ')+flag);
});
console.log('\nreference melody pitch classes: '+Array.from(new Set(ticks.map(tk=>byTick[tk]).map(n=>n%12))).sort((x,y)=>x-y).map(c=>NM[c]).join(' '));
console.log('BGM melody pitch classes: '+Array.from(new Set(bgm.bars.flatMap(b2=>b2.slice(0,b2.length-1).filter(e=>e[0]).map(e=>e[0]%12)))).sort((x,y)=>x-y).map(c=>NM[c]).join(' '));
console.log('\nbad='+bad);
process.exit(bad===0?0:1);
