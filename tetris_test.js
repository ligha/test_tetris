const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, 'tetris_gpfix.html'), 'utf8');
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const texts = [];
const paths = [];
const fills = [];
const fillPts = [];
const strokes = [];
const transforms = [];
let lastPt = null;
const noop = () => {};
const ctxStub = { fillStyle:'', strokeStyle:'', lineWidth:1, globalAlpha:1, font:'', textAlign:'', textBaseline:'',
  beginPath:noop, moveTo:(x,y)=>{ paths.push({x,y}); lastPt={x,y}; }, lineTo:noop, arcTo:noop, closePath:noop,
  arc:(x,y,r)=>{ paths.push({x,y,r}); },
  fill:()=>{ fills.push(ctxStub.fillStyle); fillPts.push({style:ctxStub.fillStyle,y:lastPt?lastPt.y:null}); }, stroke:()=>{ strokes.push(ctxStub.strokeStyle); }, fillRect:noop, clearRect:noop, save:noop, restore:noop,
  translate:(x,y)=>{ transforms.push({x,y}); }, fillText:(t,x,y)=>{ texts.push({t,x,y}); } };
const mkCanvas = (w,h) => ({ width:w, height:h, getContext:() => ctxStub, addEventListener:noop });
const boardStub = mkCanvas(240, 480 + 24);   // 板 + 上部1ブロチE��の出現行（板の20行より上！ETOP�E�EELL*1�E�E
const txt = { textContent:'' };
const msgTxt = { textContent:'' };
const els = { board:boardStub, hold:mkCanvas(120,80), next:mkCanvas(120,220),
  score:txt, lines:txt, level:txt, time:txt, msg:msgTxt,
  gaugefill:{textContent:'',style:{width:''}}, gaugenext:{textContent:''}, gaugepct:{textContent:''},
  hiscore:{textContent:''}, hilevel:{textContent:''}, gpstate:{textContent:'未接続'},
  bgmname:{textContent:''}, bgmstate:{textContent:''},
  startbtn:{textContent:'START',addEventListener:noop},
  pad:{addEventListener:noop} };
const gameStub = { style:{}, offsetWidth:444, offsetHeight:640 };
global.document = { getElementById:(id) => els[id], addEventListener:noop,
  querySelector:(s) => (s === '.game' ? gameStub : null) };
global.window = { addEventListener: noop };
global.performance = { now:() => 0 };
global.requestAnimationFrame = noop;
const store = {};
global.localStorage = { getItem:(k) => store[k] || null, setItem:(k,v) => { store[k] = v; } };

let fails = 0;
function assert(c, m){ if(!c){ fails++; console.log('FAIL: ' + m); } else console.log('ok   : ' + m); }

