// BGM (FM) scheduler smoke test  Efake AudioContext
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'tetris_gpfix.html'),'utf8');
const src=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{};
const ctxStub={fillStyle:'',strokeStyle:'',lineWidth:1,globalAlpha:1,font:'',textAlign:'',textBaseline:'',
  beginPath:noop,moveTo:noop,lineTo:noop,arcTo:noop,closePath:noop,fill:noop,stroke:noop,
  fillRect:noop,clearRect:noop,save:noop,restore:noop,translate:noop,fillText:noop};
const cvs=(w,h)=>({width:w,height:h,getContext:()=>ctxStub,addEventListener:noop});
const txt={textContent:''};
const msgtxt={textContent:''};
const fmSel={value:'bell',selectedIndex:0,options:[{text:'ベル'}],_h:{},addEventListener(t,fn){this._h[t]=fn;}};
const els={board:cvs(240,480),hold:cvs(120,80),next:cvs(120,220),score:txt,lines:txt,level:txt,time:txt,msg:msgtxt,bgmstate:txt,bgmname:{textContent:''},
  gaugefill:{textContent:'',style:{width:''}},gaugenext:{textContent:''},gaugepct:{textContent:''},
  fmpreset:fmSel,
  startbtn:{textContent:'START',addEventListener:noop},
  pad:{addEventListener:noop}};
global.document={getElementById:(id)=>els[id],addEventListener:noop,querySelector:(s)=>null};
global.requestAnimationFrame=noop;
global.performance={now:()=>0};

let evs=[],nodes=0,gains=[];
function param(v){const p={value:v,peak:v,setValueAtTime(x){p.value=x;if(x>p.peak)p.peak=x;},linearRampToValueAtTime(x){p.value=x;if(x>p.peak)p.peak=x;},exponentialRampToValueAtTime(x){p.value=x;if(x>p.peak)p.peak=x;}};return p;}
function FakeAC(){this.currentTime=0;this.state='running';this.destination={};}
FakeAC.prototype.createOscillator=function(){
  nodes++;let st=0;
  return {type:'',frequency:param(0),connect:noop,start(t){st=t;evs.push({f:this.frequency.value,t:t,type:this.type,dur:0});},stop(t){evs[evs.length-1].dur=t-st;}};
};
FakeAC.prototype.createGain=function(){nodes++;const g={gain:param(0),connect:noop,disconnect:noop};gains.push(g);return g;};
FakeAC.prototype.createBiquadFilter=function(){nodes++;return {type:'',frequency:param(0),Q:param(0),connect:noop,disconnect:noop};};
FakeAC.prototype.createDynamicsCompressor=function(){nodes++;return {threshold:param(-14),knee:param(20),ratio:param(5),attack:param(0.004),release:param(0.18),connect:noop,disconnect:noop};};
FakeAC.prototype.resume=function(){};
global.window={AudioContext:FakeAC,addEventListener:noop};

let fails=0;
function assert(c,m){if(!c){fails++;console.log('FAIL: '+m);}else console.log('ok   : '+m);}
const has=(f)=>evs.some(e=>Math.abs(e.f-f)<0.5);

