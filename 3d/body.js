/* 매끈한 농구 선수 몸을 Mixamo 뼈대 위에 직접 만들어 입힘 (관절 이음새 없음) */
import * as THREE from 'three';
const V=(x,y,z)=>new THREE.Vector3(x,y,z),sm=(a,b,t)=>{t=Math.min(1,Math.max(0,(t-a)/(b-a)));return t*t*(3-2*t)};
function mkSkel(skel,lk,lift){
  const objs={},root=new THREE.Group(),bones=[];
  for(const s of skel){const o=s.b?new THREE.Bone():new THREE.Object3D();o.name=s.n;o.position.fromArray(s.t);o.quaternion.fromArray(s.q);o.scale.fromArray(s.s);
    if(/^(Left|Right)(Leg|Foot)$/.test(s.n))o.position.multiplyScalar(lk);if(!s.p)o.position.y+=lift;objs[s.n]=o;if(s.b)bones.push(o)}
  for(const s of skel)(s.p?objs[s.p]:root).add(objs[s.n]);
  root.updateMatrixWorld(true);const W={};for(const b of bones)W[b.name]=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
  return {root,bones,objs,W,idx:Object.fromEntries(bones.map((b,i)=>[b.name,i]))}}
/* opt.leg: 다리 길이 배율. 몸은 원래 비율로 만든 뒤 다리만 늘리고 상체를 그만큼 올림 */
export function buildSkeleton(skel,opt={}){const lk=opt.leg||1,W0=mkSkel(skel,1,0).W,hip=W0.LeftUpLeg.y,lift=hip*(lk-1);
  const S=mkSkel(skel,lk,lift);S.W0=W0;S.remap=y=>y>=hip?y+lift:hip+lift-(hip-y)*lk;return S}
class G{constructor(){this.p=[];this.c=[];this.si=[];this.sw=[];this.ix=[];this.uv=[]}
  v(p,c,w,uv){/* w: [[boneIdx,weight],...] */const n=this.p.length/3;this.p.push(p.x,p.y,p.z);this.c.push(c.r,c.g,c.b);const ww=w.slice(0,4);while(ww.length<4)ww.push([0,0]);const t=ww.reduce((a,b)=>a+b[1],0)||1;ww.forEach(([i,x])=>{this.si.push(i);this.sw.push(x/t)});this.uv.push(uv?uv[0]:0,uv?uv[1]:0);return n}
  t(a,b,c){this.ix.push(a,b,c)}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(this.si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(this.sw,4));g.setIndex(this.ix);g.computeVertexNormals();return g}}
/* loft a tube through key points; each key: {p, rx, rz, b(bone idx), c(color fn y->Color)} */
function loft(g,keys,{seg=12,sub=5,up=V(0,0,1),capA=true,capB=true,colorAt,uvTorso=false}={}){
  const rings=[];const tot=keys.length-1;
  for(let i=0;i<tot;i++){const A=keys[i],B=keys[i+1];const N=i===tot-1?sub+1:sub;
    for(let j=0;j<N;j++){const t=j/sub,p=A.p.clone().lerp(B.p,t),rx=A.rx+(B.rx-A.rx)*t,rz=A.rz+(B.rz-A.rz)*t;
      const w=[[A.b,1]];const sB=sm(.55,1,t)*.5;if(sB>0){w[0][1]-=sB;w.push([B.b,sB])}
      if(i>0){const sP=(1-sm(0,.45,t))*.5;if(sP>0){w[0][1]-=sP;w.push([keys[i-1].b,sP])}}
      if(t>=1-1e-6){w.length=0;w.push([B.b,.5],[A.b,.5])}
      const mu=A.mu?1+A.mu[0]*Math.exp(-Math.pow((t-A.mu[1])/A.mu[2],2)):1;rings.push({p,rx:rx*mu,rz:rz*mu,w,d:B.p.clone().sub(A.p).normalize(),f:(i+t)/tot,pf:(A.pf||0)*(1-t)+(B.pf||0)*t})}}
  const base=[];
  rings.forEach((r,k)=>{const d=r.d;let u=up.clone().sub(d.clone().multiplyScalar(up.dot(d)));if(u.lengthSq()<1e-4)u=V(1,0,0);u.normalize();const s=new THREE.Vector3().crossVectors(d,u).normalize();
    base.push(g.p.length/3);for(let a=0;a<=seg;a++){const th=a/seg*Math.PI*2;const fb=r.pf?1+r.pf*Math.pow(Math.max(0,Math.sin(th)),3)*(1-.6*Math.pow(Math.cos(th*2),2)):1;const off=s.clone().multiplyScalar(Math.cos(th)*r.rx).add(u.clone().multiplyScalar(Math.sin(th)*r.rz*fb));const P=r.p.clone().add(off);g.v(P,colorAt(P,r,th),r.w,[a/seg,r.f])}});
  for(let k=0;k<rings.length-1;k++)for(let a=0;a<seg;a++){const i0=base[k]+a,i1=base[k+1]+a;g.t(i0,i1,i0+1);g.t(i0+1,i1,i1+1)}
  const cap=(k,flip)=>{const r=rings[k];const c=g.v(r.p,colorAt(r.p,r,0),r.w,[.5,r.f]);for(let a=0;a<seg;a++){const i0=base[k]+a;flip?g.t(c,i0+1,i0):g.t(c,i0,i0+1)}};
  if(capA)cap(0,false);if(capB)cap(rings.length-1,true)}
