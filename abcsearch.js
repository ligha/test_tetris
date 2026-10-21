// abcnotation 検索（node fetch は 403 にならない）
const NAMES=process.argv.slice(2);
(async()=>{
  for(const n of NAMES){
    try{
      const r=await fetch('https://abcnotation.com/searchTunes?q='+encodeURIComponent(n),{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'}});
      const t=await r.text();
      const m=[...t.matchAll(/href="(\/tunePage\?a=[^"]+)"/g)].map(x=>x[1]);
      console.log(n+' | '+m.length+' | '+m.slice(0,3).join(' ; '));
    }catch(e){console.log(n+' ERR '+e.message);}
    await new Promise(r=>setTimeout(r,300));
  }
})();