const test = `
function idx(r,c){ return r*COLS+c; }
Math.random = () => 0;
function fresh(){ grid.fill(null); reset(); }
started = true;   // 以降、テスト�Eスタート済みとして扱われめE

// 1) 初期匁E
reset();
assert(grid.length === 200, 'grid size 200');
assert(queue.length === 5, 'next queue = 5');
assert(!!piece, 'piece spawned');
assert(STATES.T.length === 4 && STATES.I.length === 4, '4 rotation states');

// 2) 回転状態と形状�E�E の state0 は .X./XXX/... �E�E
const t0 = STATES.T[0].slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
assert(JSON.stringify(t0) === JSON.stringify([[1,0],[0,1],[1,1],[2,1]]), 'T spawn shape');
const t1 = STATES.T[1].slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
console.log('T state1 actual:', JSON.stringify(t1));
assert(JSON.stringify(t1) === JSON.stringify([[1,0],[1,1],[2,1],[1,2]]), 'T state R shape (T points right)');

// 3) キーが実際に使われる（最初�EオフセチE��が塞がれてぁE��場合！E��E
grid.fill(null);
grid[idx(10,1)] = 'X';
piece = { t:'T', s:0, x:0, y:10 };
assert(rotate(1), 'T rotation used a kick');
assert(piece.s === 1 && piece.x === -1 && piece.y === 10, 'T kick offset (x=' + piece.x + ', y=' + piece.y + ')');
grid.fill(null);
grid[idx(11,2)] = 'X';
piece = { t:'I', s:0, x:0, y:10 };
assert(rotate(1), 'I rotation used a kick');
assert(piece.x === -2 && piece.y === 10, 'I kick offset (x=' + piece.x + ', y=' + piece.y + ')');
// 壁キチE��: 左壁で回転しても場外に出なぁE
grid.fill(null);
piece = { t:'T', s:0, x:0, y:10 };
rotate(1);
assert(piece.x >= 0, 'wall kick keeps piece inside field (x=' + piece.x + ')');

// 5) 接地 + ロチE��で格子に書き込まれる
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop(); finishDrop();
assert(grid[idx(19,4)] === 'O' && grid[idx(19,5)] === 'O' && grid[idx(18,4)] === 'O', 'hard drop locks cells');
assert(!!piece, 'next piece spawned after lock');

// 6) ラインクリア + スコア
fresh();
for (let c = 2; c < COLS; c++) grid[idx(19,c)] = 'J';
piece = { t:'O', s:0, x:0, y:18 };
hardDrop(); finishDrop();
assert(anim && anim.rows.length === 1, 'line clear detected');
finishAnim();
assert(lines === 1, 'lines counted');
assert(score === 100, 'score = 100 at level 1 (got ' + score + ')');
assert(grid[idx(19,0)] === 'O' && grid[idx(19,1)] === 'O', 'stack collapsed correctly');
assert(grid.filter(v => v).length === 2, 'only the O remains after clear');

// 6b) ハ�EドドロチE�Eのボ�Eナス点�E�Eマス2点�E�E
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop(); finishDrop();
assert(score === 36, 'hard drop bonus = 2/cell (got ' + score + ')');

// 7) 4ラインクリア = 800点 + 全消しボ�Eナス
fresh();
for (let r = 16; r < 20; r++) for (let c = 0; c < COLS - 1; c++) grid[idx(r,c)] = 'I';
piece = { t:'I', s:1, x:7, y:16 };
hardDrop(); finishDrop();
assert(anim && anim.rows.length === 4, 'tetris detected');
finishAnim();
assert(lines === 4, 'total lines = 4');
assert(score === 800 + 3000, 'tetris + all-clear bonus (got ' + score + ')');
assert(level === 1, 'level stays 1 at 4 lines (got ' + level + ')');

// 7c) レベルゲージ�E�次のレベルまでの進捗！E
fresh();
assert(ui.gaugefill.style.width === '0%' && ui.gaugepct.textContent === '0%', 'gauge starts empty');
assert(ui.gaugenext.textContent === 'next: 10 lines', 'gauge cap shows 10 lines to next level');
lines = 7; hud();
assert(ui.gaugefill.style.width === '70%' && ui.gaugepct.textContent === '70%', 'gauge at 7 lines = 70%');
assert(ui.gaugenext.textContent === 'next: 3 lines', 'gauge cap shows 3 lines left');
lines = 10; level = 2; hud();
assert(ui.gaugefill.style.width === '0%', 'gauge resets on level up');
fresh(); lines = 9; level = 1;
anim = { rows:[19], tsp:false };
finishAnim();
assert(level === 2 && ui.gaugefill.style.width === '0%', 'gauge resets when a clear pushes to level 2');
lines = 137; level = 20; hud();
assert(ui.gaugefill.style.width === '100%' && ui.gaugenext.textContent === 'MAX', 'gauge shows MAX at level 20');

// 8) Tスピン判定（ラインクリアなしでもTスピンボ�Eナス�E�E
fresh();
grid[idx(17,0)] = 'J'; grid[idx(17,2)] = 'J'; grid[idx(19,0)] = 'J';
piece = { t:'T', s:0, x:0, y:17 };
lastRot = true;
hardDrop(); finishDrop();
assert(!anim, 'no line clear here');
assert(score === 200, 'T-spin bonus = 200 (got ' + score + ')');

// 8b) Tスピン + 1ラインクリア = 200点×level
fresh();
for (let c = 3; c < COLS; c++) grid[idx(18,c)] = 'J';
grid[idx(17,0)] = 'J'; grid[idx(17,2)] = 'J'; grid[idx(19,2)] = 'J';
piece = { t:'T', s:0, x:0, y:17 };
lastRot = true;
hardDrop(); finishDrop();
assert(anim && anim.tsp && anim.rows.length === 1 && anim.rows[0] === 18, 'T-spin single clear');
finishAnim();
assert(score === 200, 'T-spin single = 200 (got ' + score + ')');
assert(lines === 1, 'T-spin single counted as 1 line');

// 9) ホ�EルチE
fresh();
const first = piece.t;
holdPiece();
assert(hold === first, 'hold stores piece');
assert(!canHold, 'cannot hold twice in a row');
canHold = true; // ロチE��で回復したことを模倣
const second = piece.t;
holdPiece();
assert(piece.t === first && hold === second, 'hold swap works');

// 10) 7-bag: 14個で全タイプちめE��ど2囁E
fresh();
const cnt = {};
for (let i = 0; i < 14; i++){ const t = queue.shift(); queue.push(popBag()); cnt[t] = (cnt[t]||0)+1; }
assert(Object.keys(cnt).length === 7 && Object.values(cnt).every(v => v === 2), '7-bag distribution');

// 11) ゲームオーバ�E判定（スポン位置が埋まる！E
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
setPiece('T');
assert(over, 'game over on blocked spawn');

// 11b) ロチE��チップ（ムーブリセチE���E��E上限
fresh();
piece = { t:'O', s:0, x:4, y:18 };
ground();
assert(grounded, 'piece grounded at bottom');
for (let i = 0; i < MAXRESET + 2; i++){ move(1,0); move(-1,0); }
assert(resets === MAXRESET, 'move reset capped at ' + MAXRESET + ' (got ' + resets + ')');
lockT = LOCK;
lock();
assert(grid[idx(19,4)] === 'O', 'locks after delay cap');

// 12) 重力チE�Eブル
assert(GRAVITY[1] === 1 && GRAVITY[10] === 0.1 && GRAVITY[20] === 0.008, 'gravity table');

// 13) 4000フレーム描画スモークチE��ト（例外なし、E��力でピ�EスがロチE��される！E
fresh();
let frames = 0, locks = 0;
for (let i = 0; i < 4000; i++){
  const before = piece;
  loop(i * 16.7);   // requestAnimationFrame はスタブなので1回ずつ呼ぶ
  if (before && !piece) locks++;
  frames++;
  if (over) break;
}
assert(frames > 1000, 'frames rendered without error (' + frames + ')');
assert(grid.filter(v => v).length >= 4, 'gravity locked pieces (' + grid.filter(v => v).length + ' cells)');

// 14) 全回転状態�E4マス・自箱(n×n)に収まめE
fresh();
let bad = 0;
for (const t of TYPES){
  const n = BOX[t];
  for (let s = 0; s < 4; s++){
    if (STATES[t][s].length !== 4) bad++;
    for (const [cx, cy] of STATES[t][s]) if (cx < 0 || cx >= n || cy < 0 || cy >= n) bad++;
  }
}
assert(bad === 0, 'all states are 4 cells inside their own box (bad=' + bad + ')');
// 空フィールドなら�Eタイプがスポン位置に置ける
let fits = 0;
for (const t of TYPES){ if (!collides(t, 0, Math.floor((COLS - BOX[t]) / 2), 0)) fits++; }
assert(fits === 7, 'all 7 types spawn without collision');

// 15) 置ぁE��とき�Eエフェクト！Eurst 単体！E
fresh();
for (let c = 0; c < COLS; c++) grid[idx(19,c)] = 'J';
burst([19]);
assert(FX.parts.length === 20, '1 line = 2 particles/cell (got ' + FX.parts.length + ')');
assert(FX.flash === 0.48 && FX.shake === 6.5, 'flash/shake scale with line count (' + FX.flash + ', ' + FX.shake + ')');
const p0 = JSON.stringify(FX.parts[0]);
stepFx(100);
assert(JSON.stringify(FX.parts[0]) !== p0, 'particles move under gravity');
assert(FX.flash < 0.48 && FX.shake < 6.5, 'effects decay over time');
for (let i = 0; i < 200; i++) stepFx(16.7);
assert(FX.parts.length === 0 && FX.flash === 0 && FX.shake === 0, 'effects fully decayed');

// 16) TETRIS はより強ぁE��フェクチE
fresh();
for (let r = 16; r < 20; r++) for (let c = 0; c < COLS; c++) grid[idx(r,c)] = 'I';
burst([16,17,18,19]);
assert(FX.parts.length === 120, 'tetris = 3 particles/cell (got ' + FX.parts.length + ')');
assert(FX.flash === 1 && FX.shake === 16, 'tetris flash/shake peak');

// 17) ハ�EドドロチE�Eの着地�E�板全体�E霁E��ず、火花・衝撃波の輪・光が派手に
fresh();
piece = { t:'O', s:0, x:4, y:18 };
hardDrop(); finishDrop();
assert(FX.parts.length === 11, 'landing sparks = 2/cell + 3 core (got ' + FX.parts.length + ')');
assert(FX.parts.some(p => p.t === ''), 'core sparks are white');
assert(FX.shake === 0, 'landing does not shake the board (' + FX.shake + ')');
assert(FX.glow.length === 4, 'landing glow = 1/cell (got ' + FX.glow.length + ')');
assert(FX.glow.every(g => g.t === 'O'), 'glow cells are the landed piece');
assert(FX.rings.length === 1, 'landing shockwave ring recorded (' + FX.rings.length + ')');
assert(FX.rings[0].r1 > FX.rings[0].r0, 'ring expands from r0 to r1');
assert(FX.rings[0].t === 'O', 'ring uses the landed piece colour');
stepFx(100);
assert(FX.glow.length === 4 && FX.glow[0].life < FX.glow[0].max, 'glow decays over time');
assert(FX.rings.length === 1 && FX.rings[0].life < FX.rings[0].max, 'ring decays over time');
paths.length = 0; strokes.length = 0; fills.length = 0;
draw();
assert(paths.filter(p => p.r !== undefined).length === 1, 'draw() draws the shockwave ring');
assert(strokes.indexOf(COLORS['O']) >= 0, 'draw() strokes the ring in the piece colour');
const glowFills = fills.filter(f => f === '#fff').length;
FX.glow.length = 0;
FX.rings.length = 0;
fills.length = 0;
draw();
assert(glowFills > fills.filter(f => f === '#fff').length, 'draw() paints the glow and the ring (' + glowFills + ')');
stepFx(1200);
assert(FX.glow.length === 0 && FX.rings.length === 0 && FX.parts.length === 0, 'effects fade out completely');
fresh();
assert(FX.glow.length === 0 && FX.rings.length === 0 && FX.parts.length === 0, 'effects cleared on reset');
// 長ぁE��下ほど強くなめE
fresh();
piece = { t:'O', s:0, x:4, y:10 };
hardDrop(); finishDrop();
assert(FX.parts.length > 11, 'long drop kicks more sparks (' + FX.parts.length + ')');
assert(FX.glow[0].max > 0.45, 'glow scales with drop distance (' + FX.glow[0].max + ')');
assert(FX.rings[0].r1 > CELL * 1.5, 'ring scales with drop distance (' + FX.rings[0].r1 + ')');
assert(FX.shake === 0, 'long drop does not shake the board either');

// 18) パ�EチE��クル上限
fresh();
for (let i = 0; i < 500; i++) spark(0, 0, 'I', 0, 0, 1, 4);
assert(FX.parts.length <= 421, 'particle cap respected (' + FX.parts.length + ')');

// 19) 実際のクリア経路でエフェクト描画→finishAnim�E�例外なし！E
fresh();
for (let c = 0; c < COLS; c++) grid[idx(19,c)] = 'T';
piece = { t:'O', s:0, x:0, y:18 };
hardDrop(); finishDrop();
assert(anim && FX.parts.length > 0 && FX.flash > 0 && FX.shake > 0, 'clear triggers fx via lock()');
for (let i = 0; i < 10; i++){ stepFx(16.7); draw(); }   // anim 中に描画�E�スイーチEシェイク/フラチE��ュ�E�E
assert(anim, 'anim still active mid-effect');
finishAnim();
assert(anim === null && FX.parts.length > 0, 'particles survive after rows cleared (' + FX.parts.length + ')');
draw();

// 20) game over overlay
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
setPiece('T');
assert(over, 'overlay: game over set');
assert(overT === 0, 'overlay: overT starts 0');
texts.length = 0;
draw();
const go = texts.filter(t => t.t === 'GAME OVER');
assert(go.length === 1, 'overlay: GAME OVER drawn once');
assert(go[0].x === board.width/2 && Math.abs(go[0].y - ROWS*CELL/2) < 80, 'overlay: centered on the board area (y=' + go[0].y + ')');
assert(texts.some(t => t.t.indexOf('SCORE  ') === 0), 'overlay: score line drawn');
assert(texts.some(t => t.t.indexOf('TIME  ') === 0), 'overlay: time line drawn');
assert(texts.some(t => t.t === 'START ボタンで再開始'), 'overlay: start hint (blink on at overT=0)');
overT = 500;
texts.length = 0;
draw();
assert(!texts.some(t => t.t === 'START ボタンで再開始'), 'overlay: hint blinks off at overT=500');
overT = 1000;
texts.length = 0;
draw();
assert(texts.some(t => t.t === 'START ボタンで再開始'), 'overlay: hint blinks back on');
assert(FX.flash > 0 && FX.shake > 0, 'overlay: game over triggers fx');
drawOver();

// 20b) ゲームオーバ�E原因のブロチE��は板に重�Eず、一番上にはみ出したまま表示されめE
//   配置位置が埋まってぁE��ケース�E�ブロチE��はスタチE��の上（余白冁E��まで持ち上げられめE
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
setPiece('T');
assert(over === true, 'cause: game over on blocked spawn');
assert(overCells.length === 3, 'cause: only the cells inside the board count as a spawn overlap (' + overCells.length + ')');
assert(overCause && overCause.y === SPAWN_ROW, 'cause: the blocked next mino stays at the spawn row, one row above the 20-row board (y=' + overCause.y + ')');
assert(overPiece === true && piece === null, 'cause: the blocked next mino is kept for display but not placed on the board');
assert(causeWhite() === false, 'cause: not white at overT=0');
fills.length = 0;
draw();
const early = fills.filter(f => f === '#fff').length;
overT = 600;
assert(causeWhite() === true, 'cause: white 0.5s after game over (overT=600)');
fills.length = 0;
draw();
const late = fills.filter(f => f === '#fff').length;
assert(late > early, 'cause: the overhang turns white after 0.5s (' + late + ' vs ' + early + ')');

// 20b-2) 原因ブロチE��は板の上（負のy�E�に描かれる
paths.length = 0;
draw();
const aboveTop = paths.filter(p => p.y < 0).length;
assert(aboveTop > 0, 'cause: the overhang is drawn above the board top (' + aboveTop + ' points)');

// 20b-3) 0.5秒後から�E色と白が交互に点滁E��る（一つ手前のブロチE��は白くならなぁE��E
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
setPiece('T');
assert(causeBlink() === false, 'blink: not started before 0.5s');
assert(causeColor('T') === COLORS['T'], 'blink: own colour before 0.5s');
assert(cellColor(idx(0,4)) === COLORS['J'], 'blink: the block just before keeps its own colour');
const phases = [];
for (let t = 500; t <= 1750; t += 125) { overT = t; phases.push(causeWhite() ? 'W' : 'C'); }
assert(phases.join('') === 'WWCCWWCCWWC', 'blink: alternates white/colour every 250ms (' + phases.join('') + ')');
overT = 600;
fills.length = 0;
draw();
overT = 600;
fills.length = 0;
draw();
const wWhite = fills.filter(f => f === '#fff').length, wT = fills.filter(f => f === COLORS['T']).length;
overT = 850;
fills.length = 0;
draw();
const cWhite = fills.filter(f => f === '#fff').length, cT = fills.filter(f => f === COLORS['T']).length;
assert(wWhite > cWhite && cT > wT, 'blink: draw() alternates white/colour for the cause (' + wWhite + '/' + wT + ' -> ' + cWhite + '/' + cT + ')');

// 20b-5) 点滁E��る�Eは上部1ブロチE���E��E現行＝板の20行より上）�Eの部刁E��け（板冁E��重なる�Eは自色のまま�E�E
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 2; r++) grid[idx(r,c)] = 'J';
setPiece('T');
const stT = STATES['T'][0];
const inStrip = stT.filter(function (o) { return overCause.y + o[1] < 0; }).length;
assert(overCause.y === SPAWN_ROW, 'spawn row: the cause mino top edge sits at the spawn row (row 20, above the board) (y=' + overCause.y + ')');
assert(inStrip > 0 && inStrip < stT.length, 'spawn row: part of the mino is in the spawn row and part overlaps the top board row (' + inStrip + '/' + stT.length + ')');
overT = 600;
fillPts.length = 0;
drawCause(bctx, 1);
const wStrip = fillPts.filter(function (f) { return f.y !== null && f.y < 0 && f.style === '#fff'; }).length;
const wBelow = fillPts.filter(function (f) { return f.y !== null && f.y >= 0 && f.style === '#fff'; }).length;
const wOwn = fillPts.filter(function (f) { return f.y !== null && f.y >= 0 && f.style === COLORS['T']; }).length;
overT = 850;
fillPts.length = 0;
drawCause(bctx, 1);
const cStrip = fillPts.filter(function (f) { return f.y !== null && f.y < 0 && f.style === '#fff'; }).length;
const cBelow = fillPts.filter(function (f) { return f.y !== null && f.y >= 0 && f.style === '#fff'; }).length;
const cOwn = fillPts.filter(function (f) { return f.y !== null && f.y >= 0 && f.style === COLORS['T']; }).length;
assert(wStrip > cStrip, 'spawn row: only the part inside the spawn row blinks white (' + wStrip + ' -> ' + cStrip + ')');
assert(wBelow === cBelow, 'spawn row: the part inside the board never blinks (' + wBelow + ' = ' + cBelow + ')');
assert(cOwn > 0 && cOwn >= wOwn, 'spawn row: the part inside the board keeps its own colour (' + cOwn + ')');

// 20b-4) 板の20行より上（�E現行＝row 20�E�でロチE��したらゲームオーバ�E�E��Eよ�Eよテトリスと同じルール�E�E
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 2; r++) grid[idx(r,c)] = 'J';
setPiece('I');
assert(over === false, 'spawn row above the board is not blocked by the stack (I)');
assert(overCause === null, 'no cause before the mino locks in the spawn row');
ground();
assert(grounded, 'the I mino is grounded at the spawn row (row 20) when the top board row is full');
lock();
assert(over === true, 'lock-out: locking in the spawn row (above the 20-row board) ends the game');
assert(overCause && overCause.y === SPAWN_ROW - 1, 'lock-out: the cause mino stays at the spawn row (y=' + overCause.y + ')');
assert(STATES['I'][0].every(function (o) { return overCause.y + o[1] < 0; }), 'lock-out: the I mino stays inside the spawn row');
assert(overCells.length === 0, 'lock-out: the mino in the spawn row is not recorded as board cells');
assert(grid.filter(v => v !== null && v !== 'J').length === 0, 'lock-out: nothing is written into the board');

// 20c) 上まで積み上がったケース�E�板に置かれず、上にはみ出したまま0.5秒後に点滁E��めE
fresh();
for (let c = 0; c < COLS; c++) grid[idx(0,c)] = 'J';
piece = { t:'O', s:0, x:4, y:-2 };
lock();
assert(over === true, 'cause: locking entirely above the top ends the game');
assert(overCells.length === 0, 'cause: nothing is recorded as a stacked cause');
assert(overPiece === true, 'cause: the overhanging piece is kept for display');
assert(overCause && overCause.y === -2, 'cause: the mino stays at the row where it locked, above the 20-row board (y=' + overCause.y + ')');
assert(grid.filter(v => v !== null && v !== 'J').length === 0, 'cause: the piece was not written into the board');
assert(causeWhite() === false, 'cause: still its own colour at overT=0');
overT = 500;
assert(causeWhite() === true && causeColor('O') === '#fff', 'cause: turns white 0.5s later');
overT = 750;
assert(causeWhite() === false && causeColor('O') === COLORS['O'], 'cause: back to its own colour 0.25s after that');
fresh();
assert(over === false && overCells.length === 0 && overPiece === false && overCause === null, 'cause highlight clears on reset');
assert(html.indexOf('0.5秒後に自色と白が交互に点滅します') >= 0, 'help mentions the cause block blinking between its colour and white');
assert(html.indexOf('NEXTパネルのミノ') >= 0, 'help mentions the NEXT panel mino blinking');
assert(/function drawNext\(\)/.test(src), 'drawNext() draws the NEXT panel');

// 20b-6) NEXTパネルのネクストミノ（�E現位置が塞がれたミノ�E�が0.5秒後に自色⇔白で点滁E��めE
fresh();
demo = false;
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
queue[0] = 'T';
spawnNext();
assert(over === true, 'next panel: game over when the next mino spawn position is blocked');
assert(overCause && overCause.t === 'T', 'next panel: the blocked mino is recorded as the cause');
assert(queue[0] === 'T', 'next panel: the blocked mino stays as the next mino');
fills.length = 0; drawNext();
assert(fills[0] === COLORS['T'], 'next panel: own colour before 0.5s');
overT = 600;
fills.length = 0; drawNext();
assert(fills[0] === '#fff', 'next panel: blinks white after 0.5s');
overT = 850;
fills.length = 0; drawNext();
assert(fills[0] === COLORS['T'], 'next panel: back to its own colour 0.25s later');
overT = 600;
fills.length = 0; drawNext();
assert(fills[8] === COLORS[queue[1]], 'next panel: the other slots keep their own colour');

// 20b-7) ゲームオーバ�EはロチE��時�E重褁E��はなく、ネクストミノ�E出現位置の重褁E��判定される
fresh();
for (let c = 4; c < COLS; c++) grid[idx(0,c)] = 'J';   // 最上段が埋まってぁE��がラインは完�EしてぁE��ぁE
queue[0] = 'T';
piece = { t:'T', s:0, x:4, y:18 };
ground(); lockT = LOCK; lock();
assert(over === true, 'the game ends when the next mino cannot appear at its spawn position');
assert(overCause && overCause.t === 'T' && queue[0] === 'T', 'the cause is the next mino shown in the NEXT panel');
assert(grid[idx(19,4)] === 'T', 'the locked piece itself is written into the board');
assert(overCells.length > 0, 'the spawn overlap is recorded as the cause');
fresh();
queue[0] = 'T';
piece = { t:'T', s:0, x:4, y:18 };
ground(); lockT = LOCK; lock();
assert(over === false && overCause === null, 'a normal lock does not end the game when the next spawn is free');

// 20d) プレイ画面�E�板20ブロチE���E�上部1ブロチE��の出現行（板の20行より上＝row 20�E�E
assert(TOPROWS === 1 && TOP === CELL * TOPROWS, 'the top area is one block  Ethe spawn row above the board (' + TOP + 'px)');
assert(SPAWN_ROW === -1, 'the spawn row is the row above the 20-row board (row 20 counting from the bottom)');
assert(board.height === ROWS * CELL + TOP, 'board canvas is tall enough to show the strip (' + board.height + ')');
assert(html.indexOf('aspect-ratio:20/42') >= 0, 'CSS board aspect ratio matches 240x504');
assert(html.indexOf('上部1ブロックの出現行（板の20行より上＝row 20）') >= 0, 'help mentions the spawn row above the 20-block field');
assert(html.indexOf('ぷよぷよテトリスと同じルール') >= 0, 'help mentions the Puyo Puyo Tetris spawn rule');
fresh();
transforms.length = 0;
draw();
assert(transforms.some(t => t.y === TOP), 'draw() shifts the board down by the headroom');

// 21) 60fps 滑らか落下（サブセル位置、平坁E��度は従来と同じ�E�E
fresh();
piece = { t:'O', s:0, x:4, y:0 };
dropT = 0; fracY = 0;
assert(fracY === 0, 'fracY starts 0');
for (let i = 0; i < 30; i++) gravityStep(16.7);          // ~501ms, level 1 = 1cell/1000ms
assert(piece.y === 0, 'no whole-cell move before 1000ms (y=' + piece.y + ')');
assert(fracY > 0.49 && fracY < 0.52, 'half-cell fraction at ~500ms (' + fracY + ')');
paths.length = 0;
draw();
assert(paths.some(p => Math.abs(p.y - (fracY*CELL + 1)) < 0.01), 'draw uses fractional y');
for (let i = 0; i < 30; i++) gravityStep(16.7);          // total ~1002ms
assert(piece.y === 1, 'moved exactly 1 cell after 1000ms (y=' + piece.y + ')');
assert(fracY >= 0 && fracY < 1, 'fracY stays in [0,1)');
fresh();
piece = { t:'O', s:0, x:4, y:0 };
level = 10; dropT = 0; fracY = 0;
for (let i = 0; i < 60; i++) gravityStep(16.7);
assert(piece.y === 10, 'same average speed at level 10 (y=' + piece.y + ')');
fresh();
piece = { t:'O', s:0, x:4, y:19 };
dropT = 0; fracY = 0;
ground();
gravityStep(16.7);
assert(grounded && fracY === 0, 'fracY zero when grounded (snaps to grid)');
for (let i = 0; i < 40; i++) gravityStep(16.7);   // 668ms 経過、接地したまま
assert(grounded && fracY === 0, 'fracY stays 0 while grounded (' + fracY + ')');
hardDrop();
assert(fracY === 0, 'fracY reset on hard drop');

// 21b) ハ�EドドロチE�Eは最高速で滑らかに落下する（着弾するまでロチE��しなぁE��E
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop();
assert(dropAnim !== null, 'hard drop starts a smooth drop animation');
assert(dropAnim.d === 18 && dropAnim.from === 0 && dropAnim.to === 18, 'drop distance recorded (d=' + dropAnim.d + ')');
assert(dropAnim.dur === DROP_MAX_MS, 'long drop capped at ' + DROP_MAX_MS + 'ms (got ' + dropAnim.dur + ')');
assert(grid[idx(18,4)] === null, 'not locked yet while falling');
assert(score === 0, 'drop bonus applied at landing, not at the press');
assert(move(1,0) === false && rotate(1) === false, 'input ignored during the drop');
stepDrop(DROP_MAX_MS / 2);
assert(dropAnim && dropAnim.t === DROP_MAX_MS / 2, 'half way through the drop');
assert(dropY() === 9, 'smooth sub-cell position at half way (' + dropY() + ')');
paths.length = 0;
draw();
assert(paths.some(p => Math.abs(p.y - (dropY() * CELL + 1)) < 0.01), 'draw uses the interpolated y');
stepDrop(DROP_MAX_MS / 2);
assert(dropAnim === null, 'drop finished');
assert(grid[idx(18,4)] === 'O' && grid[idx(18,5)] === 'O', 'locked at the landing point');
assert(score === 36, 'drop bonus applied at landing (got ' + score + ')');

// 21c) 1マスの落下でも最低時間だけ滑らかに、接地済みなら即着弾
fresh();
piece = { t:'O', s:0, x:4, y:17 };
hardDrop();
assert(dropAnim && dropAnim.d === 1 && dropAnim.dur === DROP_MIN_MS, '1-cell drop uses the minimum smooth time (' + (dropAnim && dropAnim.dur) + ')');
finishDrop();
assert(dropAnim === null && grid[idx(19,4)] === 'O', 'short drop locks at landing');
fresh();
piece = { t:'O', s:0, x:4, y:19 };
hardDrop();
assert(dropAnim === null && grid[idx(19,4)] === 'O', 'already grounded locks immediately');
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop();
assert(dropAnim !== null, 'drop in progress before reset');
fresh();
assert(dropAnim === null, 'reset clears the drop animation');

// 21d) ポ�Eズ中は落下が止まり、解除で続き、着弾する
started = true; demo = false; paused = false;
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop();
paused = true;
last = 0;
for (let i = 1; i <= 5; i++) loop(i * 16.7);        // ポ�Eズ中は進まなぁE
assert(dropAnim !== null && dropAnim.t === 0, 'pause freezes the drop');
paused = false;
for (let i = 6; i <= 14; i++) loop(i * 16.7);       // 解除征E50ms -> 120ms で着弾
assert(dropAnim === null && grid[idx(18,4)] === 'O', 'drop completes after unpause');

// 19) スタート画面�E�STARTを押すまでゲームは動かなぁE
started = false;
piece = null;
fresh();
assert(!piece, 'no piece before START');
loop(1000);
assert(!piece, 'loop stays idle before START');
assert(texts.some(t => t.t === 'TETRIS'), 'start overlay drawn on the board');
assert(texts.some(t => t.t === 'START ボタンを押して開始'), 'start overlay hint drawn');
act('hard');
assert(!piece, 'pad buttons ignored before START');
startGame();
assert(started === true, 'startGame() starts the game');
assert(!!piece, 'piece spawns on start');
assert(ui.msg.textContent === 'スタート！', 'start message shown');
assert(el('startbtn').textContent === 'START', 'button label before start');
startGame();
assert(el('startbtn').textContent === 'START', 'button label stays START (no RESTART)');
assert(ui.msg.textContent === 'スタート！', 'start message shown again on re-start');
assert(score === 0 && lines === 0 && level === 1, 'START resets the game');

// 20) ハイスコア�E�記録とレベル�E�E
hi = 0; hiLevel = 0; newHi = false;
fresh();
assert(hi === 0, 'record starts at 0');
score = 1234; level = 7; hud();
assert(hi === 1234, 'score above record updates it live');
assert(hiLevel === 7, 'record level stored');
assert(String(els.hiscore.textContent) === '1234', 'high score displayed above SCORE');
assert(els.hilevel.textContent === 'Lv 7 ★更新中', 'record level shown with update mark');
assert(store['tetris_hi'] === '{"score":1234,"level":7}', 'record persisted to storage');
score = 900; hud();
assert(hi === 1234, 'lower score does not lower the record');
fresh();
assert(hi === 1234, 'record survives restart');
assert(newHi === false, 'update flag cleared on restart');
assert(String(els.hiscore.textContent) === '1234', 'high score still shown after restart');
assert(els.hilevel.textContent === 'Lv 7', 'record level shown without update mark');
score = 2000; level = 9; hud();
assert(hi === 2000 && hiLevel === 9, 'record updated live during play');
gameOver();
assert(over === true, 'game over reached');
assert(ui.msg.textContent === 'ハイスコア更新！ 2000点 / Lv 9', 'game over announces new record');
texts.length = 0; drawOver();
assert(texts.some(t => t.t === 'HI  2000   Lv 9'), 'game over overlay shows high score and level');
texts.length = 0; drawStart();
assert(texts.some(t => t.t === 'ハイスコア 2000 / Lv 9'), 'start overlay shows high score and level');

// 21) レイアウト：�E体を上部に寁E��て少し余白を残す
assert(/body\{[^}]*align-items:flex-start/.test(html), 'layout pinned to the top of the page');
assert(html.indexOf('padding:calc(14px + env(safe-area-inset-top))') >= 0, 'small margin kept around the layout (safe-area aware)');

// 22) リスタート削除�E�開始�E START ボタン / Enter のみ
assert(html.indexOf('RESTART') < 0, 'no RESTART label anywhere');
assert(html.indexOf("k==='r'") < 0, 'R key restart removed');
assert(html.indexOf('<kbd>R</kbd>') < 0, 'keys help no longer lists R');
fresh();
over = true;
act('hard');
assert(over === true, 'pad buttons no longer reset a finished game');
startGame();
assert(over === false && score === 0, 'START begins a new game after game over');

// 23) STARTボタンは操作�Eタン�E�Ead�E�レイアウトにある
assert(/<div class="pad" id="pad">\\s*<button id="startbtn" class="primary wide" data-a="start">/.test(html), 'START is the first cell of the pad grid');
assert(html.indexOf('<div class="box"><button id="startbtn"') < 0, 'START no longer sits in the side panel');
assert(html.indexOf('.pad button.wide{grid-column:1/-1}') >= 0, 'START spans the full pad row');
started = false; piece = null;
fresh();
act('start');
assert(started === true && !!piece, 'pad START action starts the game');

// 24) チE���E�E0秒無操作で自動開姁E
assert(DEMO_DELAY === 30000, 'demo starts after 30 seconds of no input');
started = false; demo = false; idle = 0; piece = null;
fresh();
last = 0;
for(let i = 1; i <= 600; i++) loop(i * 50);      // 30秒後�E無操佁E
assert(demo === true, 'demo auto-starts at boot after 30s idle');
assert(muted() === true, 'demo is silent (SFX and BGM muted)');
assert(!!piece, 'demo spawns a piece');
assert(texts.some(t => t.t === 'DEMO'), 'DEMO badge drawn on the board');
let maxFilled = 0;
for(let i = 601; i <= 1800; i++){          // 60秒�EチE��
  loop(i * 50);
  let f = 0;
  for(let j = 0; j < 200; j++) if(grid[j]) f++;
  if(f > maxFilled) maxFilled = f;
}
assert(maxFilled > 0, 'demo AI places blocks on the board');
assert(lines > 0, 'demo AI clears at least one line');
assert(over === false, 'demo AI survives its first minute');
hi = 0; score = 500; hud();
assert(hi === 0, 'demo does not touch the high score');
assert(score === 500, 'the demo keeps the previous play score for the HUD');
// チE��中の加算（ラインクリア・ハ�EドドロチE�E�E��Eスコアを更新しなぁE
const linesBefore = lines;
for (let c = 0; c < COLS; c++) grid[idx(19,c)] = 'T';
piece = { t:'O', s:0, x:0, y:18 };
anim = { rows:[19], tsp:false };
finishAnim();
assert(score === 500, 'demo does not add score for a line clear');
assert(lines === linesBefore + 1, 'the demo still counts lines');
hardDrop();
assert(score === 500, 'demo does not add the hard drop bonus');
markInput();
assert(idle === 0, 'markInput() clears the idle timer');
stopDemo();
assert(demo === false, 'input stops the demo');
assert(score === 0 && lines === 0 && level === 1, 'stopping the demo starts a clean game');
assert(!!piece, 'piece spawns right after the demo stops');
assert(muted() === false, 'sound returns when the demo stops');
started = true; demo = false; idle = 0;
fresh();
over = true;
last = 0;
for(let i = 1; i <= 600; i++) loop(i * 50);
assert(demo === true, 'demo auto-starts after game over too');
assert(html.indexOf('30秒無操作でデモ自動開始') >= 0, 'overlays mention the 30s demo');

// 24b) チE��中のゲームオーバ�E�E�ゲームオーバ�Eと同じ30秒（無操作）スタート後でチE��再開
started = true; demo = true; idle = 0;
fresh();
over = true; overT = 0;
last = 0;
for (let i = 1; i <= 400; i++) loop(i * 50);          // 20秒：まだ途中
assert(demo === true && over === true, 'demo game over keeps waiting for START (20s in)');
texts.length = 0; drawOver();
assert(texts.some(t => t.t === 'GAME OVER'), 'demo game over shows the same game over overlay');
for (let i = 401; i <= 600; i++) loop(i * 50);        // 30秒経過 -> チE��再開
assert(over === false, 'demo restarts after the same 30s wait');
assert(demo === true, 'the demo keeps running after the wait');
assert(score === 0 && lines === 0 && level === 1, 'the demo restarts from a clean board');
assert(idle === 0, 'the 30s wait restarts when the demo resumes');
score = 500;
markInput();
assert(idle === 0, 'input during the demo wait resets the 30s timer');
stopDemo();
assert(demo === false && score === 0, 'input during the demo wait starts a new game');

// 24b-2) チE��のゲームオーバ�Eでも原因ブロチE���E�上にはみ出し）が0.5秒後に白くなめE
started = true; demo = true; idle = 0;
fresh();
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r,c)] = 'J';
setPiece('T');
assert(over === true, 'demo game over keeps the overhang as the cause');
assert(overCells.length === 3 && overPiece === true && overCause && overCause.y === SPAWN_ROW, 'demo game over does not stack the cause block');
assert(causeWhite() === false, 'demo game over is not white yet');
overT = 600;
assert(causeWhite() === true, 'demo game over paints the cause white after 0.5s');
overT = 850;
assert(causeWhite() === false && causeColor('T') === COLORS['T'], 'demo game over alternates back to its own colour');
assert(muted() === true, 'demo stays silent at game over');

// 24c) チE��開始�E直前�Eプレイのスコア表示を引き継ぐ�E�スコアは更新しなぁE��E
started = false; demo = false; idle = 0;
fresh();
hi = 1200; hiLevel = 1; score = 1200;   // 直前�Eプレイのスコア�E�記録はプレイ中に既に反映済み�E�E
last = 0;
for (let i = 1; i <= 600; i++) loop(i * 50);
assert(demo === true, 'demo auto-starts keeping the previous play score');
assert(score === 1200, 'the demo does not reset the score display');
assert(hi === 1200, 'the demo score never becomes the record');
assert(String(els.hiscore.textContent) === '1200', 'the record line still shows the previous record');
// チE��中のラインクリア・ハ�EドドロチE�Eはスコアに加算されなぁE
const demoLines = lines;
for (let c = 0; c < COLS; c++) grid[idx(19,c)] = 'T';
piece = { t:'O', s:0, x:0, y:18 };
anim = { rows:[19], tsp:false };
finishAnim();
assert(score === 1200, 'demo does not add score for a line clear');
assert(lines === demoLines + 1, 'the demo still counts lines');
hardDrop();
assert(score === 1200, 'demo does not add the hard drop bonus');

// 24d) 手数の記録�E��Eレイヤーの操作をブロチE��単位で記録し、デモで再現する
started = true; demo = false; idle = 0;
fresh();
recStart();
assert(recPlay && recPlay.length === 0, 'recording starts empty');
const recT = piece.t;
act('cw'); act('left'); act('left'); act('hard'); finishDrop();
assert(recPlay.length === 1, 'one block recorded after lock (' + recPlay.length + ')');
assert(recPlay[0].t === recT, 'recorded the piece that was placed');
assert(recPlay[0].seq.join(',') === 'cw,left,left,hard', 'actions recorded in order (' + recPlay[0].seq.join(',') + ')');
demo = true;
act('cw'); act('hard'); finishDrop();
assert(recPlay.length === 1, 'demo moves are not recorded');
demo = false;
act('hold');
assert(recPlay[recPlay.length - 1].seq.indexOf('hold') < 0, 'hold is not recorded as an action');
assert(replays.length === 0, 'a short play is not saved yet');
for (let i = 0; i < 12; i++) { act('hard'); finishDrop(); grid.fill(null); }   // 積み上がらなぁE��ぁE��板面を空にする
assert(over === false, 'no game over while recording (' + recPlay.length + ' blocks)');
assert(replays.length === 0, 'the play is saved at game over, not before');
for (let c = 0; c < COLS; c++) for (let r = 0; r < 4; r++) grid[idx(r, c)] = 'J';
setPiece('T');
assert(over === true, 'game over ends the play');
assert(replays.length === 1, 'the play is saved at game over (' + replays.length + ')');
assert(replays[0].length >= 13, 'saved play keeps the recorded blocks (' + replays[0].length + ')');
assert(store[REPLAY_KEY] !== undefined, 'replay is saved to localStorage');
replays = [];
loadReplays();
assert(replays.length === 1, 'replays reload from storage');

// 24e) チE��は時、E��前プレイを�E現する�E�記録された操作を1手ずつ実行する！E
const rnd = Math.random;
Math.random = () => 0.5;      // 0.5 < DEMO_REPLAY_CHANCE -> リプレイを選ぶ
started = false; demo = false; idle = 0;
replays = [[{ t: 'I', seq: ['cw', 'left', 'left', 'hard'] }]];
startDemo();
assert(demo === true && demoRun !== null, 'demo picks a replay when one exists');
assert(piece.t === 'I', 'replay forces the recorded piece (' + piece.t + ')');
assert(piece.x === 3, 'replay spawns at the recorded column (' + piece.x + ')');
demoStep();
assert(piece.s === 1, 'replay replays the recorded rotation');
demoStep();
assert(piece.x === 2, 'replay replays the recorded move (' + piece.x + ')');
demoStep();
assert(piece.x === 1, 'replay replays the second recorded move (' + piece.x + ')');
demoStep();
assert(dropAnim !== null && demoSeqIdx === 4, 'replay hard drops at the end of the recorded sequence');
finishDrop();
assert(grid[idx(19, 3)] === 'I', 'replay places the recorded block');
assert(demoRunIdx === 1, 'the recorded block is consumed at landing');
demoStep();
assert(demoRun === null, 'the replay run ends after the last recorded block');

// 24f) 手変わり（単調な「回転→即ハ�EドドロチE�E」にならなぁE��E
assert(demoStepGap() >= 126 && demoStepGap() <= 252, 'demo step interval varies (' + demoStepGap() + ')');
fresh();
piece = { t: 'T', s: 0, x: 0, y: 0 };
const bp = bestPlacement();
assert(bp && typeof bp.sc === 'number', 'bestPlacement returns the score of the chosen spot');
let seed = 1;
Math.random = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const spots = new Set();
for (let i = 0; i < 40; i++) { const b = bestPlacement(); if (b) spots.add(b.s + ':' + b.x); }
assert(spots.size > 1, 'demo placement varies between runs (' + spots.size + ' spots)');   // 上位から重み付きで選ぶ
demo = true;
Math.random = () => 0.8;
setPiece('T');
assert(demoOrder === 1, 'demo sometimes moves before rotating');
Math.random = () => 0.05;    // 0.05 < 0.5 と 0.35 の両方成竁E-> 1歩ずつ落下＋一呼吸
setPiece('T');
assert(demoSoft > 0, 'demo sometimes drops one cell at a time');
assert(demoWait > 0, 'demo sometimes falls a few cells before hard dropping');
assert(demoBeat > 0, 'demo sometimes takes a breath');

// 24g) 毎手ハ�EドドロチE�EするわけではなぁE��一呼吸・1歩ずつ落下が混ざる�E�E
Math.random = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
assert(demoSoftGap() < demoStepGap(), 'soft drop steps use a shorter interval (' + demoSoftGap() + ' < ' + demoStepGap() + ')');
started = true; demo = true; idle = 0;
replays = [];
fresh();
let dsteps = 0, ddrops = 0, dsoft = 0, dland = 0;
for (let i = 0; i < 400; i++) {
  if (!piece || over) break;
  dsteps++;
  const wasSoft = demoSoft > 0;
  const y0 = piece.y;
  gravityStep(1000);            // レベル1の重力で1セル落ちる（デモ中はスコア加算なし！E
  const wasGrounded = grounded;
  demoStep();
  if (wasSoft && piece && piece.y === y0 + 1) dsoft++;   // 1歩ずつ落としてぁE��
  if (dropAnim) { ddrops++; finishDrop(); }
  else if (piece && wasGrounded) { dland++; lock(); }    // 自然着弾�E�ロチE��→ドロチE�EめEsimulate する�E�E
}
assert(ddrops > 0 && ddrops < dsteps, 'demo does not hard drop on every step (' + ddrops + ' drops in ' + dsteps + ' steps)');
assert(dsoft > 0, 'demo falls a few cells before hard dropping (' + dsoft + ' one-cell falls)');
assert(dland > 0, 'demo sometimes lands without a hard drop (' + dland + ' natural landings)');
assert(dsoft + ddrops + dland > dsteps / 4, 'demo keeps moving at a natural pace (' + dsoft + ' falls, ' + ddrops + ' drops, ' + dland + ' landings in ' + dsteps + ' steps)');
Math.random = rnd;

// 24h) 着地済みなら即ハ�EドドロチE�EしなぁE���E然着弾に任せる�E�E
demo = true;
fresh();
piece = { t: 'T', s: 0, x: 3, y: 18 };
ground();
assert(grounded === true, 'demo piece is grounded');
demoSoft = 0; demoWait = 0; demoBeat = 0; demoTarget = null;
demoStep();
assert(dropAnim === null, 'a grounded demo piece is not hard dropped immediately');
demo = false;
Math.random = rnd;
demo = false;

// 25) ゲームパッド！Eamepad API�E�E
assert(GP_DEAD === 0.35, 'gamepad stick deadzone');
assert(GP_MAP[0] === 'hard' && GP_MAP[1] === 'hold' && GP_MAP[2] === 'ccw' && GP_MAP[3] === 'cw', 'face buttons: hard/hold/ccw/cw');
assert(GP_MAP[5] === 'hard' && GP_MAP[6] === 'hold' && GP_MAP[7] === 'start' && GP_MAP[8] === 'start', 'shoulders and select unified to START');
assert(GP_MAP[9] === 'start' && GP_MAP[12] === 'cw', 'START and dpad-up mapped');
assert(GP_MAP[14] === undefined && GP_MAP[15] === undefined, 'dpad left/right handled as held direction, not edge press');
assert(/function pressDir\\(d\\)/.test(src), 'keyboard and gamepad share the DAS helpers');
assert(/gpPoll\\(\\)/.test(src), 'loop polls the gamepad every frame');
assert(/if\\(window\\.addEventListener\\)/.test(src), 'connect listeners guarded for non-browser runtimes');
assert(/dual-rumble/.test(src), 'dual-rumble vibration used');
assert(/id="gpstate"/.test(html), 'side panel shows the controller status');

const rumbles = [];
const fakePad = { id:'Test Pad', buttons:Array.from({length:17}, () => ({pressed:false, value:0})), axes:[0,0,0,0],
  vibrationActuator:{ playEffect:(t,o) => { rumbles.push(o); return true; } } };
Object.defineProperty(globalThis, 'navigator', { value:{ getGamepads:() => [null, fakePad] }, writable:true, configurable:true });

started = true; demo = false; idle = 0;
fresh();
gpPoll();
assert(gpPad === fakePad, 'first present pad is picked (null slot skipped)');
assert(gpName === 'Test Pad', 'pad name recorded');
assert(els.gpstate.textContent === 'Test Pad', 'status line shows the pad name');

// 押した瞬間だけ発火�E�押しっぱなしで連発しなぁE��E
piece = { t:'O', s:0, x:4, y:0 };
fakePad.buttons[0].pressed = true;
gpPoll(); finishDrop();
assert(grid[idx(19,4)] === 'O', 'A (✁E hard drops');
assert(rumbles.length === 1, 'hard drop rumbles the pad');
gpPoll(); gpPoll();
assert(grid.filter(v => v).length === 4, 'held button fires only once');

// 十字キー�E�押した瞬閁E歩、その後DAS/ARR で連発
fakePad.buttons[0].pressed = false;
fresh();
piece = { t:'O', s:0, x:4, y:10 };
gpPoll();
assert(piece.x === 4, 'no input, no move');
fakePad.buttons[14].pressed = true;
gpPoll();
assert(piece.x === 3, 'dpad left moves once on press');
assert(dasDir === -1, 'dpad sets the DAS direction');
last = 0;
for (let i = 1; i <= 12; i++) loop(i * 50);      // 600ms: DAS 170ms を趁E��て ARR 反復
assert(piece.x < 3, 'held dpad repeats through DAS/ARR (x=' + piece.x + ')');
fakePad.buttons[14].pressed = false;
gpPoll();
assert(dasDir === 0 && gpDir === 0, 'release stops the repeat');

// 左スチE��チE��のチE��ドゾーン
fresh();
piece = { t:'O', s:0, x:4, y:10 };
fakePad.axes[0] = -0.2;
gpPoll();
assert(piece.x === 4, 'stick inside the deadzone does not move');
fakePad.axes[0] = -0.9;
gpPoll();
assert(piece.x === 3, 'stick past the deadzone moves');
fakePad.axes[0] = 0;
fakePad.axes[1] = 0.9;
gpPoll();
assert(keys.down === true, 'stick down = soft drop held');
fakePad.axes[1] = 0;
gpPoll();
assert(keys.down === false, 'stick release clears soft drop');

// ホ�Eルド�ESTART�E�開始／�Eーズ�E�（連打�E1回ずつ�E�E
fresh();
const gpHeld = piece.t;
fakePad.buttons[1].pressed = true; gpPoll();
assert(hold === gpHeld, 'B (◁E holds');
fakePad.buttons[1].pressed = false;
fakePad.buttons[7].pressed = true; gpPoll();
assert(paused === true, 'R2 (mapped to START) pauses during play');
gpPoll();
assert(paused === true, 'held START does not toggle pause again');
fakePad.buttons[7].pressed = false; gpPoll();
fakePad.buttons[7].pressed = true; gpPoll();
assert(paused === false, 'START toggles pause again on the next press');
assert(html.indexOf('data-a="pause"') < 0, 'no PAUSE button on the pad');assert((html.match(/<button data-a=/g) || []).length === 8, 'pad has 8 action buttons + START (PAUSE removed)');
assert(html.indexOf("a==='pause'") < 0, 'no separate pause action left');
started = true; over = false; paused = false;
act('start');
assert(paused === true, 'START pauses during play');
act('start');
assert(paused === false, 'START unpauses');
over = true;
act('start');
assert(over === false && paused === false, 'START after game over starts a new game');
started = false;
act('start');
assert(started === true && paused === false, 'START when not started begins the game');

// 開始！ETART�E�とチE��停止
started = false; demo = false; idle = 0; piece = null;
fresh();
fakePad.buttons[9].pressed = true;
gpPoll();
assert(started === true && !!piece, 'START button starts the game');
started = true; demo = true; idle = 0;
score = 500;
fakePad.buttons[3].pressed = true;
gpPoll();
assert(demo === false, 'gamepad input stops the demo');
assert(score === 0, 'stopping the demo starts a clean game');

// 刁E��
fakePad.buttons[9].pressed = false;
Object.defineProperty(globalThis, 'navigator', { value:{ getGamepads:() => [null] }, writable:true, configurable:true });
gpPoll();
assert(gpPad === null && gpName === '', 'disconnect clears the pad');
assert(els.gpstate.textContent === '未接続', 'status line returns to 未接続');
const before = rumbles.length;
fresh();
piece = { t:'O', s:0, x:4, y:0 };
hardDrop(); finishDrop();
assert(rumbles.length === before, 'no rumble without a connected pad');

// 26) BGM�E�レベル5ごとに曲が変わめE
assert(BGM_LEVEL_STEP === 5, 'BGM_LEVEL_STEP = 5');
assert(BGM_TRACKS.length === 6, 'BGM has 6 tracks');
for (let lv = 1; lv <= 20; lv++) {
  const want = Math.floor((lv - 1) / BGM_LEVEL_STEP) % BGM_TRACKS.length;
  assert(bgmTrackForLevel(lv) === want, 'level ' + lv + ' -> ' + BGM_TRACKS[want].name);
}

// レベル6�E�E0行）到達で曲が変わる：小節の区刁E��まで征E��てから刁E��替える
started = true; demo = false; armed = false;
fresh();
bgmTrack = 0; bgmPending = 0; bgmBar = 0;
lines = 45; level = 5;
anim = { rows:[19], tsp:false };
finishAnim();
assert(level === 5 && bgmPending === 0, 'no switch while still level 5');
lines = 49; level = 5;
anim = { rows:[19], tsp:false };
finishAnim();
assert(level === 6, 'reaching level 6 at 50 lines');
assert(bgmPending === 1 && bgmTrack === 0, 'switch is queued, not applied mid-bar');
assert(els.bgmname.textContent === 'Kalinka (切替待ち)', 'panel shows the queued track name right away');
assert(els.msg.textContent.indexOf('BGM: Kalinka') >= 0, 'switch announced in the message');

// 小節終わりに到達したら実際に刁E��替わる�E�音源�Eスタブ！E
actx = { currentTime:0, destination:{},
  createOscillator:() => ({ type:'', frequency:{value:0, setValueAtTime:noop, linearRampToValueAtTime:noop, exponentialRampToValueAtTime:noop}, connect:noop, start:noop, stop:noop }),
  createGain:() => ({ gain:{value:0, setValueAtTime:noop, linearRampToValueAtTime:noop, exponentialRampToValueAtTime:noop}, connect:noop, disconnect:noop }),
  createBiquadFilter:() => ({ type:'', frequency:{value:0}, Q:{value:0}, connect:noop, disconnect:noop }) };
fmVoice = () => {};
bgmPlaying = true; bgmGain = { disconnect:noop }; bgmBar = 0; bgmNext = 0;
bgmTick();
assert(bgmTrack === 1, 'the track actually changes at the bar boundary');
assert(bgmBar === 0, 'the new track restarts from its bar 0');
assert(els.bgmname.textContent === 'Kalinka', 'name follows the playing track');
bgmPlaying = false; bgmGain = null; bgmPending = 0; actx = null;

// 小節の長さ（拍孁Ex 4 = 16刁E��符の数�E�が曲ごとに正しいこと
BGM_TRACKS.forEach(tr => {
  const span = (tr.meter || 2) * 4;
  tr.bars.forEach((b, i) => assert(b.slice(0, b.length - 1).reduce((a, e) => a + e[1], 0) === span,
    tr.name + ' bar ' + (i + 1) + ' is ' + span + ' sixteenths'));
});

// 26b) 編曲レイヤー�E�旋律だけでなく和音・アルペジオ・ハモリ・打物を持つ
assert(/const BGM_MIX=\{mel:[^}]*\}/.test(html), 'BGM mix declares melody/pad/arp/harm/drum layers');
assert(/function chordOf/.test(html) && /function padVoice/.test(html) && /function drumVoice/.test(html),
  'arrangement voices exist (chord builder + pad + drums)');
assert(html.indexOf('arrangeBar(tr,bar,t,u,span)') >= 0, 'bgmTick calls the arrangement layer for every bar');
assert(/createDelay/.test(html), 'BGM bus has a feedback-delay reverb (guarded for contexts without it)');
assert(/createDynamicsCompressor/.test(html), 'BGM bus is compressed so the extra layers do not clip');
assert(BGM_TRACKS.every(t => t.style && t.mode && t.lead), 'every track declares its arrangement (style/mode/lead)');
assert(chordOf({mode:'m'},40).join(',') === '40,43,47', 'minor chord = root + minor third + fifth');
assert(chordOf({mode:'M'},40).join(',') === '40,44,47', 'major chord = root + major third + fifth');
assert(chordOf({mode:'m'},0).length === 0, 'a bar with no bass note gets no chord');

// 27) 狭ぁE��面�E�EPhone 17 Pro�E�で右カラム�E�Eold/スコア等）が刁E��なぁE
assert(/\.game\{[^}]*flex-wrap:wrap/.test(html), 'the game wraps instead of clipping on narrow screens');
assert(/canvas\{[^}]*max-width:100%/.test(html), 'canvas never exceeds its column');
assert(/\.game\{[^}]*max-width:100%/.test(html), 'the game never exceeds the viewport width');
assert(/@media\\(max-width:720px\\)/.test(html), 'narrow-screen layout present');
assert(/class="box stats"/.test(html) && /class="box keys kbdbox"/.test(html), 'side boxes are addressable (stats / keyboard hints)');
assert(/\.info\{display:none\}/.test(html), 'keyboard hints / BGM panel (.info) are hidden on phones');
assert(html.indexOf('<div class="info">') < html.indexOf('class="box keys kbdbox"'), 'help panels live outside .game so they do not shrink the playfield on PC');
assert(/function fitGame\(\)/.test(src), 'fitGame() fits the game to the screen');
assert(/function isPC\(\)/.test(src), 'fitGame() doubles the display on a PC (desktop)');

// iPhone 17 Pro の論理ビューポ�EチE402x874�E�縦積みで全体が収まる画面に縮小がかかめE
window.innerWidth = 402; window.innerHeight = 874;
gameStub.offsetWidth = 260; gameStub.offsetHeight = 950;
fitGame();
const z = parseFloat(gameStub.style.zoom);
assert(z > 0 && z < 1, 'fitGame scales the game to fit 402x874 (zoom=' + z + ')');
assert(Math.abs(z - Math.min(1, (402 - 16) / 260, (874 - 16) / 950)) < 1e-3, 'fitGame uses the tighter of width/height');

// 横置き！Eandscape 874x402�E�でも収まめE
window.innerWidth = 874; window.innerHeight = 402;
gameStub.offsetWidth = 444; gameStub.offsetHeight = 640;
fitGame();
assert(Math.abs(parseFloat(gameStub.style.zoom) - Math.min(1, (874 - 16) / 444, (402 - 16) / 640)) < 1e-3, 'landscape also fits (zoom=' + gameStub.style.zoom + ')');

// チE��クトップ（パソコン�E��E表示2倍。収まらなぁE�Eだけ縮封E
window.matchMedia = (q) => ({ matches: false });   // マウス操作�EPC�E�Eointer:coarse ではなぁE��E
window.innerWidth = 1440; window.innerHeight = 1300;
gameStub.offsetWidth = 444; gameStub.offsetHeight = 640;
fitGame();
assert(parseFloat(gameStub.style.zoom) === 2, 'PC screen is displayed at 2x (zoom=' + gameStub.style.zoom + ')');

// matchMedia が無ぁE��墁E��も庁E��画面は2倁E
window.matchMedia = undefined;
window.innerWidth = 1440; window.innerHeight = 1300;
fitGame();
assert(parseFloat(gameStub.style.zoom) === 2, 'wide screen without matchMedia is doubled (zoom=' + gameStub.style.zoom + ')');

// 2倍が収まらなぁE��面は収まるまで縮封E
window.innerWidth = 1440; window.innerHeight = 900;
fitGame();
assert(Math.abs(parseFloat(gameStub.style.zoom) - Math.min(2, (1440 - 16) / 444, (900 - 16) / 640)) < 1e-3, 'PC caps at 2x and fits the screen (zoom=' + gameStub.style.zoom + ')');

// 主入力がタチE��の端末�E�タブレチE��等）�E拡大しなぁE
window.matchMedia = (q) => ({ matches: /pointer:coarse/.test(q) });
window.innerWidth = 1440; window.innerHeight = 1300;
fitGame();
assert(parseFloat(gameStub.style.zoom) === 1, 'touch devices are not upscaled (zoom=' + gameStub.style.zoom + ')');

// 720px以下�E画面はパソコン扱ぁE��なぁE
window.innerWidth = 402; window.innerHeight = 874;
fitGame();
assert(parseFloat(gameStub.style.zoom) < 1, 'narrow screens are shrunk, not doubled (zoom=' + gameStub.style.zoom + ')');

// ブラウザ以外（ビューポ�Eト寸法が取れなぁE��墁E��では何もしなぁE
window.innerWidth = 0; window.innerHeight = 0;
fitGame();
assert(true, 'fitGame is safe without a browser viewport');
`;

eval(src + test);
console.log(fails === 0 ? '\nALL TESTS PASSED' : '\n' + fails + ' TEST(S) FAILED');
process.exit(fails === 0 ? 0 : 1);

