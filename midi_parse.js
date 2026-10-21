'use strict';
// Minimal MIDI (format 0/1) parser: prints note-on events as note name + duration in eighth notes.
const fs = require('fs');
const file = process.argv[2];
const b = fs.readFileSync(file);
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function vlq(i){let v=0;while(true){const c=b[i++];v=(v<<7)|(c&0x7f);if(!(c&0x80))break;}return [v,i];}
if (b.toString('ascii',0,4)!=='MThd') { console.log('not midi'); process.exit(1); }
const ntrk = b.readUInt32BE(10);
const tpq = b.readUInt32BE(12);
let p = 14;
const events = [];
for (let t = 0; t < ntrk; t++) {
  if (b.toString('ascii',p,p+4)!=='MTrk') break;
  const len = b.readUInt32BE(p+4); p += 8;
  const end = p + len;
  let tick = 0, running = 0;
  while (p < end) {
    let [d, q] = vlq(p); p = q; tick += d;
    let status = b[p++];
    if (status < 0x80) { status = running; p--; } // running status: re-read
    else { running = status; }
    if (status === 0xFF) {
      const type = b[p++]; const [l, q2] = vlq(p); p = q2; p += l; continue;
    }
    if (status === 0xF0 || status === 0xF7) {
      const [l, q2] = vlq(p); p = q2 + l; continue;
    }
    const hi = status & 0xF0;
    if (hi === 0x90 || hi === 0x80) {
      const note = b[p++]; const vel = b[p++];
      if (hi === 0x90 && vel > 0) events.push({track:t, tick, note, on:true});
      else if (hi === 0x90 && vel === 0) events.push({track:t, tick, note, on:false}); // velocity-0 note-on = note-off
      else if (hi === 0x80) events.push({track:t, tick, note, on:false});
    } else if (hi === 0xA0 || hi === 0xB0 || hi === 0xE0) {
      p += 2;
    } else if (hi === 0xC0 || hi === 0xD0) {
      p += 1;
    } else { p += 1; }
  }
}
events.sort((a,b2)=>a.track-b2.track||a.tick-b2.tick);
if (process.argv[3] === 'raw') { events.slice(0,25).forEach(e=>console.log('RAW', e.track, e.tick, e.note, e.on)); process.exit(0); }
if (process.argv[3] === 'trace') {
  let p2 = 14, tick2 = 0, running2 = 0, n = 0;
  p2 = 14 + 8 + b.readUInt32BE(18) + 8; // skip track 0 header+data
  while (p2 < b.length && n < 25) {
    const start = p2;
    let [d, q] = vlq(p2); p2 = q; tick2 += d;
    const status = b[p2++];
    console.log('pos=' + start, 'delta=' + d, 'status=' + status.toString(16), 'tick=' + tick2);
    if (status < 0x80) { running2 = running2; p2--; }
    else running2 = status;
    const st = status < 0x80 ? running2 : status;
    if (st === 0xFF) { const ty = b[p2++]; const [l, q2] = vlq(p2); p2 = q2 + l; }
    else { p2 += 2; }
    n++;
  }
  process.exit(0);
}
// for each note-on, find matching note-off in same track
const offs = {};
for (const e of events) {
  if (!e.on) { const k = e.track + ':' + e.note; if (!offs[k]) offs[k] = []; offs[k].push(e.tick); }
}
const ptr = {};
for (const e of events) {
  if (!e.on) continue;
  const k = e.track + ':' + e.note;
  const arr = offs[k] || [];
  const i = ptr[k] || 0;
  const end = i < arr.length ? arr[i] : e.tick;
  ptr[k] = i + 1;
  const dur = end - e.tick;
  if (dur > 0) console.log(`T${e.track} ${NAMES[e.note%12]}${Math.floor(e.note/12)-1} tick=${e.tick} dur=${dur}`);
}
