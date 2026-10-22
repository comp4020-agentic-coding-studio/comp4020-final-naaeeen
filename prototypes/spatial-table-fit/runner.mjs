import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createLayout, validPosition, findRoute, footprint, bedroomLayout } from '../../public/house-geometry.js';

const [label, radiusText, approachText, protocolPath] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label ?? '') || !protocolPath) throw Error('Usage: runner.mjs label chairRadius approachRadius protocolPath');
const radius = Number(radiusText), approachRadius = Number(approachText);
if (!(radius > 0 && approachRadius > radius)) throw Error('Invalid declared radii');
const root = new URL('../../', import.meta.url);
const digest = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const sourcePaths = ['public/house-geometry.js','public/house-version.js','src/house-realtime.ts','public/house-world.js'];
const clone = value => structuredClone(value);
const chairObstacle = seat => {
  const yaw = seat.heading + Math.PI, s = Math.sin(yaw), c = Math.cos(yaw);
  return { id: seat.id, x: seat.x + s * .035, z: seat.z + c * .035,
    w: Math.abs(c) * .78 + Math.abs(s) * .8, d: Math.abs(s) * .78 + Math.abs(c) * .8 };
};
function candidate(capacity) {
  const result = createLayout(capacity, 'expanded');
  const ids = new Set(result.seats.filter(s => s.purpose === 'game').map(s => s.id));
  const centre = result.obstacles.find(o => o.id === 'game-table');
  result.seats = result.seats.filter(s => s.purpose !== 'game');
  result.obstacles = result.obstacles.filter(o => !ids.has(o.id));
  for (let i = 0; i < capacity; i++) {
    const angle = Math.PI/2 + i * 2*Math.PI/capacity, dx = Math.cos(angle), dz = Math.sin(angle);
    const seat = { id: `game-seat-${i+1}`, purpose: 'game', x: centre.x + dx*radius,
      z: centre.z + dz*radius, heading: Math.atan2(-dx,-dz),
      target: { x: centre.x + dx*approachRadius, z: centre.z + dz*approachRadius } };
    result.seats.push(seat); result.obstacles.push(chairObstacle(seat));
  }
  return result;
}
function rectangle(x,z,w,d,yaw=0) {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b]) => ({x:x+a*c+b*s,z:z-a*s+b*c}));
}
function chairPolygon(seat) {
  const yaw=seat.heading+Math.PI;
  return rectangle(seat.x+Math.sin(yaw)*.035,seat.z+Math.cos(yaw)*.035,.78,.8,yaw);
}
function overlaps(a,b) {
  for (const polygon of [a,b]) for(let i=0;i<polygon.length;i++) {
    const p=polygon[i],q=polygon[(i+1)%polygon.length],axis={x:-(q.z-p.z),z:q.x-p.x};
    const ap=a.map(v=>v.x*axis.x+v.z*axis.z),bp=b.map(v=>v.x*axis.x+v.z*axis.z);
    if (Math.max(...ap)<=Math.min(...bp)+1e-10 || Math.max(...bp)<=Math.min(...ap)+1e-10) return false;
  }
  return true;
}
function invariant(layout,baseline) {
  const strip = value => {
    const result=clone(value),ids=new Set(result.seats.filter(s=>s.purpose==='game').map(s=>s.id));
    result.seats=result.seats.filter(s=>s.purpose!=='game');
    result.obstacles=result.obstacles.filter(o=>!ids.has(o.id));return result;
  };
  return JSON.stringify(strip(layout))===JSON.stringify(strip(baseline));
}
function grade(layout,capacity,baseline=layout) {
  const chairs=layout.seats.filter(s=>!s.fixtureId),byId=new Map(chairs.map(s=>[s.id,s]));
  const polygons=new Map(chairs.map(s=>[s.id,chairPolygon(s)]));
  const bounds=chairs.map(seat=>({id:seat.id,pass:polygons.get(seat.id).every(p=>Math.abs(p.x)<=layout.width/2+1e-10&&Math.abs(p.z)<=layout.depth/2+1e-10)}));
  const collisions=[];
  for (const seat of chairs) for(const obstacle of layout.obstacles) {
    if(obstacle.id===seat.id) continue;
    const other=byId.has(obstacle.id)?polygons.get(obstacle.id):rectangle(obstacle.x,obstacle.z,obstacle.w,obstacle.d);
    if(overlaps(polygons.get(seat.id),other)) collisions.push({chair:seat.id,obstacle:obstacle.id});
  }
  const approaches=layout.seats.map(seat=>({id:seat.id,purpose:seat.purpose,target:seat.target,
    distance:Math.hypot(seat.x-seat.target.x,seat.z-seat.target.z),
    valid:validPosition(layout,seat.target),withinClaimRange:Math.hypot(seat.x-seat.target.x,seat.z-seat.target.z)<=1.5}));
  const destinations=[...layout.seats.map(s=>({id:s.id,purpose:s.purpose,target:s.target})),
    {id:'board',target:layout.boardTarget},...layout.doors.map(d=>({id:d.id,target:d.target})),{id:'exit',target:layout.exitTarget}];
  const routes=destinations.map(d=>({ ...d,valid:validPosition(layout,d.target),reachable:findRoute(layout,layout.spawn,d.target)!==null}));
  const gameTargetDiagnostic={target:layout.gameTarget,valid:validPosition(layout,layout.gameTarget),reachable:findRoute(layout,layout.spawn,layout.gameTarget)!==null};
  const criteria={capacity:layout.seats.filter(s=>s.purpose==='game').length===capacity,
    uniqueSeatIds:new Set(layout.seats.map(s=>s.id)).size===layout.seats.length,
    fullChairBounds:bounds.every(b=>b.pass),fullChairNonoverlap:collisions.length===0,
    validApproaches:approaches.every(a=>a.valid),claimRange:approaches.every(a=>a.withinClaimRange),
    gameRoutes:routes.filter(r=>r.purpose==='game').every(r=>r.reachable),
    studyRestRoutes:routes.filter(r=>['study','rest'].includes(r.purpose)).every(r=>r.reachable),
    boardRoute:routes.find(r=>r.id==='board').reachable,doorRoutes:routes.filter(r=>r.id.startsWith('door-')).every(r=>r.reachable),
    exitRoute:routes.find(r=>r.id==='exit').reachable,fixedGeometry:invariant(layout,baseline)};
  return {criteria,pass:Object.values(criteria).every(Boolean),gameSeatCount:layout.seats.filter(s=>s.purpose==='game').length,bounds,collisions,approaches,routes,gameTargetDiagnostic};
}
const positive=createLayout(2,'expanded'),positiveGrade=grade(positive,2);
const duplicate=clone(positive);duplicate.seats.at(-1).id=duplicate.seats.at(-2).id;
const fixtureTarget=clone(positive);fixtureTarget.seats.at(-1).target={x:-6.2,z:3.3};
const outOfBounds=clone(positive);outOfBounds.seats.at(-1).target={x:100,z:100};
const enclosed=clone(positive);enclosed.boardTarget={x:2,z:2};
for (const [id,x,z,w,d] of [['left',1,2,.2,2.2],['right',3,2,.2,2.2],['upper',2,1,2.2,.2],['lower',2,3,2.2,.2]]) enclosed.obstacles.push({id:`control-${id}`,x,z,w,d});
const bedroom=bedroomLayout([{id:'control-chair',kind:'chair',x:-3,z:0,rotation:0}]);
const bedroomFootprint=footprint({id:'control-chair',kind:'chair',x:-3,z:0,rotation:0});
const duplicateGrade=grade(duplicate,2),fixtureGrade=grade(fixtureTarget,2),outGrade=grade(outOfBounds,2),enclosedGrade=grade(enclosed,2);
const controls={knownValidExpanded2:{pass:positiveGrade.pass,criteria:positiveGrade.criteria},
  bedroomFootprint:{pass:bedroomFootprint.w===.8&&bedroomFootprint.d===.8&&validPosition(bedroom,bedroom.seats[0].target)&&findRoute(bedroom,bedroom.spawn,bedroom.seats[0].target)!==null,footprint:bedroomFootprint},
  duplicateId:{pass:!duplicateGrade.criteria.uniqueSeatIds&&!duplicateGrade.pass,criteria:duplicateGrade.criteria},
  targetInsideFixture:{pass:!fixtureGrade.criteria.validApproaches&&!fixtureGrade.criteria.gameRoutes&&!fixtureGrade.pass,criteria:fixtureGrade.criteria},
  outOfBoundsTarget:{pass:!outGrade.criteria.validApproaches&&!outGrade.criteria.gameRoutes&&!outGrade.pass,criteria:outGrade.criteria},
  enclosedValidTarget:{pass:validPosition(enclosed,enclosed.boardTarget)&&!enclosedGrade.criteria.boardRoute&&!enclosedGrade.pass,valid:validPosition(enclosed,enclosed.boardTarget),criteria:enclosedGrade.criteria}};
