/* 3D 중계: liveGame의 선수·공 상태(P, ball)를 읽어서 2K 로우 카메라 느낌으로 그림 */
import * as THREE from 'three';import {buildSkeleton,buildBody,jerseyTex} from './body.js';
const FT=.3048,W3=(x,y,z=0)=>new THREE.Vector3((x-47)*FT,z,(y-25)*FT);
let BASE=null,CROWD=null,SCK=[];const loadBase=url=>BASE||(BASE=fetch(url).then(r=>r.json()).then(A=>({skel:A.skel,animations:Object.values(A.clips).map(c=>THREE.AnimationClip.parse(c))})));
const ARMS={RightArm:[0,0,1.25],LeftArm:[0,0,-1.25],RightForeArm:[0,.25,0],LeftForeArm:[0,-.25,0]};
const POSE={
 dribble:t=>({RightArm:[0,.35,1.0],RightForeArm:[0,.5+.4*Math.max(0,Math.sin(t*11)),0],LeftArm:[0,-.7,-.95],LeftForeArm:[0,-.9,0],Spine:[.28,0,0]}),
 defend:t=>({RightArm:[0,.35,.45+.1*Math.sin(t*6)],LeftArm:[0,-.35,-.45-.1*Math.sin(t*6)],RightForeArm:[0,.5,0],LeftForeArm:[0,-.5,0],Spine:[.35,0,0],RightUpLeg:[-.7,0,.12],LeftUpLeg:[-.7,0,-.12],RightLeg:[1.05,0,0],LeftLeg:[1.05,0,0],RightFoot:[-.35,0,0],LeftFoot:[-.35,0,0],_y:-.16}),
 hold:{RightArm:[0,1.0,.9],RightForeArm:[0,.9,0],LeftArm:[0,-1.0,-.9],LeftForeArm:[0,-.9,0],Spine:[.2,0,0]},
 shootSet:{RightArm:[0,1.35,-.45],RightForeArm:[0,0,-1.7],RightHand:[0,0,-.6],LeftArm:[0,-1.25,.45],LeftForeArm:[0,0,1.5],RightUpLeg:[-.5,0,0],LeftUpLeg:[-.5,0,0],RightLeg:[.9,0,0],LeftLeg:[.9,0,0],RightFoot:[-.35,0,0],LeftFoot:[-.35,0,0],_y:-.12},
 shootRel:{RightArm:[0,1.1,-1.2],RightForeArm:[0,0,-.15],RightHand:[0,0,.7],LeftArm:[0,-1.1,.9],LeftForeArm:[0,0,.5],Spine:[-.1,0,0],RightLeg:[.15,0,0],LeftLeg:[.15,0,0],RightFoot:[.5,0,0],LeftFoot:[.5,0,0]},
 dunk:{RightArm:[0,.9,-1.35],RightForeArm:[0,0,-.1],LeftArm:[0,-.3,-.7],LeftForeArm:[0,-.4,0],Spine:[-.15,0,0],RightUpLeg:[-.9,0,0],LeftUpLeg:[.2,0,0],RightLeg:[1.4,0,0],LeftLeg:[.5,0,0],RightFoot:[.3,0,0],LeftFoot:[.4,0,0]},
 reb:{RightArm:[0,.6,-1.2],LeftArm:[0,-.6,1.2],RightForeArm:[0,.2,0],LeftForeArm:[0,-.2,0],RightUpLeg:[-.3,0,.1],LeftUpLeg:[-.3,0,-.1],RightLeg:[.6,0,0],LeftLeg:[.6,0,0]},
 block:{RightArm:[0,.5,-1.4],LeftArm:[0,-.5,1.4],RightUpLeg:[-.25,0,0],LeftUpLeg:[-.25,0,0],RightLeg:[.4,0,0],LeftLeg:[.4,0,0]},
 pass:{RightArm:[0,1.45,.3],LeftArm:[0,-1.45,-.3],RightForeArm:[0,.1,0],LeftForeArm:[0,-.1,0],Spine:[.15,0,0]},
 cele:t=>({RightArm:[0,.3,-1.3+.25*Math.sin(t*10)],LeftArm:[0,-.3,1.3-.25*Math.sin(t*10)],RightForeArm:[0,.4,0],LeftForeArm:[0,-.4,0]})};
