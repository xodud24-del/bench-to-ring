/* 3D 중계: liveGame의 선수·공 상태(P, ball)를 읽어서 2K 로우 카메라 느낌으로 그림 */
import * as THREE from 'three';import {buildSkeleton,buildBody,jerseyTex} from './body.js';
const FT=.3048,W3=(x,y,z=0)=>new THREE.Vector3((x-47)*FT,z,(y-25)*FT);
let BASE=null,CROWD=null,SCK=[],NETS=[];
/* CMU 모션캡처(무료 공개 데이터)를 우리 뼈대에 옮긴 클립 */
function prepMC(MC){for(const k in MC){const C=MC[k];C.dur=C.n/C.fps;C.qa={};for(const b in C.q)C.qa[b]=Float32Array.from(C.q[b]);C.ball=[];
   const H=C.hand,ys=[[],[]];for(let i=0;i<C.n;i++){ys[0].push(H[i*6+1]);ys[1].push(H[i*6+4])}const rng=ys.map(a=>[Math.min(...a),Math.max(...a)]);
   for(let i=0;i<C.n;i++){const L=[H[i*6],H[i*6+1],H[i*6+2]],R=[H[i*6+3],H[i*6+4],H[i*6+5]];
     if(/shot/.test(k)){C.ball.push([(L[0]+R[0])/2,(L[1]+R[1])/2+.06,(L[2]+R[2])/2+.12]);continue}
     const h=L[1]<R[1]?0:1,P=h?R:L,[mn,mx]=rng[h],u=Math.min(1,Math.max(0,(P[1]-mn)/Math.max(.05,mx-mn)));C.ball.push([P[0],Math.max(.12,P[1]-.1-(1-u)*(P[1]-.25)),P[2]+.06])}}return MC}
const loadBase=url=>BASE||(BASE=Promise.all([fetch(url).then(r=>r.json()),fetch(url.replace('anim.json','mocap.json')).then(r=>r.json()).catch(()=>null)]).then(([A,MC])=>({skel:A.skel,animations:Object.values(A.clips).map(c=>THREE.AnimationClip.parse(c)),mc:MC?prepMC(MC):null})));
const MCMAP={mshot:'shot',mpull:'shot2',mshot3:'shot3',mcross:'cross',mlegs:'legs'};
const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion();
const ARMS={RightArm:[0,0,1.25],LeftArm:[0,0,-1.25],RightForeArm:[0,.25,0],LeftForeArm:[0,-.25,0]};
const POSE={
 dribble:t=>({RightArm:[0,.35,1.0],RightForeArm:[0,.5+.4*Math.max(0,Math.sin(t*11)),0],LeftArm:[0,-.7,-.95],LeftForeArm:[0,-.9,0],Spine:[.28,0,0]}),
 defend:t=>{const sh=DEFSH;return {RightArm:[0,.25,.25+.08*Math.sin(t*5)],LeftArm:[0,-.25,-.25-.08*Math.sin(t*5)],RightForeArm:[0,.35,-.25],LeftForeArm:[0,-.35,.25],RightHand:[0,0,-.3],LeftHand:[0,0,.3],Spine:[.5,0,0],Spine1:[.12,0,0],Neck:[-.45,0,0],RightUpLeg:[-.85,0,.38+sh*.18],LeftUpLeg:[-.85,0,-.38+sh*.18],RightLeg:[1.25,0,0],LeftLeg:[1.25,0,0],RightFoot:[-.4,0,-.25],LeftFoot:[-.4,0,.25],_y:-.3}},
 hold:{RightArm:[0,1.0,.9],RightForeArm:[0,.9,0],LeftArm:[0,-1.0,-.9],LeftForeArm:[0,-.9,0],Spine:[.2,0,0]},
 shootSet:{RightArm:[0,1.35,-.45],RightForeArm:[0,0,-1.7],RightHand:[0,0,-.6],LeftArm:[0,-1.25,.45],LeftForeArm:[0,0,1.5],RightUpLeg:[-.5,0,0],LeftUpLeg:[-.5,0,0],RightLeg:[.9,0,0],LeftLeg:[.9,0,0],RightFoot:[-.35,0,0],LeftFoot:[-.35,0,0],_y:-.12},
 shootRel:{RightArm:[0,1.1,-1.2],RightForeArm:[0,0,-.15],RightHand:[0,0,.7],LeftArm:[0,-1.1,.9],LeftForeArm:[0,0,.5],Spine:[-.1,0,0],RightLeg:[.15,0,0],LeftLeg:[.15,0,0],RightFoot:[.5,0,0],LeftFoot:[.5,0,0]},
 dunk:{RightArm:[0,.9,-1.35],RightForeArm:[0,0,-.1],LeftArm:[0,-.3,-.7],LeftForeArm:[0,-.4,0],Spine:[-.15,0,0],RightUpLeg:[-.9,0,0],LeftUpLeg:[.2,0,0],RightLeg:[1.4,0,0],LeftLeg:[.5,0,0],RightFoot:[.3,0,0],LeftFoot:[.4,0,0]},
 reb:{RightArm:[0,.6,-1.2],LeftArm:[0,-.6,1.2],RightForeArm:[0,.2,0],LeftForeArm:[0,-.2,0],RightUpLeg:[-.3,0,.1],LeftUpLeg:[-.3,0,-.1],RightLeg:[.6,0,0],LeftLeg:[.6,0,0]},
 block:{RightArm:[0,.55,-1.45],RightForeArm:[0,0,-.1],LeftArm:[0,-.3,-.4],LeftForeArm:[0,-.4,0],Spine:[-.05,0,0],RightUpLeg:[-.3,0,0],LeftUpLeg:[-.1,0,0],RightLeg:[.5,0,0],LeftLeg:[.3,0,0],RightFoot:[.4,0,0],LeftFoot:[.4,0,0]},
 pass:{RightArm:[0,1.45,.3],LeftArm:[0,-1.45,-.3],RightForeArm:[0,.1,0],LeftForeArm:[0,-.1,0],Spine:[.15,0,0]},
 cele:t=>({RightArm:[0,.3,-1.3+.25*Math.sin(t*10)],LeftArm:[0,-.3,1.3-.25*Math.sin(t*10)],RightForeArm:[0,.4,0],LeftForeArm:[0,-.4,0]})};