const comparisons=[];
for(let capacity=2;capacity<=6;capacity++) {
  const baseline=createLayout(capacity,'expanded'),ring=candidate(capacity);
  comparisons.push({capacity,baseline:grade(baseline,capacity),candidate:grade(ring,capacity,baseline),layouts:{baseline,candidate:ring}});
}
const pass=Object.values(controls).every(c=>c.pass)&&comparisons.every(c=>c.candidate.pass);
const result={label,study:'MECHANICAL STUDY; no human, pixel, performance or production acceptance claim',
  runtime:{binary:process.execPath,version:process.version,argv:process.argv.slice(1)},
  sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,digest(p)])),
  runnerHash:digest('prototypes/spatial-table-fit/runner.mjs'),protocol:{path:protocolPath,sha256:digest(protocolPath)},
  declaredGeometry:{radius,approachRadius,startAngle:'pi/2',centre:{x:-6.2,z:3.3}},controls,comparisons,pass,expectedExit:pass?0:1};
const escape=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function panel(layout,xOffset,title,verdict) {
  const scale=24,ox=xOffset+250,oy=280,at=p=>({x:ox+p.x*scale,y:oy+p.z*scale});
  let s=`<g><text x="${xOffset+10}" y="28" class="panel-title">${escape(title)} — ${verdict}</text><rect x="${ox-240}" y="${oy-168}" width="480" height="336" fill="#f9f7f2" stroke="#303a38"/>`;
  for(const o of layout.obstacles) if(!layout.seats.some(seat=>seat.id===o.id&&!seat.fixtureId)) s+=`<rect x="${ox+(o.x-o.w/2)*scale}" y="${oy+(o.z-o.d/2)*scale}" width="${o.w*scale}" height="${o.d*scale}" fill="${o.id==='game-table'?'#c69d6f':o.id==='table'?'#a9c5b8':'#dedcd5'}" stroke="#666"/>`;
  for(const seat of layout.seats) {
    const a=at(seat),b=at(seat.target),colour=seat.purpose==='game'?'#9a3e32':seat.purpose==='study'?'#2b6c57':'#445c9a';
    if(!seat.fixtureId)s+=`<polygon points="${chairPolygon(seat).map(p=>{const q=at(p);return `${q.x},${q.y}`}).join(' ')}" fill="${colour}" fill-opacity=".28" stroke="${colour}"/>`;
    s+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${colour}" stroke-dasharray="3 3"/><circle cx="${a.x}" cy="${a.y}" r="3" fill="${colour}"/><circle cx="${b.x}" cy="${b.y}" r="4" fill="white" stroke="${colour}"/>`;
    if(seat.purpose==='game')s+=`<text x="${a.x+5}" y="${a.y-5}" fill="${colour}">G${escape(seat.id.split('-').at(-1))}</text>`;
  }
  for(const d of layout.doors){const p=at(d),t=at(d.target);s+=`<rect x="${p.x-8}" y="${p.y-3}" width="16" height="6" fill="#4b679b"/><text x="${p.x-9}" y="${p.y-8}">D${d.slot+1}</text><circle cx="${t.x}" cy="${t.y}" r="4" fill="white" stroke="#4b679b"/>`;}
  for(const [name,position] of [['spawn',layout.spawn],['board',layout.boardTarget],['exit',layout.exitTarget],['old game target',layout.gameTarget]]){const p=at(position);s+=`<path d="M${p.x-4} ${p.y}h8 M${p.x} ${p.y-4}v8" stroke="#111"/><text x="${p.x+5}" y="${p.y+4}">${name}</text>`;}
  for(const [name,p] of [['STUDY',{x:-1,z:-3.6}],['GAME',{x:-6.2,z:3.3}],['REST',{x:5.9,z:2.5}]]){const a=at(p);s+=`<text x="${a.x}" y="${a.y}" text-anchor="middle" class="zone">${name}</text>`;}
  return s+`<text x="${xOffset+10}" y="488">Coordinates: x −10…10 m; z −7…7 m; 1 m = 24 SVG units.</text></g>`;
}
const six=comparisons.at(-1);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 580" role="img" aria-labelledby="title description"><title id="title">MECHANICAL STUDY: six-person house table fit</title><desc id="description">Actual world coordinates. Baseline has two game seats. Candidate has six. Solid dots are chair centres and hollow circles approach targets. This is neither a finished 3D design nor a real-user study.</desc><style>text{font:11px system-ui;fill:#26332e}.panel-title{font-size:16px;font-weight:bold}.zone{font-size:12px;font-weight:bold;paint-order:stroke;stroke:#f9f7f2;stroke-width:3px}</style><rect width="1040" height="580" fill="white"/>${panel(six.layouts.baseline,0,'Baseline: 2 game places',six.baseline.pass?'PASS':'FAIL')}${panel(six.layouts.candidate,520,`Ring: 6 game places, r=${radius} m`,six.candidate.pass?'PASS':'FAIL')}<text x="20" y="525" class="panel-title">MECHANICAL STUDY · ${escape(label)}</text><text x="20" y="548">Solid dot = seat centre · hollow circle = approach · coloured polygon = full chair · D = door.</text><text x="20" y="566">Fixed 20 × 14 m lounge; no human, pixel, performance or finished-design claim. See JSON for each criterion/capacity.</text></svg>`;
const base=`docs/spatial-redesign/evidence/table-fit-${label}`;
writeFileSync(new URL(`${base}.svg`,root),svg+'\n');
writeFileSync(new URL(`${base}.html`,root),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MECHANICAL STUDY — table fit</title><style>body{font:16px system-ui;margin:20px;background:#eceeea}main{max-width:1300px;margin:auto}svg{width:100%;height:auto;background:white}p{max-width:85ch}</style><main><h1>MECHANICAL STUDY: table fit</h1><p>Six-person house geometry, ${escape(label)}. This figure checks physical fit and existing routing only. It does not establish user value, finished 3D appearance, phone usability or performance.</p>${svg}<p>Candidate radius ${radius} m; approach radius ${approachRadius} m. Baseline game-seat capacity fails at house capacities 3–6. Candidate criteria and unchanged global gameTarget diagnostics are recorded separately in the adjacent JSON result.</p></main></html>\n`);
console.log(JSON.stringify(result,null,2));
process.exitCode=pass?0:1;
