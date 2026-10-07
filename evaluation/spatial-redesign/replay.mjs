
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import * as beforeGeometry from './before-house-geometry.js';
import * as geometry from './after-house-geometry.js';
import {createHouseCamera as beforeCamera} from './before-house-camera.js';
import {createHouseCamera as afterCamera} from './after-house-camera.js';
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const report={protocolHash:hash('evaluation/spatial-redesign/protocol.md'),sourceHashes:{beforeCamera:hash('evaluation/spatial-redesign/before-house-camera.js'),afterCamera:hash('evaluation/spatial-redesign/after-house-camera.js'),beforeGeometry:hash('evaluation/spatial-redesign/before-house-geometry.js'),afterGeometry:hash('evaluation/spatial-redesign/after-house-geometry.js')}};
const walkable = (api,layout) => {let count=0;for(let x=-layout.width/2;x<=layout.width/2;x+=.25)for(let z=-layout.depth/2;z<=layout.depth/2;z+=.25)if(api.validPosition(layout,{x,z}))count++;return count;};
const routes = api => {let clear=0;for(let capacity=2;capacity<=6;capacity++){const layout=api.createLayout(capacity);const targets=[...layout.doors.map(d=>d.target),...layout.seats.map(s=>s.target),layout.boardTarget];for(const target of targets)for(const [a,b] of [[layout.spawn,target],[target,layout.spawn]])if(api.findRoute(layout,a,b))clear++;}return clear;};
report.geometry={before:{dimensions:[12,8],walkableSamples:walkable(beforeGeometry,beforeGeometry.createLayout(6)),clearRoutes:routes(beforeGeometry)},after:{dimensions:[16,11],walkableSamples:walkable(geometry,geometry.createLayout(6)),clearRoutes:routes(geometry)}};
const piece=(id,kind,x,z)=>({id,kind,x,z,rotation:0,colour:'sage'});
const saved=[piece('bed','bed',-3,-1.5),piece('desk','desk',3,-2),piece('chair','chair',3,0),piece('shelf','shelf',-4.5,1),piece('plant','plant',4.5,1.5),piece('lamp','lamp',1.5,1.5)];
const ten=[...saved,piece('p2','plant',-5.5,-3.5),piece('s2','shelf',4,-4),piece('l2','lamp',-2,1.5),piece('p3','plant',5.5,3.5)];
report.bedroom={savedBefore:beforeGeometry.validatePlacements(saved),savedAfter:geometry.validatePlacements(saved),tenBefore:beforeGeometry.validatePlacements(ten),tenAfter:geometry.validatePlacements(ten),savedTransformsEqual:JSON.stringify(geometry.bedroomLayout(saved).obstacles)===JSON.stringify(beforeGeometry.bedroomLayout(saved).obstacles)};
const orientation=geometry.CAMERA_ORIENTATION,camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,60);
camera.position.set(orientation.x,orientation.y,orientation.z);camera.lookAt(0,orientation.lookY,0);camera.updateMatrixWorld(true);
const projected=(p,height=geometry.AVATAR_HEIGHT/2)=>new THREE.Vector3(p.x,height,p.z).applyMatrix4(camera.matrixWorldInverse);
const room=geometry.createLayout(6),corners=[];
for(const x of [-room.width/2,room.width/2])for(const y of [0,2.55])for(const z of [-room.depth/2,room.depth/2])corners.push(projected({x,z},y));
const bounds={minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxY:Math.max(...corners.map(p=>p.y))};
const uprightHeight=Math.abs(projected({x:0,z:0},geometry.AVATAR_HEIGHT).y-projected({x:0,z:0},0).y);
const targets=[...room.doors.map(d=>d.target),...room.seats.map(s=>s.target),room.boardTarget],route=[];
for(const target of targets) route.push(...geometry.findRoute(room,room.spawn,target).map(p=>projected(p)));
report.camera={};
for(const [name,width,height,safeRects] of [['portrait',390,844,[{x:0,y:0,w:390,h:210},{x:0,y:560,w:390,h:284}]],['desktop',1920,1080,[{x:0,y:0,w:1920,h:84},{x:0,y:942,w:1920,h:138}]]]){
 const config={width,height,bounds,uprightHeight,viewport:{left:0,top:0,right:width,bottom:height},safeRects};
 const screen=(value,p)=>({x:(p.x-value.left)*value.pxPerUnit,y:(value.top-p.y)*value.pxPerUnit});
 const inside=(value,p,actorHeight)=>{const s=screen(value,p),a=value.area;return s.x>=a.x-1e-6&&s.x<=a.x+a.w+1e-6&&s.y-actorHeight/2>=a.y-1e-6&&s.y+actorHeight/2<=a.y+a.h+1e-6;};
 const data={routeSamples:route.length};
 for(const [candidate,factory] of [['original',beforeCamera],['revised',afterCamera]]){
  const rig=factory();rig.configure(config);let value=rig.frame(projected(room.spawn),0),fixed=value,loss=0,followLoss=0;
  for(const p of route){if(!inside(fixed,p,uprightHeight*fixed.pxPerUnit))loss++;value=rig.frame(p,1/60);if(!inside(value,p,uprightHeight*value.pxPerUnit))followLoss++;}
  const final=route.at(-1);for(let i=0;i<300;i++)value=rig.frame(final,1/60);
  const settled={...value};for(let i=0;i<300;i++)value=rig.frame(final,1/60);
  const idleDriftPx=Math.max(Math.abs(value.left-settled.left),Math.abs(value.top-settled.top))*value.pxPerUnit;
  const probe=factory();probe.configure(config);probe.frame({x:0,y:0},0);const old=probe.frame({x:3,y:0},.1);
  const movedRect=name==='portrait'?{x:0,y:220,w:180,h:240}:{x:1300,y:100,w:400,h:600};
  probe.configure({...config,safeRects:[...safeRects,movedRect]});const hud=probe.frame({x:3,y:0},0);
  data[candidate]={avatarPixels:uprightHeight*value.pxPerUnit,followLossSamples:followLoss,stationaryControlLossSamples:loss,idleDriftPx,hudJumpPx:Math.hypot(hud.left-old.left,hud.top-old.top)*old.pxPerUnit,scaleChange:Math.abs(hud.pxPerUnit-old.pxPerUnit),finalInside:inside(value,final,uprightHeight*value.pxPerUnit)};
 }
 report.camera[name]=data;
}
report.pass=report.geometry.after.clearRoutes===90&&report.geometry.after.walkableSamples>report.geometry.before.walkableSamples&&report.bedroom.savedAfter&&report.bedroom.tenAfter&&report.bedroom.savedTransformsEqual&&Object.values(report.camera).every(r=>r.revised.hudJumpPx===0&&r.revised.scaleChange===0&&r.revised.idleDriftPx===0&&r.revised.finalInside&&r.revised.stationaryControlLossSamples>0&&r.revised.followLossSamples===0);
fs.mkdirSync('.local/spatial-redesign-replay',{recursive:true});
fs.writeFileSync('.local/spatial-redesign-replay/current-comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exitCode=1;