function ellip(g,c,rx,ry,rz,w,col,{seg=14,rs=10,cut=null,colorAt=null}={}){const base=g.p.length/3;
  for(let i=0;i<=rs;i++){const ph=i/rs*Math.PI;for(let j=0;j<=seg;j++){const th=j/seg*Math.PI*2;const P=V(c.x+Math.sin(ph)*Math.cos(th)*rx,c.y+Math.cos(ph)*ry,c.z+Math.sin(ph)*Math.sin(th)*rz);if(cut)cut(P,ph,th);g.v(P,colorAt?colorAt(P,ph,th):col,w)}}
  for(let i=0;i<rs;i++)for(let j=0;j<seg;j++){const a=base+i*(seg+1)+j,b=a+seg+1;g.t(a,a+1,b);g.t(a+1,b+1,b)}}
const C=v=>new THREE.Color(v);
function addHair(g,o,I,cHr,cSk){const hw=[[I.Head,1]];
  const H=o.hair;
  if(H!==6){const big=H===3?1.420:H===4?1.090:1,th=H===2||H===7?.006:H===8?.014:.024;
    const cap=(P,ph)=>{};ellip(g,V(0,1.7+(big-1)*.05,.0),(.09+th)*big,(.115+th)*big,(.103+th)*big,hw,cHr,{seg:16,rs:10,cut:(P,ph,th2)=>{const front=P.z>.04&&P.y<1.735,low=P.y<(H===4||H===5?1.6:1.675);if(front&&H!==3)P.y=Math.max(P.y,1.735+(H===0?.01:0));if(low&&!(H===4))P.y=Math.max(P.y,H===3?1.610:1.675);if(H===1&&Math.abs(P.x)>.07&&P.y<1.710){P.x*=.97}}});
    if(H===0)for(let i=0;i<7;i++){const a=i/6*Math.PI-Math.PI/2;ellip(g,V(Math.sin(a)*.07,1.770,Math.cos(a)*.05+.02),.025,.035,.025,hw,cHr,{seg:6,rs:4})}
    if(H===4)for(let i=0;i<10;i++){const a=Math.PI*.15+i/9*Math.PI*1.7;loft(g,[{p:V(Math.cos(a)*.1,1.690,-Math.abs(Math.sin(a))*.08-.01),rx:.013,rz:.013,b:I.Head},{p:V(Math.cos(a)*.13,1.5,-Math.abs(Math.sin(a))*.11-.03),rx:.011,rz:.011,b:I.Head}],{seg:6,sub:2,colorAt:()=>cHr})}
    if(H===5)ellip(g,V(0,1.760,-.09),.045,.045,.045,hw,cHr,{seg:10,rs:8});
    if(H===8)for(let i=0;i<5;i++){const x=(i-2)*.032;loft(g,[{p:V(x,1.760,.07),rx:.011,rz:.011,b:I.Head},{p:V(x,1.780,-.02),rx:.011,rz:.011,b:I.Head},{p:V(x*1.1,1.7,-.1),rx:.011,rz:.011,b:I.Head}],{seg:6,sub:3,colorAt:()=>cHr.clone().multiplyScalar(.75)})}}
  if(o.beard===3||o.beard===5)ellip(g,V(0,1.625,.1),.03,.008,.012,hw,cHr,{seg:8,rs:4});
  if(o.beard===1)ellip(g,V(0,1.590,.05),.075,.05,.06,hw,cSk.clone().lerp(cHr,.35),{seg:12,rs:6,cut:(P)=>{if(P.y>1.610)P.y=1.610}});
  if(o.band)loft(g,[{p:V(-.001,1.705,.0),rx:.1,rz:.112,b:I.Head},{p:V(0,1.725,.0),rx:.1,rz:.112,b:I.Head}],{seg:16,sub:1,up:V(0,0,1),colorAt:()=>C(o.bandc||'#ffffff'),capA:false,capB:false});
}
export function buildBody(S,o){
  const W=S.W0||S.W,I=S.idx,g=new G(),gt=new G();const cSk=C(o.skin),cJ=C(o.jersey),cSh=C(o.shorts),cT=C(o.trim),cW=C('#f3f3f3'),cShoe=C(o.shoe||'#f3f3f3'),cHr=C(o.hairc),cDk=C('#1a1410');
  const sk=k=>W[k];const bw=o.bulk||1,mm=Math.max(0,(o.bulk||1)-.9)*1.6+.12;
  /* torso (textured: jersey + number) */
  const tY=(y)=>y;
  const torsoKeys=[{p:V(0,.9,.02),rx:.13*bw,rz:.1,b:I.Hips},{p:sk('Hips').clone().setY(.99),rx:.132*bw,rz:.1,b:I.Hips},{p:sk('Spine'),rx:.13*bw,rz:.095,b:I.Spine},{p:sk('Spine1'),rx:.155*bw,rz:.105,b:I.Spine1,pf:mm*.35},{p:sk('Spine2'),rx:.19*bw,rz:.118,b:I.Spine2,pf:mm*.9},{p:V(0,1.455,-.02),rx:.2*bw,rz:.1,b:I.Spine2,pf:mm*.3},{p:V(0,1.495,-.025),rx:.11,rz:.075,b:I.Neck},{p:V(0,1.515,-.025),rx:.07,rz:.062,b:I.Neck}];
  loft(gt,torsoKeys,{seg:18,sub:4,up:V(0,0,1),capA:true,capB:false,colorAt:(P)=>C('#ffffff')});
  const hv0=g.p.length;
  /* neck & head */
  loft(g,[{p:V(0,1.440,-.025),rx:.066,rz:.062,b:I.Neck},{p:sk('Head').clone().add(V(0,-.005,0)),rx:.056,rz:.056,b:I.Head}],{seg:10,sub:3,capA:false,capB:false,colorAt:()=>cSk});
  const hc=V(0,1.655,.012);const hw=[[I.Head,1]];
  ellip(g,hc,.088,.112,.1,hw,cSk,{colorAt:(P)=>P.y<hc.y-.02&&o.beard>=2&&P.z>hc.z-.03?(o.beard===3&&P.y<hc.y-.06?cSk:cHr):cSk,cut:(P)=>{if(P.y<hc.y-.05){P.x*=.82;P.z=hc.z+(P.z-hc.z)*.9}}});
  /* face: nose, eyes, ears */
  ellip(g,V(0,1.645,.112),.014,.022,.018,hw,cSk.clone().multiplyScalar(.93),{seg:8,rs:6});
  for(const sx of [-1,1]){ellip(g,V(sx*.033,1.675,.097),.012,.008,.006,hw,cDk,{seg:8,rs:5});ellip(g,V(sx*.09,1.660,.0),.016,.028,.012,hw,cSk.clone().multiplyScalar(.95),{seg:8,rs:6})}
  ellip(g,V(0,1.608,.098),.022,.005,.006,hw,C('#7a3b32'),{seg:8,rs:4});
  /* hair */
  addHair(g,o,I,cHr,cSk);
  {/* 머리 크기 줄이기 (목 위쪽만 부드럽게) */const hs=o.head||.86;for(let i=hv0;i<g.p.length;i+=3){const y=g.p[i+1],f=1-(1-hs)*sm(1.5,1.6,y);g.p[i]*=f;g.p[i+1]=1.55+(y-1.55)*f;g.p[i+2]=.0+(g.p[i+2])*f}}
  /* arms */
  for(const s of ['Left','Right']){const sx=s==='Left'?1:-1;const arm=[{p:V(sx*.12,1.43,-.03),rx:.066,rz:.066,b:I[s+'Shoulder'],mu:[mm*.9,.85,.3]},{p:sk(s+'Arm'),rx:.058*bw,rz:.056*bw,b:I[s+'Arm'],mu:[mm*1.1,.4,.22]},{p:sk(s+'ForeArm'),rx:.042,rz:.042,b:I[s+'ForeArm'],mu:[mm*.7,.22,.2]},{p:sk(s+'Hand'),rx:.03,rz:.026,b:I[s+'Hand']},{p:sk(s+'Hand').clone().add(V(sx*.025,0,0)),rx:.026,rz:.032,b:I[s+'Hand']}];
    loft(g,arm,{seg:10,sub:4,up:V(0,1,0),colorAt:(P)=>o.sleeve&&Math.abs(P.x)>.38&&Math.abs(P.x)<.46?C(o.sleeve):cSk});
    {const hp=sk(s+'Hand'),hw2=[[I[s+'Hand'],1]];/* 손바닥 + 손가락 + 엄지 */
     ellip(g,hp.clone().add(V(sx*.06,-.004,0)),.055,.022,.042,hw2,cSk,{seg:10,rs:7});
     ellip(g,hp.clone().add(V(sx*.115,-.008,0)),.04,.017,.038,hw2,cSk,{seg:10,rs:6});
     ellip(g,hp.clone().add(V(sx*.045,-.012,.045)),.032,.014,.016,hw2,cSk,{seg:8,rs:5})}
    /* legs */
    const L=[{p:V(sx*.08,.96,.01),rx:.08*bw,rz:.085*bw,b:I[s+'UpLeg'],mu:[mm*.5,.45,.3]},{p:sk(s+'Leg'),rx:.05,rz:.054,b:I[s+'Leg'],mu:[mm*.9,.28,.18]},{p:sk(s+'Foot').clone().add(V(0,.06,0)),rx:.04,rz:.042,b:I[s+'Foot']},{p:sk(s+'Foot'),rx:.045,rz:.05,b:I[s+'Foot']}];
    loft(g,L,{seg:10,sub:4,up:V(0,0,1),colorAt:(P)=>P.y>.6?cSh:P.y<.2?(P.y<.12?cShoe:(o.socks?C(o.socks):cW)):(o.knee&&P.y>.44&&P.y<.56?C(o.knee):cSk)});
    if(o.sleeve)0;
    const sh=[{p:sk(s+'Foot').clone().add(V(0,-.02,-.06)),rx:.048,rz:.045,b:I[s+'Foot']},{p:sk(s+'ToeBase').clone().add(V(0,.02,0)),rx:.05,rz:.04,b:I[s+'ToeBase']},{p:sk(s+'ToeBase').clone().add(V(0,.02,.09)),rx:.035,rz:.03,b:I[s+'ToeBase']}];
    loft(g,sh,{seg:10,sub:3,up:V(0,1,0),colorAt:(P)=>P.y<.012?C('#2b2b2b'):cShoe})}
  /* shorts flare (skirt around thighs) */
  loft(g,[{p:V(0,1.0,.015),rx:.145*bw,rz:.112,b:I.Hips},{p:V(0,.84,.015),rx:.168*bw,rz:.122,b:I.Hips},{p:V(0,.68,.02),rx:.172*bw,rz:.115,b:I.Hips}],{seg:18,sub:3,up:V(0,0,1),capA:false,capB:false,colorAt:(P)=>Math.abs(P.y-.68)<.015||Math.abs(P.x)>.166*bw?cT:cSh});
  if(S.remap)for(const q of [g,gt])for(let i=1;i<q.p.length;i+=3)q.p[i]=S.remap(q.p[i]);
  return {geo:g.geo(),tgeo:gt.geo()}
}
export function jerseyTex(o){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');
  x.fillStyle=o.jersey;x.fillRect(0,0,512,256);
  /* torso uv: u around (0=+x side going toward +z? ), v bottom->top */
  x.fillStyle=o.shorts;x.fillRect(0,0,512,256*.2);x.fillStyle=o.trim;x.fillRect(0,256*.2-8,512,8);
  if(!o.mh)x.fillRect(0,256*.86,512,10);
  const num=String(o.num??'');x.font='900 64px Arial Black,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle=o.trim;x.fillStyle=o.numc||o.trim;
  for(const [u,s] of [[.25,1],[.75,.85]]){x.save();x.translate(u*512,256*.6);x.scale(-s,-1.15*s);x.strokeText(num,0,0);x.fillStyle=o.jersey;x.fillText(num,0,0);x.restore()}
  if(o.abbr){x.save();x.font='900 22px Arial,sans-serif';x.fillStyle=o.trim;x.translate(.25*512,256*.79);x.scale(-1,-1);x.fillText(o.abbr,0,0);x.restore()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;return t}
/* ===== 실제 사람 메시 (MakeHuman CC0 기본 몸, 우리 뼈대에 맞춰 미리 변환해 둔 human.bin) ===== */
export function parseHuman(buf){const dv=new DataView(buf),hl=dv.getUint32(0,true),H=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,hl)));let o=4+hl;const nV=H.nV,nT=H.nT;
  H.P=new Float32Array(buf,o,nV*3);o+=nV*12;H.dm=new Int16Array(buf,o,nV*3);o+=nV*6;H.df=new Int16Array(buf,o,nV*3);o+=nV*6;H.si=new Uint8Array(buf,o,nV*4);o+=nV*4;H.sw=new Uint8Array(buf,o,nV*4);o+=nV*4;H.ix=new Uint16Array(buf,o,nT*3);
  /* 부위 판별용: 몸통 가중치·팔 가중치 */const nm=H.names,isT=nm.map(n=>/^(Hips|Spine|Spine1|Spine2)$/.test(n)),isA=nm.map(n=>/(Arm|ForeArm|Hand)$/.test(n)),isS=nm.map(n=>/Shoulder$/.test(n)),isH=nm.map(n=>/^(Head|Neck)$/.test(n)),isL=nm.map(n=>/(UpLeg|Leg|Foot|ToeBase)$/.test(n));
  H.wT=new Float32Array(nV);H.wA=new Float32Array(nV);H.wS=new Float32Array(nV);H.wH=new Float32Array(nV);H.wL=new Float32Array(nV);
  for(let v=0;v<nV;v++)for(let k=0;k<4;k++){const b=H.si[v*4+k],w=H.sw[v*4+k]/255;if(isT[b])H.wT[v]+=w;if(isA[b])H.wA[v]+=w;if(isS[b])H.wS[v]+=w;if(isH[b])H.wH[v]+=w;if(isL[b])H.wL[v]+=w}
  /* 머리 크기·중심 (머리카락 맞춤용) */let mn=[9,9,9],mx=[-9,-9,-9];for(let v=0;v<nV;v++)if(H.wH[v]>.9&&H.P[v*3+1]>H.eyes[0][1]-.13)for(let c=0;c<3;c++){mn[c]=Math.min(mn[c],H.P[v*3+c]);mx[c]=Math.max(mx[c],H.P[v*3+c])}
  H.hc=[(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2];H.hr=[(mx[0]-mn[0])/2,(mx[1]-mn[1])/2,(mx[2]-mn[2])/2];return H}
