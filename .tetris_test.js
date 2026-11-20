// .tetris_test.js — tetris_qwen3.8flash_next.html のロジック検証（DOM/Canvas/Audioスタブ）
'use strict';
const fs=require('fs');
let pass=0,fail=0;
function ok(cond,msg){if(cond){pass++;console.log('ok : '+msg)}else{fail++;console.log('FAIL: '+msg)}}
function mkCtx(rec){
 const c={records:rec,fillStyle:'',strokeStyle:'',globalAlpha:1,textAlign:'left',font:'',lineWidth:1,
  fillText(t,x,y){rec.push({op:'fillText',t:t,x:x,y:y,fill:c.fillStyle})},
  fillRect(x,y,w,h){rec.push({op:'fillRect',x:x,y:y,w:w,h:h,fill:c.fillStyle})},
  strokeRect(){},clearRect(){},
  drawImage(im,dx,dy,dw,dh){rec.push({op:'drawImage',dx:dx,dy:dy,dw:dw,dh:dh})},
  save(){},restore(){},beginPath(){},moveTo(x,y){rec.push({op:'moveTo',x:x,y:y})},
  lineTo(){},stroke(){},fill(){},translate(){}};
 return c;
}
const boardRec=[],nRec=[],hRec=[];
const boardCtx=mkCtx(boardRec),nCtx=mkCtx(nRec),hCtx=mkCtx(hRec);
function mkEl(id){
 return {id:id,style:{},textContent:'',width:320,height:640,
  getContext(){return id==='b'?boardCtx:(id==='n'?nCtx:hCtx)},
  querySelectorAll(){return []},addEventListener(){},getAttribute(){return null}};
}
const els={};
function getEl(id){if(!els[id])els[id]=mkEl(id);return els[id]}
const bodyEl={style:{}};
const doc={getElementById:getEl,body:bodyEl,addEventListener(){}};
const ctxStarts=[];
class FakeGain{constructor(){this.gain={setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}}}connect(n){return n}}
class FakeFilter{constructor(){this.type='';this.frequency={value:1}}connect(n){return n}}
class FakeOsc{
 constructor(a){this.a=a;this.type='';this.frequency={value:0}}
 connect(n){return n}
 start(t){ctxStarts.push({t:t,f:this.frequency.value,type:this.type})}
 stop(){}
}
class FakeAudioCtx{
 constructor(){this.currentTime=1;this.state='running';this.destination={}}
 createOscillator(){return new FakeOsc(this)}
 createGain(){return new FakeGain()}
 createBiquadFilter(){return new FakeFilter()}
 resume(){}
}
class ImageStub{
 constructor(){this._src='';this.naturalWidth=1000;this.naturalHeight=1600}
 set src(v){this._src=v;
  if(failRel&&v.indexOf('Tetris_image/')===0){this.onerror&&this.onerror();return}
  this.naturalWidth=1000;this.naturalHeight=1600;this.onload&&this.onload()}
}
let failRel=false;
let rafCb=null;
const sb={document:doc,window:{AudioContext:FakeAudioCtx,webkitAudioContext:FakeAudioCtx},
 Image:ImageStub,performance:{now:()=>Date.now()},localStorage:{getItem(){return null},setItem(){}}};