let DEFSH=0;const _e=new THREE.Euler(),_q=new THREE.Quaternion();
const lum=h=>{const c=new THREE.Color(h);return .299*c.r+.587*c.g+.114*c.b};
export const awayJersey=cols=>{const a=cols[0],b=cols[1];if(lum(a)<.55)return[a,b&&lum(b)>.5?b:'#ffffff'];if(b&&lum(b)<.55)return[b,a];return['#1b2a5c','#ffffff']};
export const homeTrim=cols=>lum(cols[0])<.75?cols[0]:(cols[1]&&lum(cols[1])<.75?cols[1]:'#1b2a5c');

/* ---- NBA 기술 동작 (키프레임) ---- */
const LEGS=(u,l,f=-.2,s=.08)=>({RightUpLeg:[u,0,s],LeftUpLeg:[u,0,-s],RightLeg:[l,0,0],LeftLeg:[l,0,0],RightFoot:[f,0,0],LeftFoot:[f,0,0]});
const mir=p=>{const o={};for(const k in p){if(k[0]==='_'){o[k]=p[k];continue}const n=k.includes('Right')?k.replace('Right','Left'):k.includes('Left')?k.replace('Left','Right'):k;const v=p[k];o[n]=[v[0],-v[1],-v[2]]}return o};
const P_={};
P_.DR={RightArm:[0,.35,1.0],RightForeArm:[0,.75,0],LeftArm:[0,-.7,-.95],LeftForeArm:[0,-.9,0],Spine:[.3,0,0],Spine1:[.08,0,0],...LEGS(-.4,.6),_y:-.07};
P_.DL=mir(P_.DR);
P_.LOW={RightArm:[0,.55,1.15],LeftArm:[0,-.55,-1.15],RightForeArm:[0,.6,0],LeftForeArm:[0,-.6,0],Spine:[.45,0,0],Spine1:[.1,0,0],...LEGS(-.7,1.0,-.3,.16),_y:-.16};
P_.LUNGE={RightArm:[0,.3,1.2],LeftArm:[0,-.3,-1.2],RightForeArm:[0,.5,0],LeftForeArm:[0,-.5,0],Spine:[.45,0,0],Spine1:[.1,0,0],RightUpLeg:[-1.0,0,.18],LeftUpLeg:[.35,0,-.18],RightLeg:[1.1,0,0],LeftLeg:[.7,0,0],RightFoot:[-.1,0,0],LeftFoot:[-.3,0,0],_y:-.2};
P_.GATH={RightArm:[0,1.0,.85],RightForeArm:[0,.95,0],LeftArm:[0,-1.0,-.85],LeftForeArm:[0,-.95,0],Spine:[.22,0,0],Spine1:[0,0,0],...LEGS(-.6,.95,-.3),_y:-.12};
P_.SET={RightArm:[0,1.35,-.45],RightForeArm:[0,0,-1.7],LeftArm:[0,-1.25,.45],LeftForeArm:[0,0,1.5],Spine:[-.02,0,0],Spine1:[0,0,0],...LEGS(-.45,.8,-.3),_y:-.08};
P_.REL={RightArm:[0,1.1,-1.2],RightForeArm:[0,0,-.15],LeftArm:[0,-1.1,.9],LeftForeArm:[0,0,.5],Spine:[-.08,0,0],Spine1:[0,0,0],...LEGS(.02,.12,.5,.04)};
P_.FADE={...P_.REL,Spine:[-.38,0,0],Spine1:[-.12,0,0],RightUpLeg:[-.7,0,.05],RightLeg:[.5,0,0],LeftUpLeg:[.1,0,-.05],LeftLeg:[.3,0,0]};
P_.CDOWN={RightArm:[0,.85,.95],RightForeArm:[0,.95,0],LeftArm:[0,-.85,-.95],LeftForeArm:[0,-.95,0],Spine:[.25,0,0],Spine1:[0,0,0],...LEGS(-.9,1.2,.2)};
P_.LAY={RightArm:[0,.7,-1.4],RightForeArm:[0,0,-.1],LeftArm:[0,-.4,-.7],LeftForeArm:[0,-.5,0],Spine:[-.05,0,0],Spine1:[0,0,0],RightUpLeg:[-1.25,0,.05],LeftUpLeg:[.25,0,-.05],RightLeg:[1.5,0,0],LeftLeg:[.35,0,0],RightFoot:[.3,0,0],LeftFoot:[.5,0,0]};
P_.DNK1={...P_.LAY,RightArm:[0,.9,-1.45]};
P_.DNK2={RightArm:[0,1.0,-1.25],LeftArm:[0,-1.0,1.25],RightForeArm:[0,0,-.2],LeftForeArm:[0,0,.2],Spine:[-.1,0,0],Spine1:[0,0,0],...LEGS(-.9,1.4,.3)};
P_.TOMA={RightArm:[0,.3,-1.5],RightForeArm:[0,0,-1.4],LeftArm:[0,-.5,-.6],LeftForeArm:[0,-.5,0],Spine:[-.25,0,0],Spine1:[-.1,0,0],...LEGS(-1.0,1.5,.3)};
P_.SPIN={RightArm:[0,.55,.85],RightForeArm:[0,1.1,0],LeftArm:[0,-1.0,-.55],LeftForeArm:[0,-.6,0],Spine:[.35,0,0],Spine1:[.1,0,0],...LEGS(-.6,.95,-.25,.14),_y:-.13};
P_.SPINL=mir(P_.SPIN);
/* 점프슛: 게임 픽셀 슛 GIF를 따라 만든 단계별 자세 */
P_.JDIP={RightArm:[0,.9,.95],RightForeArm:[0,1.0,0],LeftArm:[0,-.9,-.95],LeftForeArm:[0,-1.0,0],Spine:[.35,0,0],Spine1:[.08,0,0],...LEGS(-.95,1.45,-.45,.1),_y:-.24};
P_.JCHEST={RightArm:[0,1.15,.55],RightForeArm:[0,1.55,0],LeftArm:[0,-1.15,-.55],LeftForeArm:[0,-1.55,0],Spine:[.2,0,0],Spine1:[.05,0,0],...LEGS(-.75,1.15,-.35,.1),_y:-.18};
P_.JSET={RightArm:[0,1.35,-.55],RightForeArm:[0,0,-1.75],RightHand:[0,0,-.5],LeftArm:[0,-1.2,.35],LeftForeArm:[0,0,1.6],Spine:[-.02,0,0],Spine1:[0,0,0],...LEGS(-.3,.45,-.1,.06),_y:-.04};
P_.JAIR={RightArm:[0,1.25,-.8],RightForeArm:[0,0,-1.55],RightHand:[0,0,-.5],LeftArm:[0,-1.15,.55],LeftForeArm:[0,0,1.45],Spine:[-.05,0,0],Spine1:[0,0,0],...LEGS(.05,.18,.55,.03)};
P_.JREL={RightArm:[0,1.12,-1.28],RightForeArm:[0,0,-.04],RightHand:[0,0,.6],LeftArm:[0,-1.0,.9],LeftForeArm:[0,0,.6],Spine:[-.06,0,0],Spine1:[0,0,0],...LEGS(.05,.15,.55,.03)};
P_.JFOL={RightArm:[0,1.1,-1.15],RightForeArm:[0,0,-.1],RightHand:[0,0,1.25],LeftArm:[0,-.45,-.95],LeftForeArm:[0,-.4,0],Spine:[-.04,0,0],Spine1:[0,0,0],...LEGS(-.15,.35,.3,.05)};
P_.JLAND={RightArm:[0,1.1,-1.1],RightForeArm:[0,0,-.1],RightHand:[0,0,1.25],LeftArm:[0,-.5,-1.0],LeftForeArm:[0,-.4,0],Spine:[.12,0,0],Spine1:[0,0,0],...LEGS(-.55,.9,-.25,.08),_y:-.12};
P_.STAND={RightArm:[0,0,1.25],LeftArm:[0,0,-1.25],RightForeArm:[0,.25,0],LeftForeArm:[0,-.25,0],Spine:[0,0,0],Spine1:[0,0,0],...LEGS(0,0,0,0)};
const DB=(t,amp=1)=>.12+Math.abs(Math.cos(t*Math.PI*2.6))*.7*amp;/* dribble bounce height */
/* key: [t, pose, ball[f,l,u] | 'dr'|'dl' (dribble), root[f,l,u], yawDeg] */
const MV={
 cross:{k:[[0,'DR','dr',[0,0,0],0],[.38,'LOW',[.5,-.06,.2],[0,-.12,0],-12],[.55,'LOW',[.5,.1,.22],[0,0,0],0],[1,'DL','dl',[0,.12,0],12]]},
 legs:{k:[[0,'DR','dr',[0,0,0],0],[.3,'LUNGE',[.25,-.22,.4],[0,0,0],-8],[.5,'LUNGE',[.12,0,.22],[0,0,0],-8],[.7,'LUNGE',[.1,.22,.38],[0,0,0],-5],[1,'DL','dl',[0,0,0],0]]},
 spin:{k:[[0,'DR','dr',[0,0,0],0],[.18,'LOW',[.35,-.25,.3],[.05,0,0],-20],[.38,'SPIN',[.05,-.32,.95],[.15,-.1,.05],-150],[.6,'SPINL',[-.05,.3,.95],[.15,-.15,.05],-270],[.8,'LOW',[.3,.25,.4],[.08,-.08,0],-345],[1,'DL','dl',[0,0,0],-360]]},
 behind:{k:[[0,'DR','dr',[0,0,0],0],[.4,'LOW',[-.25,-.2,.45],[0,0,0],8],[.55,'LOW',[-.28,.1,.45],[0,0,0],8],[1,'DL','dl',[0,0,0],0]]},
 jshot:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.16,'JDIP',[.32,0,.72],[0,0,0],0],[.3,'JCHEST',[.3,0,1.25],[0,0,0],0],[.44,'JSET',[.2,-.05,2.0],[0,0,.08],0],[.56,'JAIR',[.16,-.08,2.4],[0,0,.36],0],[.7,'JREL',[.22,-.1,2.8],[0,0,.46],0],[.8,'JFOL',null,[0,0,.3],0],[.91,'JLAND',null,[0,0,0],0],[1,'JLAND',null,[0,0,0],0]]},
 jfade:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.17,'JDIP',[.32,0,.72],[0,0,0],0],[.31,'JCHEST',[.3,0,1.25],[0,0,0],0],[.45,'JSET',[.2,-.05,2.0],[-.05,0,.08],0],[.57,'FADE',[.05,-.08,2.45],[-.3,0,.4],0],[.66,'FADE',[.05,-.1,2.7],[-.45,0,.45],0],[.8,'FADE',null,[-.6,0,.22],0],[.92,'JLAND',null,[-.65,0,0],0],[1,'JLAND',null,[-.65,0,0],0]]},
 shot:{k:[[0,'GATH',[.28,0,1.05],[0,0,0],0],[.28,'SET',[.14,-.06,2.02],[0,0,0],0],[.5,'REL',[.12,-.12,2.6],[0,0,.42],0],[.85,'REL',null,[0,0,.12],0],[1,'STAND',null,[0,0,0],0]]},
 pull:{k:[[0,'DR','dr',[0,0,0],0],[.22,'GATH',[.28,0,1.0],[0,0,0],0],[.4,'SET',[.14,-.06,2.02],[0,0,.1],0],[.55,'REL',[.12,-.12,2.65],[0,0,.5],0],[.85,'REL',null,[0,0,.15],0],[1,'STAND',null,[0,0,0],0]]},
 stepback:{k:[[0,'DR','dr',[0,0,0],0],[.25,'LOW',[.35,-.15,.35],[0,0,0],0],[.5,'GATH',[.28,0,1.0],[0,0,.18],0],[.62,'GATH',[.28,0,1.0],[0,0,0],0],[.75,'SET',[.14,-.06,2.02],[0,0,.05],0],[.87,'REL',[.12,-.12,2.6],[0,0,.4],0],[1,'REL',null,[0,0,.2],0]]},
 fade:{k:[[0,'GATH',[.28,0,1.05],[0,0,0],0],[.3,'SET',[.14,-.06,2.0],[0,0,0],0],[.55,'FADE',[.0,-.12,2.55],[-.35,0,.5],0],[.85,'FADE',null,[-.6,0,.15],0],[1,'STAND',null,[-.6,0,0],0]]},
 turn:{k:[[0,'LOW',[.3,0,.7],[0,0,0],180],[.3,'GATH',[.28,0,1.0],[0,0,0],100],[.48,'SET',[.14,-.06,2.0],[0,0,.1],0],[.65,'FADE',[.0,-.12,2.55],[-.3,0,.5],0],[.9,'FADE',null,[-.5,0,.12],0],[1,'STAND',null,[-.5,0,0],0]]},
 lay:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.35,'GATH',[.3,0,1.1],[0,0,.25],0],[.62,'LAY',[.25,-.15,2.7],[.2,0,.7],0],[.9,'LAY',null,[.3,0,.3],0],[1,'STAND',null,[.3,0,0],0]]},
 clutch:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.25,'SET',[.15,0,2.1],[.1,0,.55],0],[.48,'CDOWN',[.35,0,1.2],[.2,0,.8],15],[.78,'LAY',[.25,-.15,2.75],[.3,0,.7],0],[.92,'LAY',null,[.35,0,.3],0],[1,'STAND',null,[.35,0,0],0]]},
 dunk:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.3,'GATH',[.3,0,1.05],[.1,0,.1],0],[.6,'DNK1',[.3,-.1,3.05],[.35,0,.95],0],[.8,'DNK1',[.3,-.1,2.9],[.4,0,.8],0],[1,'STAND',null,[.4,0,0],0]]},
 dunk2:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.3,'GATH',[.3,0,1.05],[.1,0,.1],0],[.6,'DNK2',[.3,0,3.1],[.35,0,.95],0],[.8,'DNK2',[.3,0,2.95],[.4,0,.8],0],[1,'STAND',null,[.4,0,0],0]]},
 toma:{k:[[0,'GATH',[.3,0,1.0],[0,0,0],0],[.3,'TOMA',[-.15,-.1,2.4],[.1,0,.4],0],[.55,'TOMA',[-.2,-.1,2.8],[.3,0,.95],0],[.68,'DNK1',[.35,-.1,3.05],[.38,0,.9],0],[.85,'DNK1',null,[.4,0,.7],0],[1,'STAND',null,[.4,0,0],0]]},
};
function sampleMove(name,k,t){const M=MV[name];if(!M)return null;const K=M.k;let i=0;while(i<K.length-2&&k>K[i+1][0])i++;const a=K[i],b=K[i+1],u=Math.min(1,Math.max(0,(k-a[0])/(b[0]-a[0]))),e=u*u*(3-2*u);
  const pa=P_[a[1]],pb=P_[b[1]],pose={};const keys=new Set([...Object.keys(pa),...Object.keys(pb)]);for(const n of keys){if(n[0]==='_'){pose[n]=(pa[n]||0)*(1-e)+(pb[n]||0)*e;continue}const x=pa[n]||[0,0,0],y=pb[n]||[0,0,0];pose[n]=[x[0]+(y[0]-x[0])*e,x[1]+(y[1]-x[1])*e,x[2]+(y[2]-x[2])*e]}
  const bl=s=>s==='dr'?[.34,-.27,DB(t)]:s==='dl'?[.34,.27,DB(t)]:s;let ball=null;const ba=bl(a[2]),bb=bl(b[2]);if(ba&&bb)ball=[ba[0]+(bb[0]-ba[0])*e,ba[1]+(bb[1]-ba[1])*e,ba[2]+(bb[2]-ba[2])*e];else if(ba&&!bb)ball=u<.5?ba:null;
  const ra=a[3],rb=b[3],root=[ra[0]+(rb[0]-ra[0])*e,ra[1]+(rb[1]-ra[1])*e,ra[2]+(rb[2]-ra[2])*e];const yaw=(a[4]+(b[4]-a[4])*e)*Math.PI/180;
  return {pose,ball,root,yaw}}

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
  let arrow=null;if(o.me){arrow=new THREE.Mesh(new THREE.ConeGeometry(.2,.38,4),new THREE.MeshBasicMaterial({color:'#ffd34d',toneMapped:false}));arrow.rotation.x=Math.PI;sc.add(arrow)}
  sc.add(root);
  return {root,bones,bind,mixer,acts,blob,ring,arrow,t:0,pw:0,pose:null,last:null,loco:'idle',yaw:o.yaw||0,
    loc(n,sp){if(n!==this.loco){this.loco=n;for(const k in acts)acts[k].setEffectiveWeight(k===n?1:0)}if(acts[n])acts[n].timeScale=sp||1},
    mcPlay(name,t,w){const C=base.mc&&base.mc[name];if(!C)return null;const loop=!/shot/.test(name);let f=t*C.fps;if(loop){f=((f%C.n)+C.n)%C.n}else f=Math.min(C.n-1.001,Math.max(0,f));const i=Math.floor(f),j=loop?(i+1)%C.n:Math.min(C.n-1,i+1),a=f-i;
      for(const k in C.qa){const bn=bones[k];if(!bn)continue;const q=C.qa[k];_qa.fromArray(q,i*4);_qb.fromArray(q,j*4);_qa.slerp(_qb,a);bn.quaternion.slerp(_qa,w)}
      const lerp=(arr,s)=>[0,1,2].slice(0,s).map(c=>arr[i*s+c]+(arr[j*s+c]-arr[i*s+c])*a);return {y:lerp(C.y,1)[0],d:C.d.length?lerp(C.d,2):[0,0],ball:C.ball[i],dur:C.dur}},
    step(dt){this.t+=dt;mixer.update(dt);
      /* 뛸 때 상체를 앞으로 숙이고 팔을 크게 흔듦 */
      {const tl=this.loco==='run'?.38:this.loco==='walk'?.12:0;this.lean=(this.lean||0)+(tl-(this.lean||0))*Math.min(1,dt*6);const L=this.lean*(1-this.pw);
       if(L>.01){_e.set(L*.55,0,0);_q.setFromEuler(_e);bones.Spine.quaternion.multiply(_q);_e.set(L*.35,0,0);_q.setFromEuler(_e);bones.Spine1.quaternion.multiply(_q);_e.set(-L*.5,0,0);_q.setFromEuler(_e);bones.Neck.quaternion.multiply(_q);
        }}const tg0=this.pose?(typeof this.pose==='object'?this.pose:typeof POSE[this.pose]==='function'?POSE[this.pose](this.t):POSE[this.pose]):null;
      this.pw+=((tg0?1:0)-this.pw)*Math.min(1,dt*12);if(tg0)this.last=tg0;const tg=this.last;this.yoff=0;if(!tg||this.pw<.01)return;
      for(const k in tg){if(k[0]==='_'||!bones[k])continue;const v=tg[k];_e.set(v[0],v[1],v[2]);_q.setFromEuler(_e).premultiply(bind[k]);bones[k].quaternion.slerp(_q,this.pw)}
      this.yoff=(tg._y||0)*this.pw}}}