export function buildBodyMH(S,o,H){
  const I=S.idx,nV=H.nV,cSk=C(o.skin),cJ=C(o.jersey),cSh=C(o.shorts),cT=C(o.trim),cW=C('#f3f3f3'),cShoe=C(o.shoe||'#f3f3f3'),cHr=C(o.hairc);
  const bulk=o.bulk||1,mus=Math.min(1.15,Math.max(.4,.95+(bulk-1)*2)),fat=Math.min(.45,Math.max(0,(bulk-1.12)*2));
  const P=new Float32Array(nV*3);for(let i=0;i<nV*3;i++)P[i]=H.P[i]+(H.dm[i]*mus+H.df[i]*fat)/1000;
  const map=H.names.map(n=>I[n]);const si=new Uint16Array(nV*4),sw=new Float32Array(nV*4);for(let i=0;i<nV*4;i++){si[i]=map[H.si[i]]||0;sw[i]=H.sw[i]/255}
  const ey=H.eyes[0][1],col=new Float32Array(nV*3);
  for(let v=0;v<nV;v++){const x=P[v*3],y=P[v*3+1],z=P[v*3+2],ax=Math.abs(x);let c=cSk;
    if(H.wL[v]>.3||H.wT[v]>.3){if(y<.115)c=y<.018?C('#2b2b2b'):cShoe;else if(y<.2&&H.wL[v]>.5)c=o.socks?C(o.socks):cW;else if(o.knee&&y>.44&&y<.56&&H.wL[v]>.5)c=C(o.knee);
      else if(y>.65&&y<1.0&&H.wA[v]<.2)c=cSh;else if(y>=1.0&&H.wT[v]+H.wS[v]>.55&&H.wA[v]<.25&&y<1.47&&!(ax>.16&&y>1.3))c=cJ}
    if(o.sleeve&&H.wA[v]>.5&&ax>.38&&ax<.46)c=C(o.sleeve);
    if(H.wH[v]>.8&&o.beard>=2&&y<ey-.045&&z>H.hc[2]-.01&&!(o.beard===3&&y<ey-.085))c=cHr;
    col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b}
  /* 남자 농구선수 체형으로: 골반은 좁게, 어깨·등은 넓게(역삼각형), 가슴 앞 볼록함은 납작하게 */
  for(let v=0;v<nV;v++){const i=v*3,y=P[i+1],t=H.wT[v]+H.wS[v]*.6;if(t<.05)continue;
    const hipK=sm(.78,.9,y)*(1-sm(1.08,1.18,y)),shK=sm(1.2,1.36,y)*(1-sm(1.47,1.52,y));P[i]*=1-.09*hipK*Math.min(1,H.wT[v]+H.wL[v])+.14*shK*Math.min(1,t);
    const wK=sm(.98,1.04,y)*(1-sm(1.12,1.2,y));P[i]*=1+.06*wK*Math.min(1,H.wT[v]);/* 허리를 일자로 */
    const chK=sm(1.08,1.18,y)*(1-sm(1.4,1.46,y))*Math.min(1,H.wT[v]+H.wS[v]);if(P[i+2]>.03&&chK>0){const zc=.072*(1-Math.min(1,Math.pow(P[i]/.2,2)))+.03;if(P[i+2]>zc)P[i+2]=zc+(P[i+2]-zc)*(1-.8*chK)}}/* 가슴은 납작하게 (남자 가슴) */
  for(let v=0;v<nV;v++){const i=v*3,y=P[i+1];if(H.wL[v]<.5||y<.5||y>.98)continue;const k=sm(.5,.6,y)*(1-sm(.9,.98,y)),x0=Math.sign(P[i])*.095,z0=.0;P[i]=x0+(P[i]-x0)*(1-.12*k);P[i+2]=z0+(P[i+2]-z0)*(1-.08*k)}/* 허벅지는 덜 굵게 */
  /* 옷 입은 부분(반바지·몸통)은 표면을 부드럽게 (Taubin 스무딩: 엉덩이 골·복근·가슴 굴곡을 옷처럼 매끈하게, 부피는 유지) */
  {const nb=Array.from({length:nV},()=>new Set());for(let t=0;t<H.ix.length;t+=3){const a=H.ix[t],c=H.ix[t+1],d=H.ix[t+2];nb[a].add(c).add(d);nb[c].add(a).add(d);nb[d].add(a).add(c)}
   const wgt=new Float32Array(nV);for(let v=0;v<nV;v++){const y=P[v*3+1];if(H.wA[v]>.35||H.wH[v]>.3)continue;wgt[v]=y>.66&&y<1.03?1:(y>=1.03&&y<1.42&&H.wT[v]+H.wS[v]>.5?.6:0)}
   const tmp=new Float32Array(nV*3);for(let it=0;it<56;it++){const lam=it%2?-.53:.5;for(let v=0;v<nV;v++){const i=v*3;const crotch=Math.abs(P[i])<.11&&P[i+1]>.7&&P[i+1]<.99;if(!wgt[v]||(it>=16&&!crotch)){tmp[i]=P[i];tmp[i+1]=P[i+1];tmp[i+2]=P[i+2];continue}let sx=0,sy=0,sz=0,n=0;for(const u of nb[v]){sx+=P[u*3];sy+=P[u*3+1];sz+=P[u*3+2];n++}const l=lam*wgt[v];tmp[i]=P[i]+(sx/n-P[i])*l;tmp[i+1]=P[i+1]+(sy/n-P[i+1])*l;tmp[i+2]=P[i+2]+(sz/n-P[i+2])*l}P.set(tmp)}}
  const g0=new THREE.BufferGeometry();g0.setAttribute('position',new THREE.BufferAttribute(P,3));g0.setIndex(new THREE.BufferAttribute(H.ix,1));g0.computeVertexNormals();const Nn=g0.attributes.normal.array;
  /* 팔·어깨 근육: 팔뚝·삼각근을 굵게 (남자 운동선수) */
  for(let v=0;v<nV;v++){const i=v*3,a=Math.min(1,H.wA[v]+H.wS[v]*.8)*(1-Math.min(1,H.wH[v]*2));if(a<.2)continue;const hand=Math.abs(P[i])>.66?Math.max(0,1-(Math.abs(P[i])-.66)/.06):1,o=.011*a*hand;P[i]+=Nn[i]*o;P[i+1]+=Nn[i+1]*o;P[i+2]+=Nn[i+2]*o}
  /* 반바지: 허벅지·엉덩이를 바깥으로 부풀려 헐렁한 농구 반바지처럼 (아래로 갈수록 더 넓게) */
  for(let v=0;v<nV;v++){const y=P[v*3+1];if(y<.65||y>1.02||H.wA[v]>.2||(H.wL[v]<.3&&H.wT[v]<.3))continue;const k=Math.min(1,Math.max(0,(1.02-y)/.38)),e=sm(.65,.69,y),off=(.011+.012*k)*e*(1+(bulk-1));
    P[v*3]+=Nn[v*3]*off;P[v*3+1]+=Nn[v*3+1]*off*.3;P[v*3+2]+=Nn[v*3+2]*off;if(Math.abs(P[v*3])<.075&&y>.74&&y<.95&&P[v*3+2]>.0)P[v*3+2]-=.012*(1-Math.abs(P[v*3])/.075)}
  /* 머리카락·눈: 기존 머리 기준(중심·반지름)으로 만든 뒤 이 몸의 실제 머리에 맞게 옮김 */
  const g=new G(),cHc=[0,1.655,.012],cHrad=[.088,.112,.1];addHair(g,o,I,cHr,cSk);
  const fitH=(i)=>{for(let c=0;c<3;c++)g.p[i+c]=H.hc[c]+(g.p[i+c]-cHc[c])*(H.hr[c]/cHrad[c])*(c===1?1:1.02)};for(let i=0;i<g.p.length;i+=3)fitH(i);
  const hw=[[I.Head,1]];for(const e of H.eyes){ellip(g,V(e[0],e[1],e[2]+.004),.0125,.0115,.0115,hw,C('#ece8e2'),{seg:10,rs:7});ellip(g,V(e[0],e[1],e[2]+.0145),.0058,.0058,.0025,hw,C('#1d1410'),{seg:8,rs:5})}
  /* 머리를 작게 (예전 비율처럼): 목 위쪽만 부드럽게 축소 */{const hs=o.head||.84,y0=H.eyes[0][1]-.17,y1=y0+.09,sh=(arr,i)=>{const y=arr[i+1],f=1-(1-hs)*sm(y0,y1,y);arr[i]*=f;arr[i+1]=y0+(y-y0)*f;arr[i+2]=H.hc[2]*(1-f)+arr[i+2]*f};for(let i=0;i<nV*3;i+=3)sh(P,i);for(let i=0;i<g.p.length;i+=3)sh(g.p,i)}
  /* 합치기 */const nG=g.p.length/3,N=nV+nG;const pos=new Float32Array(N*3),cc=new Float32Array(N*3),SI=new Uint16Array(N*4),SW=new Float32Array(N*4),uv=new Float32Array(N*2);
  pos.set(P);pos.set(g.p,nV*3);cc.set(col);cc.set(g.c,nV*3);SI.set(si);SI.set(g.si,nV*4);SW.set(sw);SW.set(g.sw,nV*4);
  const ix=new Uint32Array(H.ix.length+g.ix.length);ix.set(H.ix);for(let i=0;i<g.ix.length;i++)ix[H.ix.length+i]=g.ix[i]+nV;
  /* 저지 (등번호 텍스처): 몸통 면을 살짝 바깥으로 띄워 복제 */
  const isJ=v=>{const y=P[v*3+1],ax=Math.abs(P[v*3]);return y>.985&&y<1.47&&H.wT[v]+H.wS[v]>.55&&H.wA[v]<.25&&!(ax>.16&&y>1.3)};
  const jm=new Int32Array(nV).fill(-1),jp=[],ju=[],js=[],jw=[],jx=[];
  for(let t=0;t<H.ix.length;t+=3){const a=H.ix[t],b=H.ix[t+1],c=H.ix[t+2];if(!(isJ(a)&&isJ(b)&&isJ(c)))continue;
    for(const v of [a,b,c])if(jm[v]<0){jm[v]=jp.length/3;const off=.014;let jx_=P[v*3]+Nn[v*3]*off,jy_=P[v*3+1]+Nn[v*3+1]*off,jz_=P[v*3+2]+Nn[v*3+2]*off;{/* 저지는 가슴·등에서 아래로 곧게 늘어짐 */const f_=Math.max(0,1-Math.pow(jx_/.2,2)),dk=1-sm(1.25,1.35,jy_),ck=sm(1.12,1.2,jy_)*(1-sm(1.4,1.45,jy_));if(jz_>0)jz_=Math.max(jz_,(.1*f_+.01)*Math.max(dk,ck));else jz_=Math.min(jz_,-(.1*f_+.01)*dk)}jp.push(jx_,jy_,jz_);
      let u=Math.atan2(P[v*3+2],P[v*3])/(Math.PI*2);if(u<0)u+=1;ju.push(u,Math.min(1,Math.max(0,(P[v*3+1]-.9)/(1.44-.9))));for(let k=0;k<4;k++){js.push(si[v*4+k]);jw.push(sw[v*4+k])}}
    jx.push(jm[a],jm[b],jm[c])}
  /* 이음새(u=0/1) 넘어가는 삼각형은 u를 맞춰서 복제 */
  for(let t=0;t<jx.length;t+=3){const us=[0,1,2].map(k=>ju[jx[t+k]*2]);if(Math.max(...us)-Math.min(...us)>.5)for(let k=0;k<3;k++){const i=jx[t+k];if(ju[i*2]<.5){const n=jp.length/3;jp.push(jp[i*3],jp[i*3+1],jp[i*3+2]);ju.push(ju[i*2]+1,ju[i*2+1]);for(let q=0;q<4;q++){js.push(js[i*4+q]);jw.push(jw[i*4+q])}jx[t+k]=n}}}
  const gs=new G();
  /* 농구화 */const W=S.W0||S.W;for(const s of ['Left','Right']){const F=W[s+'Foot'],T=W[s+'ToeBase'];loft(gs,[{p:F.clone().add(V(0,-.03,-.075)),rx:.047,rz:.048,b:I[s+'Foot']},{p:F.clone().add(V(0,-.045,0)),rx:.052,rz:.05,b:I[s+'Foot']},{p:T.clone().add(V(0,.022,0)),rx:.05,rz:.038,b:I[s+'ToeBase']},{p:T.clone().add(V(0,.02,.085)),rx:.036,rz:.028,b:I[s+'ToeBase']}],{seg:12,sub:3,up:V(0,1,0),colorAt:(Pp)=>Pp.y<.012?C('#2b2b2b'):cShoe})}
  const all=new G();/* geo 생성기에 그대로 담기 */
  const mk=(p,c,si_,sw_,ix_,uv_)=>{const q=new THREE.BufferGeometry();if(S.remap)for(let i=1;i<p.length;i+=3)p[i]=S.remap(p[i]);q.setAttribute('position',new THREE.BufferAttribute(p,3));if(c)q.setAttribute('color',new THREE.BufferAttribute(c,3));q.setAttribute('uv',new THREE.BufferAttribute(uv_,2));q.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si_,4));q.setAttribute('skinWeight',new THREE.BufferAttribute(sw_,4));q.setIndex(new THREE.BufferAttribute(ix_,1));q.computeVertexNormals();return q};
  /* 플레어를 몸 지오메트리에 추가 */const nS=gs.p.length/3,N2=N+nS;const pos2=new Float32Array(N2*3),cc2=new Float32Array(N2*3),SI2=new Uint16Array(N2*4),SW2=new Float32Array(N2*4);pos2.set(pos);pos2.set(gs.p,N*3);cc2.set(cc);cc2.set(gs.c,N*3);SI2.set(SI);SI2.set(gs.si,N*4);SW2.set(SW);SW2.set(gs.sw,N*4);
  const ix2=new Uint32Array(ix.length+gs.ix.length);ix2.set(ix);for(let i=0;i<gs.ix.length;i++)ix2[ix.length+i]=gs.ix[i]+N;
  const geo=mk(pos2,cc2,SI2,SW2,ix2,new Float32Array(N2*2));
  const tgeo=mk(new Float32Array(jp),null,new Uint16Array(js),new Float32Array(jw),new Uint32Array(jx),new Float32Array(ju));
  return {geo,tgeo}}
