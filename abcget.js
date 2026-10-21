// abcnotation の tune ページを node fetch で取得し、abc 本文を表示する
const UA={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'};
(async()=>{
  for(const u of process.argv.slice(2)){
    try{
      const r=await fetch('https://abcnotation.com'+u,{headers:UA});
      const t=await r.text();
      const m=t.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i)||t.match(/(X:\d[\s\S]{0,1500})/);
      if(!m){
        const plain=t.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        console.log('--- '+u+' : no abc block (status '+r.status+') :: '+plain.slice(0,400));
        continue;
      }
      console.log('--- '+u);
      console.log(m[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim());
    }catch(e){console.log('ERR '+u+' '+e.message);}
    await new Promise(r=>setTimeout(r,400));
  }
})();
