// BitMidi 検索（シェル/node から直接取得できる）＋ abcnotation の到達性テスト
const NAMES=['katyusha','troika','lezginka','yablochko','ogniki','svetit mesyats','valenki','beryoza','smuglyanka','kamarinskaya','amur waves','molodets','nedelya'];
(async()=>{
  for(const n of NAMES){
    try{
      const r=await fetch('https://bitmidi.com/search?q='+encodeURIComponent(n),{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'}});
      const t=await r.text();
      const m=[...t.matchAll(/href="(\/[a-z0-9\-]+)"/g)].map(x=>x[1]).filter(x=>!['/random','/about','/search','/'].includes(x));
      console.log(n+' | '+m.length+' | '+m.slice(0,3).join(' ; '));
    }catch(e){console.log(n+' ERR '+e.message);}
    await new Promise(r=>setTimeout(r,250));
  }
  try{const r=await fetch('https://abcnotation.com/searchTunes?q=katyusha',{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'}});console.log('abcnotation '+r.status);}catch(e){console.log('abc ERR '+e.message);}
})();