export const _test={sampleMove,P_};
export async function create(el,cfg){
  SCK=[];NETS=[];
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
    const net=new THREE.Mesh(new THREE.CylinderGeometry(.23,.13,.42,14,5,true),new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:.85}));net.position.copy(W3(hx,25,2.83));sc.add(net);NETS.push({m:net,o:net.geometry.attributes.position.array.slice(),t:9,sd:sd?1:-1,amp:0});
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
  const pl=[];cfg.P.forEach((tm,ti)=>tm.forEach((p,i)=>{const cols=ti===0?cfg.homeCols:cfg.awayCols,wh=ti===0;const AJ=awayJersey(cfg.awayCols);const L=p.look||{};pl.push({src:p,m:makePlayer(sc,base,{skin:p.skin||'#8d5a3b',hairc:p.hair||'#151515',hair:L.hair??0,beard:L.beard||0,band:L.band||0,bandc:wh?cols[0]:'#ffffff',num:L.num??(i*7+3),abbr:ti===0?cfg.homeAbbr:cfg.awayAbbr,jersey:wh?'#f4f4f4':AJ[0],shorts:wh?'#f4f4f4':AJ[0],trim:wh?homeTrim(cols):AJ[1],numc:wh?homeTrim(cols):'#ffffff',socks:L.socks,shoe:L.shoe,bulk:L.bulk||1,leg:L.leg||1.1,blob,me:p.me,scale:L.scale||1,yaw:ti===0?Math.PI/2:-Math.PI/2})})}));
  const ballM=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),M('#e8742a',{roughness:.55}));sc.add(ballM);const ballS=new THREE.Mesh(new THREE.PlaneGeometry(.45,.45),new THREE.MeshBasicMaterial({map:blob,transparent:true,depthWrite:false}));ballS.rotation.x=-Math.PI/2;ballS.position.y=.012;sc.add(ballS);
  const HOOP=s=>W3(s>0?88.75:5.25,25,3.05);
  const camX={v:0,init:0};let flPrev=false,flS=null,lastBp=null;let focus=0,fz=0,fSrc=null,fp=0;const fpPos=new THREE.Vector3();let alive=true,last=performance.now(),acc=0;
  const ang=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
  function frame(now){if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const B=cfg.ball,hold=B.hold&&!B.fl?B.hold:null;
    for(const q of pl){const s=q.src,m=q.m;const wp=W3(s.x,s.y);const prev=m.prev||wp;const vel=wp.clone().sub(prev).divideScalar(Math.max(dt,1e-3));m.prev=wp.clone();const sp=Math.hypot(vel.x,vel.z);
      let want=m.yaw;if(sp>.4)want=Math.atan2(vel.x,vel.z);else{const tgt=hold?W3(hold.x,hold.y):W3(B.x,B.y);const off=s.team===cfg.offTeam();const aim=off?(hold===s?HOOP(cfg.dir()):tgt):tgt;if(!(hold===s&&!off))want=Math.atan2(aim.x-wp.x,aim.z-wp.z)}
      m.yaw+=ang(m.yaw,want)*Math.min(1,dt*9);m.root.rotation.y=m.yaw;
      const mvS=s.mv&&now-s.mvT<s.mvD?sampleMove(s.mv,(now-s.mvT)/s.mvD,now/1000):null;m.mvS=mvS;
      const act=s.act&&now-s.actT<(s.actD||700)?s.act:null;
      let pose=null,jump=0;
      if(act==='shoot'){const k=(now-s.actT)/(s.actD||700);pose=k<.45?'shootSet':'shootRel';jump=k<.25?0:Math.sin(Math.min(1,(k-.25)/.6)*Math.PI)*.45}
      else if(act==='dunk'){const k=(now-s.actT)/(s.actD||700);pose='dunk';jump=Math.sin(Math.min(1,k)*Math.PI)*.95}
      else if(act==='reb'||act==='block'){const k=(now-s.actT)/(s.actD||700);pose=act;jump=Math.sin(Math.min(1,k)*Math.PI)*.6}
      else if(act==='pass')pose='pass';else if(act==='cele')pose='cele';
      else if(hold===s)pose='dribble';
      else if(s.team!==cfg.offTeam()&&sp<4.5){pose='defend';/* 수비 슬라이드: 공 쪽을 보며 옆으로 */const tgt=hold?W3(hold.x,hold.y):W3(B.x,B.y);m.yaw+=ang(m.yaw,Math.atan2(tgt.x-wp.x,tgt.z-wp.z))*Math.min(1,dt*10);m.root.rotation.y=m.yaw;m.sh=(m.sh||0)+dt*sp*2.2;DEFSH=sp>.5?Math.sin(m.sh*3):0}
      if(mvS){pose=mvS.pose;jump=0}
      /* 모션캡처 선택 */
      let mcN=null,mcT=0;const MCv=base.mc;
      if(MCv){if(s.mv&&MCMAP[s.mv]&&now-s.mvT<s.mvD){mcN=MCMAP[s.mv];mcT=(now-s.mvT)/s.mvD*MCv[mcN].dur}
        else if(!act&&!mvS&&hold===s){mcN=sp>.9?'drun':'didle';m.mcClock=(m.mcClock||0)+dt*(mcN==='drun'?Math.min(1.6,Math.max(.6,sp/1.5)):1);mcT=m.mcClock}
        else if(!act&&!mvS&&!pose&&sp>2.6){mcN='run';m.mcClock=(m.mcClock||0)+dt*Math.min(1.5,Math.max(.7,sp/3.3));mcT=m.mcClock}}
      if(mcN&&(mcN==='didle'||mcN==='drun'))pose=null;
      m.mcw=(m.mcw||0)+((mcN?1:0)-(m.mcw||0))*Math.min(1,dt*10);if(mcN)m.mcLast=mcN,m.mcLastT=mcT;
      m.pose=pose;m.loc(sp>3.2?'run':sp>.5?'walk':'idle',sp>3.2?Math.min(1.5,sp/5):1);m.step(dt);
      m.mcR=null;if(m.mcw>.01&&m.mcLast){m.mcR=m.mcPlay(m.mcLast,mcN?mcT:m.mcLastT,m.mcw);if(m.mcR){const sc_=m.root.scale.x;jump=jump*(1-m.mcw)+(m.mcR.y-1.04)*sc_*m.mcw;if(MCMAP[s.mv]&&mcN&&/shot/.test(mcN)){m.mcD=m.mcR.d}else m.mcD=null}}
      let rx=0,rz=0,ry=0;if(m.mcD&&m.mcR){const fw=new THREE.Vector3(Math.sin(m.yaw),0,Math.cos(m.yaw)),lf=new THREE.Vector3(fw.z,0,-fw.x);rx=(fw.x*m.mcD[1]+lf.x*m.mcD[0])*m.mcw;rz=(fw.z*m.mcD[1]+lf.z*m.mcD[0])*m.mcw}
      if(mvS){const fw=new THREE.Vector3(Math.sin(m.yaw),0,Math.cos(m.yaw)),lf=new THREE.Vector3(fw.z,0,-fw.x);rx=fw.x*mvS.root[0]+lf.x*mvS.root[1];rz=fw.z*mvS.root[0]+lf.z*mvS.root[1];ry=mvS.root[2];m.root.rotation.y=m.yaw+mvS.yaw}
      m.root.position.set(wp.x+rx,(m.yoff||0)+jump+ry,wp.z+rz);m.blob.position.set(wp.x,.01,wp.z);m.blob.scale.setScalar(1-jump*.35);if(m.ring)m.ring.position.set(wp.x,.015,wp.z);if(m.arrow){m.arrow.position.set(m.root.position.x,m.root.position.y+2.45*m.root.scale.y+.12*Math.sin(now/180),m.root.position.z);m.arrow.rotation.y=now/600}}
    /* ball */
    let bp;
    if(B.thru!=null){bp=HOOP(cfg.dir());bp.y=3.05-B.thru*2.9}
    else if(B.fl&&B.from&&B.dest){if(!flPrev||!flS)flS=lastBp?lastBp.clone():null;const k=B.k||0,a=flS&&B.hy0==null?flS.clone().setY(0):W3(B.from[0],B.from[1]),b=W3(B.dest[0],B.dest[1]);const toHoop=Math.hypot(B.dest[0]-(cfg.dir()>0?88.75:5.25),B.dest[1]-25)<1.5;
      const h0=B.hy0!=null?B.hy0:flS?flS.y:toHoop?2.5:1.3,h1=toHoop?3.12:1.3,arc=toHoop?(B.arc||6)*.32:.35;bp=a.lerp(b,k);bp.y=h0+(h1-h0)*k+Math.sin(k*Math.PI)*arc}
    else if(hold&&pl.find(o=>o.src===hold).m.mcR&&pl.find(o=>o.src===hold).m.mcw>.5){const q=pl.find(o=>o.src===hold).m,Bl=q.mcR.ball,sc_=q.root.scale.x,fw=new THREE.Vector3(Math.sin(q.yaw),0,Math.cos(q.yaw)),lf=new THREE.Vector3(fw.z,0,-fw.x);bp=q.root.position.clone().setY(0).add(fw.multiplyScalar(Bl[2]*sc_)).add(lf.multiplyScalar(Bl[0]*sc_));bp.y=Bl[1]*sc_}
    else if(hold&&pl.find(o=>o.src===hold).m.mvS&&pl.find(o=>o.src===hold).m.mvS.ball&&pl.find(o=>o.src===hold).m.mvS.ball[2]>.95&&!/^(cross|legs|behind|spin)$/.test(hold.mv)){/* 공은 실제 손뼈 위치에 붙음 → 팔을 다 뻗을 때까지 손에 있음 */const q=pl.find(o=>o.src===hold).m;q.root.updateMatrixWorld(true);const R=new THREE.Vector3().setFromMatrixPosition(q.bones.RightHand.matrixWorld),L=new THREE.Vector3().setFromMatrixPosition(q.bones.LeftHand.matrixWorld),fw=new THREE.Vector3(Math.sin(q.yaw+(q.mvS.yaw||0)),0,Math.cos(q.yaw+(q.mvS.yaw||0)));
      if(R.distanceTo(L)<.42)bp=R.clone().add(L).multiplyScalar(.5).add(fw.multiplyScalar(.1)).add(new THREE.Vector3(0,.04,0));else bp=R.clone().add(new THREE.Vector3(0,.13,0)).add(fw.multiplyScalar(.03))}
    else if(hold&&pl.find(o=>o.src===hold).m.mvS&&pl.find(o=>o.src===hold).m.mvS.ball){const q=pl.find(o=>o.src===hold).m,S=q.mvS,ya=q.yaw+S.yaw,fw=new THREE.Vector3(Math.sin(ya),0,Math.cos(ya)),lf=new THREE.Vector3(fw.z,0,-fw.x);bp=q.root.position.clone().setY(0).add(fw.multiplyScalar(S.ball[0]*(q.root.scale.x))).add(lf.multiplyScalar(S.ball[1]));bp.y=S.ball[2]*q.root.scale.y}
    else if(hold){const q=pl.find(o=>o.src===hold).m;const r=new THREE.Vector3(Math.sin(q.yaw),0,Math.cos(q.yaw)),side=new THREE.Vector3(-r.z,0,r.x);const ph=(now/1000*5.5)%1,b=Math.abs(Math.cos(ph*Math.PI));
      const act=hold.act&&now-hold.actT<(hold.actD||700)?hold.act:null;
      if(act==='shoot'||act==='dunk'){bp=q.root.position.clone().add(r.clone().multiplyScalar(.15));bp.y+=act==='dunk'?2.45:2.2}
      else{bp=q.root.position.clone().add(r.multiplyScalar(.32)).add(side.multiplyScalar(-.26));bp.y=.12+b*.78}}
    else bp=W3(B.x,B.y,.12+(B.z||0)*.1);
    /* 그물 흔들림 */
    {const thru=B.thru;for(const N of NETS){const act=thru!=null&&N.sd===cfg.dir();if(act&&!N.on){N.t=0;N.amp=1}N.on=act;N.t+=dt;const decay=Math.exp(-N.t*2.6)*N.amp;if(decay<.003&&!act)continue;
      const pa=N.m.geometry.attributes.position,o=N.o,by=act?(.21-thru*.5):9;for(let i=0;i<pa.count;i++){const x=o[i*3],y=o[i*3+1],z=o[i*3+2],d=.21-y,depth=Math.max(0,d/.42);
        const bulge=act?Math.exp(-Math.pow((y-(by)) / .1,2))*.45:0,sw=Math.sin(N.t*16+y*8)*.05*decay*depth;const r=1+bulge+Math.sin(N.t*22)*.06*decay*depth;
        pa.array[i*3]=x*r+sw;pa.array[i*3+2]=z*r+sw*.6;pa.array[i*3+1]=y-(act?.04*bulge:0)+Math.sin(N.t*18)*.03*decay*depth}pa.needsUpdate=true}}
    flPrev=!!B.fl;if(!B.fl)flS=null;lastBp=bp.clone();
    ballM.position.copy(bp);ballM.rotation.x+=dt*6;ballS.position.set(bp.x,.012,bp.z);ballS.scale.setScalar(Math.max(.3,1-bp.y*.15));
    /* 2K low broadcast camera: sideline, slightly elevated, follows the ball */
    let mx=0;for(const q of pl)mx+=q.m.root.position.x;mx/=pl.length;const tx=Math.max(-11,Math.min(11,bp.x*.4+mx*.6+cfg.dir()*1.8));if(!camX.init){camX.v=tx;camX.init=1}camX.v+=(tx-camX.v)*Math.min(1,dt*3);
    fz+=(focus-fz)*Math.min(1,dt*2);const fpT=fSrc?pl.find(o=>o.src===fSrc):null;fp+=((fpT?1:0)-fp)*Math.min(1,dt*3.2);if(fpT)fpPos.lerp(fpT.m.root.position,Math.min(1,dt*6));
      cam.fov=24-fz*7-fp*6;cam.updateProjectionMatrix();
      const nx=camX.v*.82+fz*camX.v*.12,ny=6.4-fz*1.6,nz=16.8-fz*2,lx=camX.v+fz*cfg.dir()*1.2,ly=.2+fz*.9,lz=-1.2;
      const zx=fpPos.x-cfg.dir()*2.2,zy=2.4,zz=fpPos.z+8.5;
      cam.position.set(nx+(zx-nx)*fp,ny+(zy-ny)*fp,nz+(zz-nz)*fp);cam.lookAt(lx+(fpPos.x+cfg.dir()*.6-lx)*fp,ly+(1.5-ly)*fp,lz+(fpPos.z-lz)*fp);
    {const v=cfg.shot?cfg.shot():null;const txt=v==null?'':v<5?Math.max(0,v).toFixed(1):String(Math.ceil(v));for(const S of SCK){if(S.last===txt)continue;S.last=txt;const x=S.cv.getContext('2d');x.fillStyle='#0a0a0a';x.fillRect(0,0,256,128);x.font='900 104px "Courier New",monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle=v!=null&&v<5?'#ff2b2b':'#ffb020';x.shadowColor=x.fillStyle;x.shadowBlur=18;x.fillText(txt,128,68);S.tx.needsUpdate=true}}
    if(CROWD){const C=CROWD,t=now/1000,exc=cfg.hype?cfg.hype():0;for(let k=0;k<40;k++){const i=(Math.random()*C.n)|0,[x,y,z,h,ph]=C.crowdY[i];const b=Math.max(0,Math.sin(t*(3+exc*4)+ph))*(.03+exc*.18);C.m.compose(new THREE.Vector3(x,y+.25*h+b,z),new THREE.Quaternion(),new THREE.Vector3(1,h,1));C.body.setMatrixAt(i,C.m);C.m.makeTranslation(x,y+.6*h+b,z);C.head.setMatrixAt(i,C.m)}C.body.instanceMatrix.needsUpdate=C.head.instanceMatrix.needsUpdate=true}
    ren.render(sc,cam);requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  return {focus(v){focus=v?1:0},zoom(src){fSrc=src||null},dispose(){alive=false;ren.dispose();ren.domElement.remove();sc.traverse(o=>{if(o.geometry)o.geometry.dispose()})},resize(){const w=el.clientWidth,h=el.clientHeight;ren.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}};
}