const _e=new THREE.Euler(),_q=new THREE.Quaternion();
function courtTex(cols,logo){const c=document.createElement('canvas');c.width=2048;c.height=1090;const x=c.getContext('2d'),s=c.width/94;
 for(let i=0;i<64;i++){x.fillStyle=['#cf9c64','#c8945b','#d4a46d','#cb985f'][i%4];x.fillRect(0,i*c.height/64,c.width,c.height/64+1)}
 x.globalAlpha=.06;for(let i=0;i<500;i++){x.fillStyle=Math.random()<.5?'#000':'#fff';x.fillRect(Math.random()*c.width,Math.random()*c.height,30+Math.random()*220,2)}x.globalAlpha=1;
 x.fillStyle=cols[0];x.globalAlpha=.6;x.fillRect(0,(25-8)*s,19*s,16*s);x.fillRect((94-19)*s,(25-8)*s,19*s,16*s);x.globalAlpha=1;
 x.strokeStyle='#fff';x.lineWidth=6;x.strokeRect(3,3,c.width-6,c.height-6);x.beginPath();x.moveTo(47*s,0);x.lineTo(47*s,c.height);x.stroke();x.beginPath();x.arc(47*s,25*s,6*s,0,7);x.stroke();
 for(const sd of [0,1]){const hx=sd?94-5.25:5.25,dir=sd?-1:1;x.strokeRect(sd?(94-19)*s:0,(25-8)*s,19*s,16*s);x.beginPath();x.arc((sd?94-19:19)*s,25*s,6*s,0,7);x.stroke();
  x.beginPath();x.moveTo((sd?94:0)*s,3*s);x.lineTo((hx+dir*8.8)*s,3*s);x.stroke();x.beginPath();x.arc(hx*s,25*s,23.75*s,sd?Math.PI+1.186:-1.186,sd?Math.PI-1.186:1.186,!!sd);x.stroke();
  x.beginPath();x.moveTo((sd?94:0)*s,47*s);x.lineTo((hx+dir*8.8)*s,47*s);x.stroke();x.beginPath();x.arc(hx*s,25*s,4*s,sd?Math.PI/2:-Math.PI/2,sd?-Math.PI/2:Math.PI/2,!!sd);x.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
 if(logo){const im=new Image();im.onload=()=>{const r=5.6*s,ar=im.width/im.height,w=ar>=1?2*r:2*r*ar,h=ar>=1?2*r/ar:2*r;x.save();x.translate(47*s,25*s);x.globalAlpha=.92;x.drawImage(im,-w/2,-h/2,w,h);x.restore();t.needsUpdate=true};im.src=logo}
 return t}
function blobTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
function makePlayer(sc,base,o){
  const LK=o.leg||1.1,S=buildSkeleton(base.skel,{leg:LK}),root=S.root,bones={};for(const b of S.bones)bones[b.name]=b;
  const {geo,tgeo}=buildBody(S,o);const skel=new THREE.Skeleton(S.bones);
  const m1=new THREE.SkinnedMesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62}));
  const m2=new THREE.SkinnedMesh(tgeo,new THREE.MeshStandardMaterial({map:jerseyTex(o),roughness:.7}));
  for(const m of [m1,m2]){root.add(m);m.bind(skel);m.frustumCulled=false}
  root.scale.setScalar(o.scale||1);
  const bind={};for(const k in bones)bind[k]=bones[k].quaternion.clone();
  const mixer=new THREE.AnimationMixer(root),acts={};
  for(const c of base.animations)if(['idle','run','walk'].includes(c.name)){acts[c.name]=mixer.clipAction(c);acts[c.name].play();acts[c.name].setEffectiveWeight(c.name==='idle'?1:0)}
  acts.idle.time=Math.random()*2;
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:o.blob,transparent:true,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.y=.01;sc.add(blob);
  let ring=null;if(o.me){ring=new THREE.Mesh(new THREE.RingGeometry(.48,.6,32),new THREE.MeshBasicMaterial({color:'#ffd34d',transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;sc.add(ring)}
  sc.add(root);
  return {root,bones,bind,mixer,acts,blob,ring,t:0,pw:0,pose:null,last:null,loco:'idle',yaw:o.yaw||0,
    loc(n,sp){if(n!==this.loco){this.loco=n;for(const k in acts)acts[k].setEffectiveWeight(k===n?1:0)}if(acts[n])acts[n].timeScale=sp||1},
    step(dt){this.t+=dt;mixer.update(dt);
      /* 뛸 때 상체를 앞으로 숙이고 팔을 크게 흔듦 */
      {const tl=this.loco==='run'?.38:this.loco==='walk'?.12:0;this.lean=(this.lean||0)+(tl-(this.lean||0))*Math.min(1,dt*6);const L=this.lean*(1-this.pw);
       if(L>.01){_e.set(L*.55,0,0);_q.setFromEuler(_e);bones.Spine.quaternion.multiply(_q);_e.set(L*.35,0,0);_q.setFromEuler(_e);bones.Spine1.quaternion.multiply(_q);_e.set(-L*.5,0,0);_q.setFromEuler(_e);bones.Neck.quaternion.multiply(_q);
        }}const tg0=this.pose?(typeof POSE[this.pose]==='function'?POSE[this.pose](this.t):POSE[this.pose]):null;
      this.pw+=((tg0?1:0)-this.pw)*Math.min(1,dt*12);if(tg0)this.last=tg0;const tg=this.last;this.yoff=0;if(!tg||this.pw<.01)return;
      for(const k in tg){if(k[0]==='_'||!bones[k])continue;const v=tg[k];_e.set(v[0],v[1],v[2]);_q.setFromEuler(_e).premultiply(bind[k]);bones[k].quaternion.slerp(_q,this.pw)}
      this.yoff=(tg._y||0)*this.pw}}}
export async function create(el,cfg){
  SCK=[];
  const base=await loadBase(cfg.model);
  const Wd=el.clientWidth||340,Hd=el.clientHeight||Math.round(Wd*.56);
  const ren=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});ren.setPixelRatio(Math.min(1.5,devicePixelRatio||1));ren.setSize(Wd,Hd);ren.outputColorSpace=THREE.SRGBColorSpace;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.05;
  ren.domElement.style.cssText='display:block;width:100%;height:100%;border-radius:inherit';el.appendChild(ren.domElement);
  const sc=new THREE.Scene();sc.background=new THREE.Color('#0b0d12');sc.fog=new THREE.Fog('#0b0d12',38,70);
  const cam=new THREE.PerspectiveCamera(24,Wd/Hd,.1,200);
  sc.add(new THREE.HemisphereLight('#fff6e8','#2a1d12',1.05));const dl=new THREE.DirectionalLight('#ffffff',1.7);dl.position.set(4,18,10);sc.add(dl);
  for(const x of [-10,0,10]){const sp=new THREE.PointLight('#fff1d6',18,26,1.6);sp.position.set(x,9,0);sc.add(sp)}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(94*FT,50*FT),new THREE.MeshStandardMaterial({map:courtTex(cfg.homeCols,cfg.homeLogo),roughness:.38,metalness:.05}));floor.rotation.x=-Math.PI/2;sc.add(floor);
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(140*FT,100*FT),new THREE.MeshStandardMaterial({color:'#1c1f27',roughness:.9}));apron.rotation.x=-Math.PI/2;apron.position.y=-.01;sc.add(apron);
  const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,...o});
  for(const sd of [0,1]){const hx=sd?94-5.25:5.25,d=sd?1:-1;
    const bb=new THREE.Mesh(new THREE.BoxGeometry(.05,1.07,1.83),M('#ffffff',{transparent:true,opacity:.55}));bb.position.copy(W3(hx+d*1.25,25,3.4));sc.add(bb);
    const fr=new THREE.Mesh(new THREE.BoxGeometry(.06,1.07,1.83),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true}));fr.position.copy(bb.position);sc.add(fr);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.23,.02,8,28),M('#ff5a1f',{roughness:.4}));rim.rotation.x=Math.PI/2;rim.position.copy(W3(hx,25,3.05));sc.add(rim);
    const net=new THREE.Mesh(new THREE.CylinderGeometry(.23,.13,.42,14,3,true),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:.85}));net.position.copy(W3(hx,25,2.83));sc.add(net);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.5,.14,.14),M('#2b2b2b'));arm.position.copy(W3(hx+d*3.4,25,3.4));sc.add(arm);
    const pole=new THREE.Mesh(new THREE.BoxGeometry(.35,3.4,.35),M('#2b2b2b'));pole.position.copy(W3(hx+d*5.8,25,1.7));sc.add(pole);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(.7,1.4,1.3),M(cfg.homeCols[0]));pad.position.copy(W3(hx+d*6.2,25,.7));sc.add(pad);
    /* 샷클락 (백보드 위) */
    const scv=document.createElement('canvas');scv.width=256;scv.height=128;const stx=new THREE.CanvasTexture(scv);stx.colorSpace=THREE.SRGBColorSpace;
    const bp0=W3(hx+d*1.3,25,4.2),box=new THREE.Mesh(new THREE.BoxGeometry(.5,.44,.5),M('#111'));box.position.copy(bp0);sc.add(box);
    const fm=new THREE.MeshBasicMaterial({map:stx,toneMapped:false});
    const f1=new THREE.Mesh(new THREE.PlaneGeometry(.46,.36),fm);f1.position.copy(bp0).add(new THREE.Vector3(-d*.252,0,0));f1.rotation.y=-d*Math.PI/2;sc.add(f1);
    const f2=new THREE.Mesh(new THREE.PlaneGeometry(.46,.36),fm);f2.position.copy(bp0).add(new THREE.Vector3(0,0,.252));sc.add(f2);
    SCK.push({cv:scv,tx:stx,last:null})}
  /* stands, crowd & boards */
  {const stands=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:'#16181e',roughness:.95});
   for(let r=0;r<10;r++){const st=new THREE.Mesh(new THREE.BoxGeometry(40,.5,.85),dark);st.position.set(0,.25+r*.5,-(10+r*.85));stands.add(st)}
   for(const sx of [-1,1])for(let r=0;r<8;r++){const st=new THREE.Mesh(new THREE.BoxGeometry(.85,.5,26),dark);st.position.set(sx*(17.8+r*.85),.25+r*.5,-3);stands.add(st)}
   sc.add(stands);
   const N=1400,body=new THREE.InstancedMesh(new THREE.CylinderGeometry(.17,.21,.5,8),new THREE.MeshLambertMaterial(),N),head=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,10,8),new THREE.MeshLambertMaterial(),N);
   const m=new THREE.Matrix4(),c=new THREE.Color(),sk=['#f1d2b6','#d9a982','#b6805a','#8d5c3c','#5f3e29'];
   const shirt=[cfg.homeCols[0],cfg.homeCols[0],cfg.homeCols[1]||'#ffffff','#ffffff','#1d1d1f','#2c3e66','#7a7a7a','#b03030','#e8e2d0',cfg.homeCols[0]];
   const seats=[];for(let r=0;r<10;r++)for(let k=0;k<88;k++)if(Math.random()<.92)seats.push([-17.4+k*.4+(Math.random()-.5)*.06,.5+r*.5,-(10+r*.85)+.05]);
   for(const sx of [-1,1])for(let r=0;r<8;r++)for(let k=0;k<58;k++)if(Math.random()<.85)seats.push([sx*(17.8+r*.85),.5+r*.5,-15+k*.42]);
   const n=Math.min(N,seats.length);const crowdY=[];
   for(let i=0;i<n;i++){const [x,y,z]=seats[i];const h=.95+Math.random()*.12;m.compose(new THREE.Vector3(x,y+.25*h,z),new THREE.Quaternion(),new THREE.Vector3(1,h,1));body.setMatrixAt(i,m);body.setColorAt(i,c.set(shirt[(Math.random()*shirt.length)|0]).multiplyScalar(.6+Math.random()*.35));
     m.makeTranslation(x,y+.6*h,z);head.setMatrixAt(i,m);head.setColorAt(i,c.set(sk[(Math.random()*sk.length)|0]).multiplyScalar(.75));crowdY.push([x,y,z,h,Math.random()*6])}
   body.count=head.count=n;sc.add(body);sc.add(head);CROWD={body,head,crowdY,n,m};
   const tbl=new THREE.Mesh(new THREE.BoxGeometry(12,.75,.6),new THREE.MeshStandardMaterial({color:'#101216'}));tbl.position.set(0,.375,-8.6);sc.add(tbl);
   const bd=document.createElement('canvas');bd.width=1024;bd.height=64;const bx=bd.getContext('2d');bx.fillStyle=cfg.homeCols[0];bx.fillRect(0,0,1024,64);bx.fillStyle='#fff';bx.font='900 40px sans-serif';bx.textAlign='center';for(let k=0;k<4;k++)bx.fillText(cfg.homeAbbr||'BENCH TO RING',128+k*256,46);
   const bt=new THREE.CanvasTexture(bd);bt.colorSpace=THREE.SRGBColorSpace;const b=new THREE.Mesh(new THREE.BoxGeometry(32,.6,.1),new THREE.MeshBasicMaterial({map:bt}));b.position.set(0,.3,-9.4);sc.add(b);
   const tb=new THREE.Mesh(new THREE.PlaneGeometry(12,.7),new THREE.MeshBasicMaterial({map:bt}));tb.position.set(0,.4,-8.29);sc.add(tb)}
  const blob=blobTex(),skins=cfg.skins;
  const pl=[];cfg.P.forEach((tm,ti)=>tm.forEach((p,i)=>{const cols=ti===0?cfg.homeCols:cfg.awayCols,wh=ti===0;const L=p.look||{};pl.push({src:p,m:makePlayer(sc,base,{skin:p.skin||'#8d5a3b',hairc:p.hair||'#151515',hair:L.hair??0,beard:L.beard||0,band:L.band||0,bandc:wh?cols[0]:'#ffffff',num:L.num??(i*7+3),abbr:ti===0?cfg.homeAbbr:cfg.awayAbbr,jersey:wh?'#f4f4f4':cols[0],shorts:wh?'#f4f4f4':cols[0],trim:wh?cols[0]:(cols[1]&&cols[1]!==cols[0]?cols[1]:'#ffffff'),numc:wh?cols[0]:'#ffffff',socks:L.socks,shoe:L.shoe,bulk:L.bulk||1,leg:L.leg||1.1,blob,me:p.me,scale:L.scale||1,yaw:ti===0?Math.PI/2:-Math.PI/2})})}));
  const ballM=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),M('#e8742a',{roughness:.55}));sc.add(ballM);const ballS=new THREE.Mesh(new THREE.PlaneGeometry(.45,.45),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false}));ballS.rotation.x=-Math.PI/2;ballS.position.y=.012;sc.add(ballS);
  const HOOP=s=>W3(s>0?88.75:5.25,25,3.05);
  const camX={v:0,init:0};let focus=0,fz=0;let alive=true,last=performance.now(),acc=0;
  const ang=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
  function frame(now){if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const B=cfg.ball,hold=B.hold&&!B.fl?B.hold:null;
    for(const q of pl){const s=q.src,m=q.m;const wp=W3(s.x,s.y);const prev=m.prev||wp;const vel=wp.clone().sub(prev).divideScalar(Math.max(dt,1e-3));m.prev=wp.clone();const sp=Math.hypot(vel.x,vel.z);
      let want=m.yaw;if(sp>.4)want=Math.atan2(vel.x,vel.z);else{const tgt=hold?W3(hold.x,hold.y):W3(B.x,B.y);const off=s.team===cfg.offTeam();const aim=off?(hold===s?HOOP(cfg.dir()):tgt):tgt;if(!(hold===s&&!off))want=Math.atan2(aim.x-wp.x,aim.z-wp.z)}
      m.yaw+=ang(m.yaw,want)*Math.min(1,dt*9);m.root.rotation.y=m.yaw;
      const act=s.act&&now-s.actT<(s.actD||700)?s.act:null;
      let pose=null,jump=0;
      if(act==='shoot'){const k=(now-s.actT)/(s.actD||700);pose=k<.45?'shootSet':'shootRel';jump=k<.25?0:Math.sin(Math.min(1,(k-.25)/.6)*Math.PI)*.45}
      else if(act==='dunk'){const k=(now-s.actT)/(s.actD||700);pose='dunk';jump=Math.sin(Math.min(1,k)*Math.PI)*.95}
      else if(act==='reb'||act==='block'){const k=(now-s.actT)/(s.actD||700);pose=act;jump=Math.sin(Math.min(1,k)*Math.PI)*.6}
      else if(act==='pass')pose='pass';else if(act==='cele')pose='cele';
      else if(hold===s)pose='dribble';
      else if(s.team!==cfg.offTeam()&&sp<1.2)pose='defend';
      m.pose=pose;m.loc(sp>3.2?'run':sp>.5?'walk':'idle',sp>3.2?Math.min(1.5,sp/5):1);m.step(dt);
      m.root.position.set(wp.x,(m.yoff||0)+jump,wp.z);m.blob.position.set(wp.x,.01,wp.z);m.blob.scale.setScalar(1-jump*.35);if(m.ring)m.ring.position.set(wp.x,.015,wp.z)}
    /* ball */
    let bp;
    if(B.thru!=null){bp=HOOP(cfg.dir());bp.y=3.05-B.thru*2.9}
    else if(B.fl&&B.from&&B.dest){const k=B.k||0,a=W3(B.from[0],B.from[1]),b=W3(B.dest[0],B.dest[1]);const toHoop=Math.hypot(B.dest[0]-(cfg.dir()>0?88.75:5.25),B.dest[1]-25)<1.5;
      const h0=B.hy0!=null?B.hy0:toHoop?2.5:1.3,h1=toHoop?3.12:1.3,arc=toHoop?(B.arc||6)*.32:.35;bp=a.lerp(b,k);bp.y=h0+(h1-h0)*k+Math.sin(k*Math.PI)*arc}
    else if(hold){const q=pl.find(o=>o.src===hold).m;const r=new THREE.Vector3(Math.sin(q.yaw),0,Math.cos(q.yaw)),side=new THREE.Vector3(-r.z,0,r.x);const ph=(now/1000*5.5)%1,b=Math.abs(Math.cos(ph*Math.PI));
      const act=hold.act&&now-hold.actT<(hold.actD||700)?hold.act:null;
      if(act==='shoot'||act==='dunk'){bp=q.root.position.clone().add(r.clone().multiplyScalar(.15));bp.y+=act==='dunk'?2.45:2.2}
      else{bp=q.root.position.clone().add(r.multiplyScalar(.32)).add(side.multiplyScalar(-.26));bp.y=.12+b*.78}}
    else bp=W3(B.x,B.y,.12+(B.z||0)*.1);
    ballM.position.copy(bp);ballM.rotation.x+=dt*6;ballS.position.set(bp.x,.012,bp.z);ballS.scale.setScalar(Math.max(.3,1-bp.y*.15));
    /* 2K low broadcast camera: sideline, slightly elevated, follows the ball */
    let mx=0;for(const q of pl)mx+=q.m.root.position.x;mx/=pl.length;const tx=Math.max(-11,Math.min(11,bp.x*.4+mx*.6+cfg.dir()*1.8));if(!camX.init){camX.v=tx;camX.init=1}camX.v+=(tx-camX.v)*Math.min(1,dt*3);
    fz+=(focus-fz)*Math.min(1,dt*2);cam.fov=24-fz*7;cam.updateProjectionMatrix();cam.position.set(camX.v*.82+fz*camX.v*.12,6.4-fz*1.6,16.8-fz*2);cam.lookAt(camX.v+fz*cfg.dir()*1.2,.2+fz*.9,-1.2);
    {const v=cfg.shot?cfg.shot():null;const txt=v==null?'':v<5?Math.max(0,v).toFixed(1):String(Math.ceil(v));for(const S of SCK){if(S.last===txt)continue;S.last=txt;const x=S.cv.getContext('2d');x.fillStyle='#0a0a0a';x.fillRect(0,0,256,128);x.font='900 104px "Courier New",monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle=v!=null&&v<5?'#ff2b2b':'#ffb020';x.shadowColor=x.fillStyle;x.shadowBlur=18;x.fillText(txt,128,68);S.tx.needsUpdate=true}}
    if(CROWD){const C=CROWD,t=now/1000,exc=cfg.hype?cfg.hype():0;for(let k=0;k<40;k++){const i=(Math.random()*C.n)|0,[x,y,z,h,ph]=C.crowdY[i];const b=Math.max(0,Math.sin(t*(3+exc*4)+ph))*(.03+exc*.18);C.m.compose(new THREE.Vector3(x,y+.25*h+b,z),new THREE.Quaternion(),new THREE.Vector3(1,h,1));C.body.setMatrixAt(i,C.m);C.m.makeTranslation(x,y+.6*h+b,z);C.head.setMatrixAt(i,C.m)}C.body.instanceMatrix.needsUpdate=C.head.instanceMatrix.needsUpdate=true}
    ren.render(sc,cam);requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  return {focus(v){focus=v?1:0},dispose(){alive=false;ren.dispose();ren.domElement.remove();sc.traverse(o=>{if(o.geometry)o.geometry.dispose()})},resize(){const w=el.clientWidth,h=el.clientHeight;ren.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}};
}
