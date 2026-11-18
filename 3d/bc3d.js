/* 3D 중계: liveGame의 선수·공 상태(P, ball)를 읽어서 2K 로우 카메라 느낌으로 그림 */
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import * as SU from 'three/addons/utils/SkeletonUtils.js';
const FT=.3048,W3=(x,y,z=0)=>new THREE.Vector3((x-47)*FT,z,(y-25)*FT);
let BASE=null;const loadBase=url=>BASE||(BASE=new Promise((ok,no)=>new GLTFLoader().load(url,ok,undefined,no)));
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
function courtTex(cols){const c=document.createElement('canvas');c.width=2048;c.height=1090;const x=c.getContext('2d'),s=c.width/94;
 for(let i=0;i<64;i++){x.fillStyle=['#cf9c64','#c8945b','#d4a46d','#cb985f'][i%4];x.fillRect(0,i*c.height/64,c.width,c.height/64+1)}
 x.globalAlpha=.06;for(let i=0;i<500;i++){x.fillStyle=Math.random()<.5?'#000':'#fff';x.fillRect(Math.random()*c.width,Math.random()*c.height,30+Math.random()*220,2)}x.globalAlpha=1;
 x.fillStyle=cols[0];x.globalAlpha=.85;x.fillRect(0,(25-8)*s,19*s,16*s);x.fillRect((94-19)*s,(25-8)*s,19*s,16*s);x.globalAlpha=.8;x.beginPath();x.arc(47*s,25*s,6*s,0,7);x.fill();x.globalAlpha=1;
 x.strokeStyle='#fff';x.lineWidth=6;x.strokeRect(3,3,c.width-6,c.height-6);x.beginPath();x.moveTo(47*s,0);x.lineTo(47*s,c.height);x.stroke();x.beginPath();x.arc(47*s,25*s,6*s,0,7);x.stroke();
 for(const sd of [0,1]){const hx=sd?94-5.25:5.25,dir=sd?-1:1;x.strokeRect(sd?(94-19)*s:0,(25-8)*s,19*s,16*s);x.beginPath();x.arc((sd?94-19:19)*s,25*s,6*s,0,7);x.stroke();
  x.beginPath();x.moveTo((sd?94:0)*s,3*s);x.lineTo((hx+dir*8.8)*s,3*s);x.stroke();x.beginPath();x.arc(hx*s,25*s,23.75*s,sd?Math.PI+1.186:-1.186,sd?Math.PI-1.186:1.186,!!sd);x.stroke();
  x.beginPath();x.moveTo((sd?94:0)*s,47*s);x.lineTo((hx+dir*8.8)*s,47*s);x.stroke();x.beginPath();x.arc(hx*s,25*s,4*s,sd?Math.PI/2:-Math.PI/2,sd?-Math.PI/2:Math.PI/2,!!sd);x.stroke()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
function blobTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
function makePlayer(sc,base,o){
  const root=SU.clone(base.scene),bones={};
  root.traverse(m=>{if(m.isBone)bones[m.name.replace('mixamorig','')]=m;
    if(m.isSkinnedMesh){const geo=m.geometry.clone();m.geometry=geo;const sk=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,pos=geo.attributes.position,n=sk.count,col=new Float32Array(n*3);
      const names=m.skeleton.bones.map(b=>b.name.replace('mixamorig',''));const C=v=>new THREE.Color(v),cS=C(o.skin),cJ=C(o.jersey),cH=C(o.shorts),cT=C(o.trim),cW=C('#f4f4f4'),cHr=C(o.hair),isJ=/Joints/.test(m.name);
      for(let i=0;i<n;i++){let bi=0,bw=-1;for(let k=0;k<4;k++){const w=sw.getComponent(i,k);if(w>bw){bw=w;bi=sk.getComponent(i,k)}}
        const y=pos.getY(i);if(y>.78&&y<1.12)pos.setX(i,pos.getX(i)*(1-.15*Math.sin(Math.PI*(y-.78)/.34)));if(y>1.22&&y<1.52){const f=Math.sin(Math.PI*(y-1.22)/.3);pos.setX(i,pos.getX(i)*(1+.12*f));pos.setZ(i,pos.getZ(i)*(1+.05*f))}
        const nm=names[bi],tor=/Spine|Hips/.test(nm),leg=/UpLeg/.test(nm);let c=tor?(y<1.02?cH:cJ):leg?cH:cS;
        if((tor||leg)&&y>.99&&y<1.04)c=cT;if(/Shoulder/.test(nm))c=cJ;if(/Foot|Toe/.test(nm))c=cW;if(/Head/.test(nm)&&y>1.72)c=cHr;if(isJ)c=c.clone().multiplyScalar(.82);
        col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
      pos.needsUpdate=true;geo.computeVertexNormals();geo.setAttribute('color',new THREE.BufferAttribute(col,3));
      m.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6});m.frustumCulled=false}});
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
    step(dt){this.t+=dt;mixer.update(dt);const tg0=this.pose?(typeof POSE[this.pose]==='function'?POSE[this.pose](this.t):POSE[this.pose]):null;
      this.pw+=((tg0?1:0)-this.pw)*Math.min(1,dt*12);if(tg0)this.last=tg0;const tg=this.last;this.yoff=0;if(!tg||this.pw<.01)return;
      for(const k in tg){if(k[0]==='_'||!bones[k])continue;const v=tg[k];_e.set(v[0],v[1],v[2]);_q.setFromEuler(_e).premultiply(bind[k]);bones[k].quaternion.slerp(_q,this.pw)}
      this.yoff=(tg._y||0)*this.pw}}}