const test=`
// 編曲レイヤーは後で個別に検証するため、まず旋律単独で数える
BGM_MIX.pad=0;BGM_MIX.arp=0;BGM_MIX.harm=0;BGM_MIX.drum=0;
assert(started===false,'game waits for START at boot');
startGame();
assert(started===true,'startGame() starts the game');
armAudio();
assert(armed===true,'armAudio sets armed');
assert(bgmPlaying===true,'BGM starts after first gesture');
assert(evs.length===11,'bar1 = 5 notes x 2 operators + LFO = '+evs.length+' starts');
assert(has(659.26),'carrier E5 (659.26Hz) present');
assert(has(329.63),'modulator at ratio 0.5 (329.63Hz) present -> FM voice, not square');
assert(has(5.5),'vibrato LFO at 5.5Hz present');
assert(bgmVib&&bgmVib.gain.value===9,'vibrato depth node present (9Hz)');
fmSel.value='brass';fmSel._h.change();
assert(fmLead===FM.presets.brass,'preset selector switches to brass');
actx.currentTime=2.0;bgmBar=0;bgmNext=2.0;evs.length=0;bgmTick();
assert(evs.filter(e=>Math.abs(e.f-659.26)<0.5).length===2,'brass preset: mod ratio 1.0 -> modulator at carrier freq');
fmSel.value='ep';fmSel._h.change();
assert(fmLead===FM.presets.ep,'preset selector switches to ep');
fmSel.value='bell';fmSel._h.change();
assert(evs.filter(e=>e.type==='sine').length===evs.length,'all FM operators are sine carriers/modulators');
// ---- 編曲レイヤー（和音・アルペジオ・ハモリ・打物・リバーブ）----
evs.length=0;gains.length=0;bgmTrack=0;bgmPending=0;bgmBar=0;actx.currentTime=4.0;bgmNext=4.0;bgmTick();
const melOnly=evs.length;
assert(melOnly===10,'melody-only bar 1 = 5 notes x 2 operators ('+melOnly+')');
assert(chordOf(BGM_TRACKS[0],40).join(',')==='40,43,47','chord built from the bass note: E minor (E2,G2,B3)');
assert(chordOf({mode:'M'},40).join(',')==='40,44,47','major mode uses the major third');
assert(chordOf(BGM_TRACKS[3],42).join(',')==='42,45,49','Troika bass D2 -> D minor triad');
BGM_MIX.pad=0.26;BGM_MIX.arp=0.20;BGM_MIX.harm=0.16;BGM_MIX.drum=0.24;
evs.length=0;gains.length=0;bgmTrack=0;bgmPending=0;bgmBar=0;actx.currentTime=5.0;bgmNext=5.0;bgmTick();
assert(evs.length>melOnly,'the arrangement adds voices on top of the melody ('+evs.length+' vs '+melOnly+')');
assert(evs.some(e=>Math.abs(e.f-98.0)<0.5),'pad layer: G2 (minor third of the E-minor chord)');
assert(evs.some(e=>Math.abs(e.f-123.47)<0.5),'pad layer: B3 (the fifth of the chord)');
assert(evs.some(e=>e.f<50),'drums: kick below 50Hz (A1 dropping to 22Hz = thump)');
assert(evs.some(e=>Math.abs(e.f-366.28)<0.5),'drums: snare modulator at inharmonic ratio 1.4 (noise-like)');
assert(evs.some(e=>e.f>1000),'drums: hi-hat above 1kHz (inharmonic ratio 3.17 = metallic)');
assert(evs.some(e=>Math.abs(e.f-164.81)<0.5),'arpeggio plays the chord an octave above the pad');
BGM_MIX.arp=0;evs.length=0;bgmBar=0;actx.currentTime=6.0;bgmNext=6.0;bgmTick();
assert(evs.some(e=>Math.abs(e.f-329.63)<0.5),'harmony doubles the long melody note (E5) an octave below');
BGM_MIX.arp=0.20;
const lyric={name:'lyric-test',meter:2,bpm:108,mode:'m',style:'lyric',bars:[[[69,4],[69,2],[69,2],[69,4],45]]};
BGM_TRACKS.push(lyric);bgmTrack=BGM_TRACKS.length-1;bgmPending=bgmTrack;bgmBar=0;evs.length=0;
actx.currentTime=7.0;bgmNext=7.0;bgmTick();
assert(!evs.some(e=>e.f<50),'lyric style plays no drums (Vo Pole Beryoza)');
assert(evs.some(e=>Math.abs(e.f-130.81)<0.5),'lyric style still plays the pad');
BGM_TRACKS.pop();bgmTrack=0;bgmPending=0;bgmBar=0;
const rock={name:'rock-test',meter:4,bpm:180,mode:'m',style:'rock',bars:[[[69,4],[69,4],[69,4],[69,4],45]]};
BGM_TRACKS.push(rock);bgmTrack=BGM_TRACKS.length-1;bgmPending=bgmTrack;bgmBar=0;evs.length=0;
actx.currentTime=8.0;bgmNext=8.0;bgmTick();
assert(evs.filter(e=>Math.abs(e.f-22)<0.5).length===2,'rock style (4/4) hits the kick carrier on beats 1 and 3 ('+evs.filter(e=>Math.abs(e.f-22)<0.5).length+')');
BGM_TRACKS.pop();bgmTrack=0;bgmPending=0;bgmBar=0;
assert(BGM_TRACKS.every(t=>t.style&&t.mode&&t.lead),'every track declares its arrangement (style/mode/lead)');
assert(bgmComp!==null,'BGM bus has a compressor to tame the extra layers');
assert(bgmDelay===null,'reverb is skipped when the context has no delay node (stays dry)');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak))<=0.5,'arrangement layers are quieter than the melody (no clipping)');
nodes=0;evs.length=0;actx.currentTime=1.0;bgmBar=0;bgmNext=1.0;bgmTick();
assert(evs.length>0,'scheduler keeps scheduling as time advances ('+evs.length+')');
assert(nodes>=2*evs.length,'2 operators per note (nodes='+nodes+')');
evs.length=0;actx.currentTime=13.7;bgmTick();
assert(evs.length>0,'loop wraps and continues ('+evs.length+')');
assert(BGM_TRACKS.length===6&&BGM_TRACKS[1].name==='Kalinka','track list: 6 tracks (2 baseline + 4 sourced)');
assert(bgmTrackForLevel(1)===0&&bgmTrackForLevel(5)===0&&bgmTrackForLevel(6)===1&&bgmTrackForLevel(11)===2,'level 1-5 Korobeiniki, 6-10 Kalinka, 11-15 Katyusha');
assert(bgmTrack===0,'starts on Korobeiniki at level 1');
anim={rows:[0],tsp:false};lines=50;level=5;finishAnim();
assert(level===6&&bgmPending===1,'level up to 6 queues Kalinka');
assert(msgtxt.textContent==='1ラインクリア / BGM: Kalinka','level-up message shows the new track');
assert(ui.bgmname.textContent==='Kalinka (切替待ち)','panel shows the queued track until the bar boundary');
evs.length=0;actx.currentTime=14.0;bgmNext=14.0;bgmBar=BGM_TRACKS[0].bars.length-1;bgmTick();
assert(bgmTrack===1,'switches to Kalinka at the next bar boundary');
assert(ui.bgmname.textContent==='Kalinka','UI shows the track name after the switch');
evs.length=0;actx.currentTime=15.0;bgmNext=15.0;bgmTick();
assert(has(392),'Kalinka A段 first note G4 (392Hz) scheduled');
assert(bgmBar===1,'Kalinka bar advanced');
bgmTrack=0;bgmPending=1;bgmBar=3;evs.length=0;actx.currentTime=16.0;bgmNext=16.0;bgmTick();
assert(bgmTrack===1&&bgmBar===0,'switch happens at the next bar boundary even mid-loop');
act('start');   // STARTでポーズ（ポーズボタンは廃止）
assert(paused===true&&bgmPlaying===false,'START pauses and stops BGM');
act('start');
assert(paused===false&&bgmPlaying===true,'START again resumes BGM');
act('bgm');
assert(bgmOn===false&&bgmPlaying===false,'B key/button turns BGM off');
act('bgm');
assert(bgmOn===true&&bgmPlaying===true,'BGM back on');
bgmStop();
assert(bgmPlaying===false&&bgmLfo===null&&bgmFilter===null,'bgmStop cleans up LFO/filter');
hardDrop();
assert(over===false,'game still runs with BGM active');
for(let i=0;i<200;i++)bgmTick();
assert(evs.length>0,'no crash over many scheduler ticks');
// BGM はゲーム開始時に最初（小節0）から鳴る
bgmTrack=1;bgmBar=12;bgmNext=actx.currentTime+0.15;   // 曲の途中まで再生済みの状態にする
evs.length=0;
startGame();
assert(bgmTrack===0&&bgmPending===0,'startGame plays track 1 (Korobeiniki) at level 1');
assert(bgmBar===1,'startGame rewinds to bar 0 (bar 0 scheduled)');
assert(has(659.26),'BGM plays the first bar from the top (E5)');
assert(bgmPlaying===true,'BGM keeps playing after the rewind');
// ---- 曲ごとの拍・テンポ（ワルツ対応）----
assert(unitSeconds({bpm:90})===60/(90*4),'unitSeconds uses per-track bpm (90 -> 0.1667s per 16th)');
assert(barSixteenths({meter:3})===12,'barSixteenths uses per-track meter (3/4 = 12 sixteenths)');
assert(unitSeconds(BGM_TRACKS[0])===60/(140*4)&&barSixteenths(BGM_TRACKS[0])===8,'existing tracks keep 2/4 @ bpm 140');
const waltz={name:'waltz-test',meter:3,bpm:90,bars:[[[69,4],[69,2],[69,2],[69,4],45],[[67,4],[67,2],[67,2],[67,4],43]]};
BGM_TRACKS.push(waltz);
bgmTrack=BGM_TRACKS.length-1;bgmPending=bgmTrack;bgmBar=0;evs.length=0;actx.currentTime=1.0;bgmNext=1.0;bgmTick();
assert(bgmBar===1,'3/4 bar advances as a single bar');
assert(Math.abs(bgmNext-(1.0+12*(60/(90*4))))<1e-9,'3/4 bar consumes 12 sixteenths at bpm 90 ('+bgmNext.toFixed(4)+'s)');
assert(evs.filter(e=>Math.abs(e.f-440)<0.5).length>=1,'waltz melody note A4 scheduled');
BGM_TRACKS.pop();bgmTrack=0;bgmPending=0;bgmBar=0;
assert(bgmTrackForLevel(1)===0&&bgmTrackForLevel(6)===1,'level rotation unchanged (5 levels per track)');
// ---- 効果音：ラインクリアのベル音（大きく・気持ちよく）----

// ---- 効果音：ラインクリアのベル音（大きく・気持ちよく）----
gains.length=0;evs.length=0;
fanfare(1,false);
assert(evs.filter(e=>Math.abs(e.f-523.25)<0.5).length===2,'single clear: C5 bell = carrier + FM modulator');
assert(evs.some(e=>Math.abs(e.f-1569.75)<0.5),'bell FM modulator at ratio 3 present');
assert(evs.length>=8,'single clear plays 3 notes + bass ('+evs.length+' voices)');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak))>=0.2,'clear chime amplitude peak >= 0.2 (old square was 0.045)');
assert(sfxGain!==null,'SFX bus (gain + compressor) created');
evs.length=0;gains.length=0;
fanfare(4,true);
assert(evs.length>=20,'tetris fanfare is denser than a single clear ('+evs.length+' voices)');
assert(evs.some(e=>Math.abs(e.f-220)<0.5),'tetris fanfare has low A3 support note');
assert(evs.some(e=>Math.abs(e.f-1320)<0.5),'tetris sparkle layer present');
assert(Math.max.apply(null,evs.map(e=>e.dur))<1,'every fanfare voice stops within 1s (max '+Math.max.apply(null,evs.map(e=>e.dur)).toFixed(2)+'s) - no runaway drone');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak))<=0.25,'sparkle plays at bell volume, not a clipping buzzer');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak>1).map(g=>g.gain.peak))<=1400,'FM mod depth capped at 1400Hz (no buzzer-like deviation on high notes)');
assert(evs.filter(e=>e.t>=0.14).length>=6,'sparkle layer is staggered from 140ms (not all at once)');
// ---- 効果音：ブロック着弾音（FMパンチ）----
evs.length=0;gains.length=0;
thud(0.24,true);
assert(evs.length>=4,'landing thud = FM body + FM transient ('+evs.length+' voices)');
assert(evs.some(e=>e.f<100),'thud body carrier in low range (fast pitch drop -> thump)');
assert(evs.some(e=>Math.abs(e.f-275)<0.5),'thud body modulator at ratio 2.5 present');
assert(evs.some(e=>Math.abs(e.f-803)<0.5),'thud transient layer (inharmonic ratio 7.3) present');
assert(evs.filter(e=>e.type==='sine').length===evs.length,'thud uses sine FM operators only');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak))>=0.2,'landing thud amplitude peak >= 0.2 (old square beep was 0.05)');
// 地面に触れた瞬間に鳴る（lock delayを待たない）
evs.length=0;gains.length=0;anim=null;over=false;started=true;
grid.fill(null);piece={t:'O',s:0,x:4,y:18};grounded=false;ground();
assert(evs.length>=4,'thud plays at first contact with the ground');
evs.length=0;
move(1,0);
assert(evs.length===0,'no retrigger while still grounded');
piece.y=17;ground();
assert(evs.length===0,'no landing sound while airborne');
piece.y=18;ground();
assert(evs.length>=4,'re-landing after leaving the ground retriggers');
// 自然着地（小）とハードドロップ（大）
evs.length=0;gains.length=0;
grid.fill(null);piece={t:'O',s:0,x:4,y:18};grounded=false;ground();
const softPeak=Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak));
assert(softPeak>=0.1&&softPeak<0.2,'soft landing plays at low volume ('+softPeak.toFixed(3)+')');
evs.length=0;gains.length=0;
grid.fill(null);piece={t:'O',s:0,x:4,y:10};grounded=false;hardDrop();finishDrop();   // 着弾まで落下（滑らか）
const hardPeak=Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak));
assert(hardPeak>softPeak,'hard drop thud is louder than soft landing ('+hardPeak.toFixed(3)+' > '+softPeak.toFixed(3)+')');
evs.length=0;gains.length=0;
grid.fill(null);piece={t:'O',s:0,x:4,y:18};grounded=false;hardDrop();   // 落下距離0 = 小
const shortPeak=Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak));
assert(shortPeak<hardPeak,'short drop is softer than long drop ('+shortPeak.toFixed(3)+' < '+hardPeak.toFixed(3)+')');
// クリア時：着弾音の後にベルが前面に出る
evs.length=0;gains.length=0;
grid.fill(null);for(let c=0;c<COLS;c++)grid[19*COLS+c]='T';piece={t:'O',s:0,x:0,y:18};grounded=true;hardDrop();
assert(evs.length>=8,'clear still plays the fanfare after the thud ('+evs.length+' voices)');
assert(Math.max.apply(null,gains.filter(g=>g.gain.peak<=1).map(g=>g.gain.peak))>=0.2,'fanfare stays dominant over the landing thud');
// トップアウトでは着弾音ではなくゲームオーバーのジングルだけが鳴る
evs.length=0;gains.length=0;over=false;
grid.fill(null);for(let r=0;r<3;r++)for(let c=0;c<COLS;c++)grid[r*COLS+c]='J';piece=null;setPiece('T');
assert(over===true,'top-out triggers game over');
assert(evs.filter(e=>e.f<100).length===0,'no landing thud at top-out ('+evs.length+' voices = jingle only)');
// ---- デモ（アトラクトモード）中は無音 ----
demo=true;bgmUi();
assert(muted()===true,'demo mutes SFX and BGM');
evs.length=0;gains.length=0;
fanfare(4,true);
assert(evs.length===0,'no fanfare while the demo is running');
thud(0.24,true);
assert(evs.length===0,'no landing thud while the demo is running');
beep(620,.05,'square',.03);
assert(evs.length===0,'no rotation beep while the demo is running');
assert(bgmPlaying===false,'BGM stays stopped during the demo');
assert(ui.bgm.textContent==='OFF（デモ）','BGM state shows the demo mute');
demo=false;
assert(muted()===false,'sound returns as soon as the demo is off');
evs.length=0;gains.length=0;
fanfare(1,false);
assert(evs.length>0,'sound plays again after the demo ends');
// デモ開始でBGM停止、停止で再開
startGame();
assert(bgmPlaying===true,'BGM plays in a normal game');
startDemo();
assert(demo===true&&bgmPlaying===false,'startDemo() stops the BGM');
assert(ui.bgm.textContent==='OFF（デモ）','BGM state shows demo mute after startDemo()');
stopDemo();
assert(demo===false&&bgmPlaying===true,'stopDemo() resumes the BGM');
assert(ui.bgm.textContent==='ON','BGM state goes back to ON after the demo');
`;

eval(src+test);
console.log(fails===0?'\nALL FM BGM TESTS PASSED':'\n'+fails+' TEST(S) FAILED');
process.exit(fails===0?0:1);