sb.requestAnimationFrame=function(cb){rafCb=cb};
let html=fs.readFileSync('tetris_qwen3.8flash_next.html','utf8');
let src=html.match(/<script>([\s\S]*?)<\/script>/)[1];
src+='\n;globalThis.__T={board:function(){return board},cur:function(){return cur},FX:FX,'+
 'MELODY:MELODY,CHORDS:CHORDS,BASS:BASS,S16:S16,gravityStep:gravityStep,draw:draw,tickMusic:tickMusic,'+
 'spawn:spawn,finishClear:finishClear,rotate:rotate,fits:fits,preview:preview,hardDrop:hardDrop,'+
 'onKey:onKey,stepFx:stepFx,stepBg:stepBg,fmt:fmt,loop:loop,reset:reset,setAudio:function(x){beep.ctx=x},'+
 'state:function(){return state},bgImgs:bgImgs,BG_FILES:BG_FILES,loadBg:loadBg,bgRel:bgRel,bgLocal:bgLocal,loopFn:loop,resetFn:reset,'+
 'vars:function(){return{fracY:fracY,dropT:dropT,score:score,lines:lines,level:level,overT:overT,'+
 'clearing:clearing,musT:musT,musI:musI,musOn:musOn,musStarted:musStarted,musStopAt:musStopAt,hold:hold}},'+
 '__set:function(k,v){switch(k){case"board":board=v;break;case"cur":cur=v;break;case"level":level=v;break;'+
 'case"score":score=v;break;case"clearing":clearing=v;break;case"over":state="over";overT=v||0;break;'+
 'case"musT":musT=v;break;case"musStarted":musStarted=v;break;case"musOn":musOn=v;break;'+
 'case"musStopAt":musStopAt=v;break;case"play":state="play";break}}}';
const fn=new Function('document','window','Image','performance','localStorage','requestAnimationFrame',
 'setTimeout','clearTimeout','navigator',src);
fn(sb.document,sb.window,sb.Image,sb.performance,sb.localStorage,sb.requestAnimationFrame,
 setTimeout,clearTimeout,{userAgent:'node'});
const T=globalThis.__T;
// ---- 1. 基本 ----
console.log('--- 基本 ---');
ok(T.board().length===20&&T.board()[0].length===10,'board is 20x10');
ok(!!T.cur(),'spawned a piece');
ok(T.preview(5).length===5,'preview 5 pieces');
{
 const b=T.board().map(r=>r.slice());
 for(let r=18;r<20;r++)for(let c=0;c<8;c++)b[r][c]='J';
 T.__set('board',b);
 const s0=T.vars().score;
 T.__set('cur',{type:'O',matrix:[[1,1],[1,1]],x:8,y:0,state:0});
 T.hardDrop();
 ok(T.vars().clearing&&T.vars().clearing.rows.length===2,'hard drop clears 2 rows (O fills cols 8-9)');
 ok(T.FX.parts.length>=20*2,'burst particles generated ('+T.FX.parts.length+')');
 T.FX.parts=[];
 T.finishClear();
 ok(T.board().length===20&&T.board()[19][9]===0,'rows removed, board refilled');
 ok(T.vars().lines===2,'lines = 2');
 ok(T.vars().score-s0>=2*300,'double clear score (+'+(T.vars().score-s0)+')');
}
// ---- 2. SRS キック（I: 0→1 で (+1,-2) の壁キック） ----
console.log('--- SRS ---');
{
 T.reset();
 const b=T.board().map(r=>r.slice());
 for(let r=18;r<20;r++)for(let c=0;c<6;c++)b[r][c]='J';
 T.__set('board',b);
 T.__set('cur',{type:'I',matrix:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],x:6,y:17,state:0});
 T.rotate(1);
 ok(T.cur().x===7&&T.cur().y===15,'I kick 0->1 uses offset (+1,-2) (x=7,y=15)');
 ok(T.cur().state===1,'rotation state updated');
}
// ---- 3. Tスピン（3コーナー→ダブル） ----
console.log('--- T-spin ---');
{
 T.reset();
 const b=T.board().map(r=>r.slice());
 for(let c=0;c<10;c++)if(c!==1&&c!==2)b[18][c]='J';
 for(let c=0;c<10;c++)if(c!==2)b[19][c]='J';
 b[17][1]='J';b[17][3]='J'; /* 上部オーバーハング → 4コーナー */
 T.__set('board',b);
 const s0=T.vars().score;
 T.__set('cur',{type:'T',matrix:[[0,1,0],[1,1,1],[0,0,0]],x:1,y:17,state:0});
 T.rotate(-1);
 ok(T.cur().x===1&&T.cur().state===3,'T rotated to state L (x=1, state=3)');
 T.hardDrop();
 ok(T.vars().clearing&&T.vars().clearing.rows.length===2,'T-spin double clears 2 rows');
 T.finishClear();
 ok(T.vars().lines===2,'lines = 2');
 const gained=T.vars().score-s0;
 ok(gained>=400,'T-spin double score applied (+'+gained+')');
}
// ---- 4. ホールド ----
console.log('--- HOLD ---');
{
 T.reset();
 const t0=T.cur().type;
 T.onKey({key:'c',preventDefault(){}});
 ok(T.vars().hold===t0,'hold stores piece');
 const t1=T.cur().type;
 T.onKey({key:'c',preventDefault(){}});
 ok(T.cur().type===t1,'second hold blocked (1 per drop)');
}
// ---- 5. 7-bag ----
console.log('--- 7-bag ---');
{
 const seen={};
 for(let i=0;i<70;i++){T.spawn();if(!T.cur())break;seen[T.cur().type]=(seen[T.cur().type]||0)+1}
 let total=0;for(const k in seen)total+=seen[k];
 ok(Object.keys(seen).length===7,'all 7 piece types appear across '+total+' spawns');
 let mn=99;for(const k in seen)mn=Math.min(mn,seen[k]);
 ok(mn>=9,'7-bag distribution is fair (min '+mn+')');
 T.reset();
 ok(T.vars().hold===null,'hold cleared on restart');
}
// ---- 6. 60fps スムーズ落下（速度は従来と同じ） ----
console.log('--- 60fps ---');
{
 T.reset();
 T.__set('level',1);
 T.gravityStep(0.501);
 ok(T.cur().y===0,'no whole-cell move at 501ms');
 ok(Math.abs(T.vars().fracY-0.501)<0.01,'fracY ~ 0.501 (sub-cell render position)');
 T.gravityStep(0.501);
 ok(T.cur().y===1,'moved exactly 1 cell after ~1000ms (same speed)');
 for(let i=0;i<400;i++)T.gravityStep(0.05);
 ok(T.vars().fracY===0,'fracY=0 when grounded (snaps to grid, y='+T.cur().y+')');
}

