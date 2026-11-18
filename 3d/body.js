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
  x.fillRect(0,256*.86,512,10);
  const num=String(o.num??'');x.font='900 64px Arial Black,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle=o.trim;x.fillStyle=o.numc||o.trim;
  for(const [u,s] of [[.25,1],[.75,.85]]){x.save();x.translate(u*512,256*.6);x.scale(-s,-1.15*s);x.strokeText(num,0,0);x.fillStyle=o.jersey;x.fillText(num,0,0);x.restore()}
  if(o.abbr){x.save();x.font='900 22px Arial,sans-serif';x.fillStyle=o.trim;x.translate(.25*512,256*.79);x.scale(-1,-1);x.fillText(o.abbr,0,0);x.restore()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;return t}
