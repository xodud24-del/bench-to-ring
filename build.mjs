import {minify} from 'terser';import fs from 'fs';
const [src,out]=process.argv.slice(2);let h=fs.readFileSync(src,'utf8');
const re=/<script([^>]*)>([\s\S]*?)<\/script>/g;let res='',last=0,m;
while((m=re.exec(h))){res+=h.slice(last,m.index);if(/type="(importmap|application)/.test(m[1])){res+=m[0];last=re.lastIndex;continue}const r=await minify(m[2],{compress:{passes:2},mangle:true,format:{comments:false}});res+=`<script${m[1]}>${r.code}</script>`;last=re.lastIndex}
res+=h.slice(last);
res=res.replace(/<!--[\s\S]*?-->/g,'');
fs.writeFileSync(out,res);console.log(h.length,'->',res.length)