// ---- 7. ゲームオーバー中央オーバーレイ ----
console.log('--- GAME OVER overlay ---');
{
 T.reset();
 var b=T.board().map(function(r){return r.slice()});
 for(var r=0;r<18;r++)for(var c=0;c<10;c++)b[r][c]='J';
 T.__set('board',b);
 T.spawn('O');
 ok(T.state()==='over','block-out triggers game over');
 T.__set('over',0);
 boardRec.length=0;
 T.draw();
 var go=boardRec.filter(function(x){return x.op==='fillText'&&x.t==='GAME OVER'});
 ok(go.length===1,'GAME OVER drawn once');
 ok(go.length===1&&go[0].x===160,'centered on board (x=160)');
 ok(boardRec.some(function(x){return x.op==='fillText'&&String(x.t).indexOf('SCORE')===0}),'stats shown in overlay');
 ok(boardRec.some(function(x){return x.op==='fillText'&&String(x.t).indexOf('R でリスタート')===0}),'restart hint on at overT=0');
 T.__set('over',500);
 boardRec.length=0;
 T.draw();
 ok(!boardRec.some(function(x){return x.op==='fillText'&&String(x.t).indexOf('R で')===0}),'hint blinks off at overT=500');
}
// ---- 8. BGM コロブチカ ----
console.log('--- BGM コロブチカ ---');
{
 var M=T.MELODY,B=T.BASS,C=T.CHORDS;
 var units=0;for(var i=0;i<M.length;i++)units+=M[i][1];
 ok(units===256,'melody totals 256 sixteenth units = 16 bars loop ('+M.length+' notes)');
 var bars=0,acc=0,barOk=true;
 for(var i=0;i<M.length;i++){acc+=M[i][1];if(acc===16){bars++;acc=0}else if(acc>16)barOk=false}
 ok(barOk&&acc===0&&bars===16,'every bar sums to exactly 16 units');
 ok(C.length===32,'32 half-bar chord roots');
 ok(B.length===M.length,'bass array aligned to melody');
 var bassOk=true,chordOk=true,pos=[],u=0;
 for(var i=0;i<M.length;i++){pos.push(u);u+=M[i][1]}
 for(var i=0;i<B.length;i++){
  if(((pos[i]%4)===0)!==(B[i]>0))bassOk=false;
  if(B[i]>0&&B[i]!==C[Math.floor(pos[i]/8)])chordOk=false;
 }
 ok(bassOk,'bass on quarter beats only (beat grid aligned by duration)');
 ok(chordOk,'bass root follows chord grid Em/Am/B7');
 ok(M[0][0]===64&&M[0][1]===4,'melody starts on E5 quarter (Korobchika theme)');
 var m2=[M[0][0],M[1][0],M[2][0],M[3][0]];
 ok(m2.join()==='64,59,60,62','theme opening E5-B4-C5-D5 (Korobchika)');
 var a=new FakeAudioCtx();a.currentTime=10;
 T.setAudio(a);
 T.__set('play');T.__set('musStopAt',0);
 T.__set('musOn',true);T.__set('musStarted',true);T.__set('musT',10.1);
 ctxStarts.length=0;
 T.tickMusic();
 ok(ctxStarts.length>=3,'BGM notes scheduled ('+ctxStarts.length+' notes)');
 var mono=true,prev=-1;
 for(var i=0;i<ctxStarts.length;i++){if(ctxStarts[i].t<prev)mono=false;prev=ctxStarts[i].t}
 ok(mono,'note start times monotonic (no overlap)');
 ok(ctxStarts.some(function(s){return s.type==='square'})&&ctxStarts.some(function(s){return s.type==='triangle'}),'melody(square)+bass(triangle) voices');
 var f0=ctxStarts.filter(function(s){return s.type==='square'})[0];
 ok(f0&&Math.abs(f0.f-440*Math.pow(2,(64-69)/12))<1,'first melody freq = E5');
 /* 実時間ストリーム（60秒分のコマ送り） */
 var a2=new FakeAudioCtx();a2.currentTime=20;T.setAudio(a2);
 T.__set('play');T.__set('musStopAt',0);T.__set('musT',20.1);
 var mt0=T.vars().musT;
 for(var k=0;k<600;k++){a2.currentTime+=0.1;T.tickMusic()}
 ok(Math.abs(T.vars().musT-(mt0+60))<1.5,'BGM streams in real time 60s (musT='+T.vars().musT.toFixed(1)+')');
 ok(256*T.S16>25&&256*T.S16<26,'one full loop = '+(256*T.S16).toFixed(2)+'s (16 bars @150BPM)');
 /* 2部: 8分音符の連符（9小節目 = 通算41音目から） */
 var sec=M.slice(41,65),okSec=true;
 for(var i=0;i<sec.length;i+=8)if(sec[i][1]!==2||sec[i+1][1]!==2)okSec=false;
 ok(okSec&&sec.length===24,'section 2 has eighth-note runs (Korobchika B-part)');
 T.__set('over',0);T.__set('musStopAt',12);T.__set('musT',13);
 ctxStarts.length=0;
 T.tickMusic();
 ok(ctxStarts.length===0,'BGM stops at game over (cap)');
 T.reset();
 ok(T.vars().musT===12&&T.vars().musStopAt===0,'restart resumes BGM from stopped position');
 ok(T.S16>0&&Math.abs(T.S16-60/150/4)<1e-9,'tempo 150BPM (16th unit)');
}
// ---- 9. 背景画像 ----

