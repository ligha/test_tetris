// 任意URLを node fetch で取得し、リンク（href）または本文のabcブロックを表示する
const UA={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'};
(async()=>{
  for(const u of process.argv.slice(2)){
    try{
      const r=await fetch(u,{headers:UA});
      const t=await r.text();
      const abc=t.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i)||t.match(/(X:\d[\s\S]{0,1200})/);
      if(abc){console.log('--- '+u);console.log(abc[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim());continue;}
      const links=[...t.matchAll(/href="([^"]+)"/g)].map(x=>x[1]).filter(x=>!/^(#|mailto|\/$)/.test(x));
      console.log('--- '+u+' ('+r.status+') '+links.slice(0,25).join(' ; '));
    }catch(e){console.log('ERR '+u+' '+e.message);}
    await new Promise(r=>setTimeout(r,400));
  }
})();