export async function create(el,cfg){
  const base=await loadBase(cfg.model);
  const Wd=el.clientWidth||340,Hd=el.clientHeight||Math.round(Wd*.56);
  const ren=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});ren.setPixelRatio(Math.min(1.5,devicePixelRatio||1));ren.setSize(Wd,Hd);ren.outputColorSpace=THREE.SRGBColorSpace;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.05;
  ren.domElement.style.cssText='display:block;width:100%;height:100%;border-radius:inherit';el.appendChild(ren.domElement);
  const sc=new THREE.Scene();sc.background=new THREE.Color('#0b0d12');sc.fog=new THREE.Fog('#0b0d12',38,70);
  const cam=new THREE.PerspectiveCamera(24,Wd/Hd,.1,200);
  sc.add(new THREE.HemisphereLight('#fff6e8','#2a1d12',1.05));const dl=new THREE.DirectionalLight('#ffffff',1.7);dl.position.set(4,18,10);sc.add(dl);
  for(const x of [-10,0,10]){const sp=new THREE.PointLight('#fff1d6',18,26,1.6);sp.position.set(x,9,0);sc.add(sp)}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(94*FT,50*FT),new THREE.MeshStandardMaterial({map:courtTex(cfg.homeCols),roughness:.38,metalness:.05}));floor.rotation.x=-Math.PI/2;sc.add(floor);
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(140*FT,100*FT),new THREE.MeshStandardMaterial({color:'#1c1f27',roughness:.9}));apron.rotation.x=-Math.PI/2;apron.position.y=-.01;sc.add(apron);
  const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,...o});
  for(const sd of [0,1]){const hx=sd?94-5.25:5.25,d=sd?1:-1;
    const bb=new THREE.Mesh(new THREE.BoxGeometry(.05,1.07,1.83),M('#ffffff',{transparent:true,opacity:.55}));bb.position.copy(W3(hx+d*1.25,25,3.4));sc.add(bb);
    const fr=new THREE.Mesh(new THREE.BoxGeometry(.06,1.07,1.83),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true}));fr.position.copy(bb.position);sc.add(fr);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.23,.02,8,28),M('#ff5a1f',{roughness:.4}));rim.rotation.x=Math.PI/2;rim.position.copy(W3(hx,25,3.05));sc.add(rim);
    const net=new THREE.Mesh(new THREE.CylinderGeometry(.23,.13,.42,14,3,true),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:.85}));net.position.copy(W3(hx,25,2.83));sc.add(net);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.5,.14,.14),M('#2b2b2b'));arm.position.copy(W3(hx+d*3.4,25,3.4));sc.add(arm);
    const pole=new THREE.Mesh(new THREE.BoxGeometry(.35,3.4,.35),M('#2b2b2b'));pole.position.copy(W3(hx+d*5.8,25,1.7));sc.add(pole);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(.7,1.4,1.3),M(cfg.homeCols[0]));pad.position.copy(W3(hx+d*6.2,25,.7));sc.add(pad)}
  /* crowd & boards */
  {const g=new THREE.InstancedMesh(new THREE.BoxGeometry(.38,.55,.3),new THREE.MeshLambertMaterial(),900),m=new THREE.Matrix4(),c=new THREE.Color();let i=0;
   const pal=['#2a2a2e','#3b3b42','#4a3a34','#1f2a44','#44201f','#565656',cfg.homeCols[0],'#e8e2d0'];
   for(const side of [-1])for(let r=0;r<7;r++)for(let k=0;k<90&&i<900;k++){const x=-17+k*.38+(Math.random()-.5)*.1,z=side*(10.2+r*.75),y=.45+r*.62;m.makeTranslation(x,y,z);g.setMatrixAt(i,m);g.setColorAt(i,c.set(pal[(k*7+r*5+(side>0?3:0))%pal.length]).multiplyScalar(.55+Math.random()*.5));i++}
   g.count=i;sc.add(g);
   const bd=document.createElement('canvas');bd.width=1024;bd.height=64;const bx=bd.getContext('2d');bx.fillStyle=cfg.homeCols[0];bx.fillRect(0,0,1024,64);bx.fillStyle='#fff';bx.font='900 40px sans-serif';bx.textAlign='center';for(let k=0;k<4;k++)bx.fillText(cfg.homeAbbr||'BENCH TO RING',128+k*256,46);
   const bt=new THREE.CanvasTexture(bd);bt.colorSpace=THREE.SRGBColorSpace;for(const side of [-1]){const b=new THREE.Mesh(new THREE.BoxGeometry(32,.6,.1),new THREE.MeshBasicMaterial({map:bt}));b.position.set(0,.3,side*9.4);sc.add(b)}}
  const blob=blobTex(),skins=cfg.skins;
  const pl=[];cfg.P.forEach((tm,ti)=>tm.forEach((p,i)=>{const cols=ti===0?cfg.homeCols:cfg.awayCols,wh=ti===0;pl.push({src:p,m:makePlayer(sc,base,{skin:p.skin||'#8d5a3b',jersey:wh?'#f2f2f2':cols[0],shorts:wh?'#f2f2f2':cols[0],trim:wh?cols[0]:(cols[1]||'#ffffff'),hair:p.hair||'#151515',blob,me:p.me,scale:p.me&&cfg.meScale?cfg.meScale:(.97+((i*37+ti*11)%9)/100),yaw:ti===0?Math.PI/2:-Math.PI/2})})}));
  const ballM=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),M('#e8742a',{roughness:.55}));sc.add(ballM);const ballS=new THREE.Mesh(new THREE.PlaneGeometry(.45,.45),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false}));ballS.rotation.x=-Math.PI/2;ballS.position.y=.012;sc.add(ballS);
  const HOOP=s=>W3(s>0?88.75:5.25,25,3.05);
  const camX={v:0,init:0};let alive=true,last=performance.now(),acc=0;
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
    if(B.fl&&B.from&&B.dest){const k=B.k||0,a=W3(B.from[0],B.from[1]),b=W3(B.dest[0],B.dest[1]);const toHoop=Math.hypot(B.dest[0]-(cfg.dir()>0?88.75:5.25),B.dest[1]-25)<1.5;
      const h0=toHoop?2.5:1.3,h1=toHoop?3.12:1.3,arc=toHoop?(B.arc||6)*.32:.35;bp=a.lerp(b,k);bp.y=h0+(h1-h0)*k+Math.sin(k*Math.PI)*arc}
    else if(hold){const q=pl.find(o=>o.src===hold).m;const r=new THREE.Vector3(Math.sin(q.yaw),0,Math.cos(q.yaw)),side=new THREE.Vector3(-r.z,0,r.x);const ph=(now/1000*5.5)%1,b=Math.abs(Math.cos(ph*Math.PI));
      const act=hold.act&&now-hold.actT<(hold.actD||700)?hold.act:null;
      if(act==='shoot'||act==='dunk'){bp=q.root.position.clone().add(r.clone().multiplyScalar(.15));bp.y+=act==='dunk'?2.45:2.2}
      else{bp=q.root.position.clone().add(r.multiplyScalar(.32)).add(side.multiplyScalar(-.26));bp.y=.12+b*.78}}
    else bp=W3(B.x,B.y,.12+(B.z||0)*.1);
    ballM.position.copy(bp);ballM.rotation.x+=dt*6;ballS.position.set(bp.x,.012,bp.z);ballS.scale.setScalar(Math.max(.3,1-bp.y*.15));
    /* 2K low broadcast camera: sideline, slightly elevated, follows the ball */
    let mx=0;for(const q of pl)mx+=q.m.root.position.x;mx/=pl.length;const tx=Math.max(-11,Math.min(11,bp.x*.4+mx*.6+cfg.dir()*1.8));if(!camX.init){camX.v=tx;camX.init=1}camX.v+=(tx-camX.v)*Math.min(1,dt*3);
    cam.position.set(camX.v*.82,6.4,16.8);cam.lookAt(camX.v,.2,-1.2);
    ren.render(sc,cam);requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  return {dispose(){alive=false;ren.dispose();ren.domElement.remove();sc.traverse(o=>{if(o.geometry)o.geometry.dispose()})},resize(){const w=el.clientWidth,h=el.clientHeight;ren.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}};
}