console.log('--- 背景画像 ---');
{
 ok(T.bgImgs.length===7,'all 7 images loaded from C:/Users/fangg/Downloads/Tetris_image');
 ok(T.bgImgs[0].url.indexOf('Tetris_image/')===0,'relative path used first ('+T.bgImgs[0].url+')');
 var local=T.BG_FILES.filter(function(f){return fs.existsSync('Tetris_image/'+f)});
 ok(local.length===7,'all 7 images bundled in ./Tetris_image for Pages hosting');
 /* 相対パスが無い環境（旧ローカル利用）では file:// へフォールバック */
 failRel=true;T.bgImgs.length=0;T.loadBg();failRel=false;
 ok(T.bgImgs.length===7,'fallback to local folder when relative path missing ('+T.bgImgs.length+')');
 ok(T.bgImgs[0].url.indexOf('file:///C:/Users/fangg/Downloads/Tetris_image/')===0,'fallback URL = file:/// ('+T.bgImgs[0].url+')');
 T.bgImgs.length=0;failRel=false;T.loadBg();
 var real=fs.readdirSync('C:/Users/fangg/Downloads/Tetris_image').filter(function(f){return /\.(jpg|jpeg|png|webp)$/i.test(f)});
 var missing=T.BG_FILES.filter(function(f){return real.indexOf(f)<0});
 ok(missing.length===0,'every BG_FILES entry exists on disk (missing: '+missing.join(',')+')');
 ok(real.length===T.BG_FILES.length,'covers every image in the folder ('+real.length+' files)');
 ok(/Tetris_image/.test(bodyEl.style.backgroundImage||''),'page body background image set');
 boardRec.length=0;
 T.draw();
 var di=boardRec.filter(function(x){return x.op==='drawImage'});
 ok(di.length>=1,'background drawn on game-screen canvas');
 ok(di.length>=1&&di[0].dh===640,'bg vertical size = game screen height (dh=640)');
 ok(di.length>=1&&di[0].dy===0,'bg top edge aligned to screen top (dy=0)');
 /* 縦長 1000x1600 → 上下640に合わせ幅は 1000*640/1600=400 */
 ok(di.length>=1&&Math.abs(di[0].dw-400)<1,'portrait 1000x1600 scaled to 400x640 (dw='+Math.round(di[0].dw*10)/10+')');
 /* 横長 1280x698（実際の画像） → 上下640に合わせ幅は 1280*640/698≈1173.6（左右はクリップ） */
 T.bgImgs[0].naturalWidth=1280;T.bgImgs[0].naturalHeight=698;
 boardRec.length=0;T.draw();
 var di2=boardRec.filter(function(x){return x.op==='drawImage'})[0];
 ok(di2&&di2.dy===0&&di2.dh===640&&Math.abs(di2.dw-1173.64)<1,'landscape 1280x698 scaled to 1173.6x640, top/bottom fit (dw='+(di2?Math.round(di2.dw*10)/10:'-')+')');
 T.bgImgs[0].naturalWidth=1000;T.bgImgs[0].naturalHeight=1600;
 var imIdx=boardRec.findIndex(function(x){return x.op==='drawImage'});
 var darkIdx=-1;
 for(var i=0;i<boardRec.length;i++)if(i>imIdx&&boardRec[i].op==='fillRect'&&String(boardRec[i].fill).indexOf('rgba(0,0,0,.45)')===0){darkIdx=i;break}
 ok(darkIdx>imIdx,'board-area background darkened after image');
 for(var i=0;i<11;i++)T.stepBg(1);
 ok(String(bodyEl.style.backgroundImage).indexOf('Gemini_Generated_Image_l1eevvl1eevvl1ee')>=0,'slide switches after ~9s');
}
// ---- 10. スモーク（3000フレーム + 入力乱舞） ----
console.log('--- スモーク ---');
{
 var err=null;
 try{
  T.reset();
  var kl=[' ','ArrowLeft','ArrowRight','ArrowDown','z','x','ArrowUp','c',' ','ArrowDown'];
  var ts=0;
  for(var i=0;i<3000;i++){
   ts+=16;
   if(i%37===0)T.onKey({key:kl[((i/37)|0)%kl.length],preventDefault:function(){}});
   T.loop(ts);
  }
 }catch(e){err=e}
 ok(!err,'3000 frames + random inputs, no exception'+(err?': '+err.message:''));
 ok(['play','pause','over'].indexOf(T.state())>=0,'game state valid (state='+T.state()+')');
}
console.log('RESULT: '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);


