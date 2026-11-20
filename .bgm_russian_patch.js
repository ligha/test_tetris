// .bgm_russian_patch.js
// tetris_qwen3.8flash_next.html の BGM エンジンに適用する拡張パッチ。
// 目的: 3/4 拍（ワルツ）とトラック別テンポを現行エンジンで扱えるようにする。
// 現行前提: BGM_UNIT = 16分音符, 小節 = 8こ (= 2/4), BGM_BPM はグローバル固定。

// ---- 1) トラックスキーマ拡張 --------------------------------------------
// { name, meter: 2|3, bpm, bars: [ [ [pitch,len], ... ], ... ], bass: [ ... ] }
//   meter = 小節の四分音符数。小節の 16分音符数 = meter * 4。
//   bass  = 小節末のベース音（bars と同じ長さ）。
function makeTrack(name, meter, bpm, bars, bass) {
  if (bars.length !== bass.length) throw new Error(`${name}: bars/bass length mismatch`);
  bars.forEach((bar, i) => {
    const sum = bar.reduce((s, ev) => s + ev[1], 0);
    if (sum !== meter * 4) {
      throw new Error(`${name}: bar ${i} sums to ${sum} sixteenths, expected ${meter * 4}`);
    }
  });
  return { name, meter, bpm, bars, bass };
}

// 16分音符の秒数（トラック別テンポ）
function unitSeconds(track, fallbackBpm) {
  return 60 / (track.bpm || fallbackBpm) / 4;
}

// ---- 2) bgmTick() 差分 ---------------------------------------------------
// 現行:
//   const bar = BGM_TRACKS[bgmTrack].bars[bgmBar];
//   const unit = BGM_UNIT;
// 変更後:
//   const track = BGM_TRACKS[bgmTrack];
//   const bar = track.bars[bgmBar];
//   const unit = unitSeconds(track, BGM_BPM);
//   ...
//   if (evIdx >= bar.length) { bgmBar = (bgmBar + 1) % track.bars.length; evIdx = 0; }

// ---- 3) レベル→トラック割当（5曲ローテーション） ------------------------
// 現行: 1-5 Korobeiniki / 6-10 Kalinka / 11-15 Korobeiniki / 16-20 ...
// 変更後: 5レベルごとに BGM_TRACKS を順に周回。
function bgmTrackForLevel(level, tracks) {
  return Math.max(0, Math.floor((level - 1) / 5)) % tracks.length;
}

// ---- self test -------------------------------------------------------------
function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exitCode = 1; }
  else console.log(`ok: ${msg}`);
}

// 2/4 の既知トラック（Korobeiniki 1小節分）
const t24 = makeTrack('Korobeiniki', 2, 140,
  [[[69,1],[65,1],[69,1],[68,1],[67,1],[65,1],[63,2]]],
  [62]);
// 3/4 のワルツ（12こ = 3/4）
const t34 = makeTrack('Waltz', 3, 120,
  [[[69,3],[65,3],[68,3],[67,3]]],
  [69]);

assert(unitSeconds(t24, 140) === 60/140/4, '2/4 track uses its own bpm');
assert(unitSeconds(t34, 140) === 60/120/4, '3/4 track uses its own bpm (120)');
assert(t34.bars[0].reduce((s,e)=>s+e[1],0) === 12, 'waltz bar = 12 sixteenths');

// 悪い小節長はエラーになる
let threw = false;
try { makeTrack('Bad', 3, 120, [[[69,3],[65,3],[68,3],[66,2]]], [69]); }
catch (e) { threw = true; }
assert(threw, 'bar length mismatch is rejected');

// 5曲ローテーション
const names = ['Korobeiniki','Kamarinskaya','TriNedeli','AmurWaves','Kalinka'];
assert(bgmTrackForLevel(1, names) === 0 && bgmTrackForLevel(5, names) === 0, 'levels 1-5 -> track 0');
assert(bgmTrackForLevel(6, names) === 1 && bgmTrackForLevel(10, names) === 1, 'levels 6-10 -> track 1');
assert(bgmTrackForLevel(11, names) === 2, 'level 11 -> track 2');
assert(bgmTrackForLevel(16, names) === 3, 'level 16 -> track 3');
assert(bgmTrackForLevel(21, names) === 4, 'level 21 -> track 4');
assert(bgmTrackForLevel(26, names) === 0, 'level 26 wraps back to track 0');
