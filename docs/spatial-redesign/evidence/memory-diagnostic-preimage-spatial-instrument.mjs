/** Additive local synthetic activity/media driver. No service or CLI side effects. */
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as timerDelay } from "node:timers/promises";
import { crc32, deflateSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { HOUSE_WORLD_VERSION, createLayout, findRoute } from "../public/house-geometry.js";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const round = number => Math.round(number * 1000) / 1000;
const sleep = milliseconds => timerDelay(milliseconds);
const q = (values, percentile) => values.length ? [...values].sort((a,b)=>a-b)[Math.ceil(values.length*percentile)-1] : null;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const ok = response => { if (!response?.ok) fail(response?.code ?? "SPATIAL_NO_ACK"); return response; };
const cleanSample = value => value;

/** Generated without application codec: canonical RGB PNG, filter zero, level nine. */
export function spatialPng(seed = 1927, side = 290) {
  const header = Buffer.alloc(13); header.writeUInt32BE(side); header.writeUInt32BE(side,4); header[8]=8; header[9]=2;
  const raster=Buffer.alloc(side*(side*3+1)); let state=seed>>>0;
  for(let y=0;y<side;y++) for(let x=1;x<=side*3;x++) { state^=state<<13;state^=state>>>17;state^=state<<5;raster[y*(side*3+1)+x]=state&255; }
  const chunk=(type,data)=>{const bytes=Buffer.alloc(data.length+12);bytes.writeUInt32BE(data.length);bytes.write(type,4);data.copy(bytes,8);bytes.writeUInt32BE(crc32(bytes.subarray(4,-4)),bytes.length-4);return bytes;};
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(raster,{level:9})),chunk("IEND",Buffer.alloc(0))]);
}

/** Reuse the admitted production views; reject missing-role/membership wiring early. */
export function resourceActorMap(houses,views) {
  if(houses?.length!==2||views?.length!==24||views.filter(v=>v.role==="house").length!==12||views.filter(v=>v.role==="board").length!==12)fail("SPATIAL_ACTOR_ADMISSION");
  const byHouse=houses.map((house,houseIndex)=>Array.from({length:6},(_,memberIndex)=>{
    const found=views.filter(v=>v.role==="house"&&v.house===houseIndex&&v.memberIndex===memberIndex&&v.identity===house.members[memberIndex]?.identity);
    if(found.length!==1)fail("SPATIAL_ACTOR_WIRING");return found[0];
  }));
  return {byHouse,games:byHouse.map(actors=>[actors[1],actors[2]]),media:[byHouse[1][0],byHouse[1][3],byHouse[1][4]],walkers:[byHouse[0][0],...byHouse[0].slice(3),byHouse[1][5]]};
}
export const SPATIAL_CHECKS=Object.freeze(["studioFirstRead","studioReplacementRead","studioOriginalReceiptReplay","studioGuestDeniedClosed","studioGuestReadOpen","studioGuestRevoked","studioTemporaryAbort","studyExplicitJoin","studyPresenter","studyPointerView","studyNoAutomaticSuccessor","studyExplicitSuccessor","studyAllLeft","sofaExplicitJoin","sofaImageAllReaders","sofaPresenterConflict","sofaPointerView","sofaFrozenAfterLeave","sofaExplicitSuccessor","sofaReconnectNoConsent","sofaFreshJoin","sofaClearReleasesImage","sofaAllLeft","studioReturnContinuity"]);
const rollingMax=times=>{let left=0,max=0;for(let right=0;right<times.length;right++){while(times[right]-times[left]>=60000)left++;max=Math.max(max,right-left+1);}return max;};
export function gradeSpatialLifecycle(scenario,evidence) {
  if(evidence?.status!=="COMPLETE"||evidence.reconnects!==1||evidence.rootViews!==12||evidence.boardViews!==12||evidence.allGameSeatsBy255!==true)return false;
  if(Object.keys(evidence.media.checks).length!==24||!SPATIAL_CHECKS.every(key=>evidence.media.checks[key]===true)||evidence.media.markerActions!==96)return false;
  if(!Array.isArray(evidence.seatClaims)||!Array.from({length:12},(_,index)=>evidence.seatClaims.some(row=>row.viewIndex===Math.floor(index/6)*12+(index%6)*2&&row.seatId==="game-seat-"+(index%6+1)&&row.purpose==="game"&&Number.isSafeInteger(row.seatGeneration)&&row.seatGeneration>0&&(row.atSeconds===null||Number.isFinite(row.atSeconds)&&row.atSeconds>=0&&row.atSeconds<=255))).every(Boolean))return false;
  if(evidence.media.uploads.length!==2||evidence.media.uploads.some(row=>row.inputBytes<scenario.media.minimumPngBytes||row.inputBytes>262144||row.readBytes!==row.inputBytes||!/^[a-f0-9]{64}$/.test(row.inputSHA256)||row.readSHA256!==row.inputSHA256||row.chunks!==Math.ceil(row.inputBytes/8192)))return false;
  if(evidence.media.httpBudget.length!==3||JSON.stringify(evidence.media.httpBudget.map(row=>row.viewIndex))!==JSON.stringify([12,18,20])||evidence.media.httpBudget.some(row=>!Number.isSafeInteger(row.rollingPostMax60s)||row.rollingPostMax60s<0||row.rollingPostMax60s>90||!Number.isSafeInteger(row.rollingReadMax60s)||row.rollingReadMax60s<0||row.rollingReadMax60s>90))return false;
  return true;
}
export function gradeMixedMotion(evidence) {
  const rows=evidence?.motion;if(!Array.isArray(rows)||rows.length!==12||new Set(rows.map(row=>row.viewIndex)).size!==12)return false;
  if(rows.some(row=>!Number.isFinite(row.standingSeconds)||row.standingSeconds<0||!Number.isFinite(row.seatedSeconds)||row.seatedSeconds<0||!Number.isSafeInteger(row.normalMotionSent)||row.normalMotionSent<0||row.standingSeconds>0.5&&(!Number.isFinite(row.standingHz)||row.standingHz!==round(row.normalMotionSent/row.standingSeconds)||row.standingHz<9.5||row.standingHz>10.2)))return false;
  const games=rows.filter(row=>row.memberIndex===1||row.memberIndex===2);
  const walkers=rows.filter(row=>row.houseIndex===0&&[0,3,4,5].includes(row.memberIndex)||row.houseIndex===1&&row.memberIndex===5);
  return games.length===4&&games.every(row=>row.seatedSeconds>=290)&&walkers.length===5&&walkers.every(row=>row.standingSeconds>=160);
}

export function createSpatialWorkload({origin,scenario,signal,rpc,houses,views,onSubscribe,reconnect}) {
  const actors=resourceActorMap(houses,views),all=actors.byHouse.flat(),media=actors.media;
  const evidence={status:"PREPARING",rootViews:12,boardViews:12,reconnects:0,allGameSeatsBy255:false,roleMap:{gameMembers:[1,2],mediaHouse:1,mediaMembers:[0,3,4],walkerMembers:[[0,3,4,5],[5]]},seatClaims:[],motion:[],media:{checks:{},uploads:[],markerActions:0,httpBudget:[]}};
  const motion=new Map(all.map(actor=>[actor,{lastAt:0,lastKind:null,standingMs:0,seatedMs:0,suppressed:0}])),httpCounts=new Map(media.map(actor=>[actor,{reads:[],posts:[]}]));let start=0;
  const check=(key,value)=>{evidence.media.checks[key]=value===true;if(value!==true)fail("SPATIAL_CHECK_"+key);};
  const self=actor=>actor.snapshot.players.find(person=>person.id===actor.identity);
  const isSeated=actor=>actor.spatialSeat!==undefined?actor.spatialSeat!==null:!!self(actor)?.seatId;
  const ask=(actor,event,body)=>actor.socket.timeout(5000).emitWithAck(event,{generation:actor.generation,...body});
  async function waitFor(predicate,code,timeout=5000){const until=performance.now()+timeout;while(performance.now()<until){if(predicate())return;await timerDelay(5,undefined,{signal});}fail(code);}
  function updatePosition(actor){const own=self(actor);actor.x=own.x;actor.z=own.z;}
  async function control(actor,operation){await waitFor(()=>!actor.motionPending,"SPATIAL_PENDING_MOVE");actor.motionPending=true;try{return await operation();}finally{actor.motionPending=false;}}
  async function subscribe(actor,zoneId){await control(actor,async()=>{actor.spatialSubscribing=true;try{const reply=ok(await actor.socket.timeout(5000).emitWithAck("house.subscribe",{zoneId,controllerToken:actor.token}));onSubscribe(actor,reply.snapshot);actor.motionSequence=0;actor.spatialSeat=self(actor)?.seatId??null;updatePosition(actor);}finally{actor.spatialSubscribing=false;}});}
  async function stand(actor){await control(actor,async()=>{ok(await ask(actor,"house.stand",{}));actor.spatialSeat=null;await waitFor(()=>!self(actor)?.seatId,"SPATIAL_STAND_SNAPSHOT");updatePosition(actor);});}
  async function sit(actor,seatId,bootstrap=false){
    const layout=createLayout(6),seat=layout.seats.find(value=>value.id===seatId);if(!seat)fail("SPATIAL_SEAT_FIXTURE");
    if(self(actor)?.seatId===seatId){evidence.seatClaims.push({houseIndex:actor.house,memberIndex:actor.memberIndex,viewIndex:actor.index,seatId,purpose:seat.purpose,seatGeneration:self(actor).seatGeneration,atSeconds:start?round((performance.now()-start)/1000):null});return;}
    if(isSeated(actor))await stand(actor);
    const route=findRoute(layout,{x:actor.x,z:actor.z},seat.target);if(!route)fail("SPATIAL_ROUTE_MISSING");
    if(bootstrap){for(const point of route.slice(1)){await timerDelay(100,undefined,{signal});ok(await ask(actor,"house.move",{sequence:++actor.motionSequence,...point,heading:0}));actor.x=point.x;actor.z=point.z;}}
    else {actor.spatialRoute=route.slice(1);await waitFor(()=>actor.spatialRoute.length===0,"SPATIAL_ROUTE_TIMEOUT",18000);}
    await control(actor,async()=>{ok(await ask(actor,"house.seat",{seatId}));actor.spatialSeat=seatId;await waitFor(()=>self(actor)?.seatId===seatId,"SPATIAL_SEAT_SNAPSHOT");updatePosition(actor);});
    evidence.seatClaims.push({houseIndex:actor.house,memberIndex:actor.memberIndex,viewIndex:actor.index,seatId,purpose:seat.purpose,seatGeneration:self(actor).seatGeneration,atSeconds:start?round((performance.now()-start)/1000):null});
  }
  async function at(seconds){const deadline=start+seconds*1000;while(performance.now()<deadline)await timerDelay(Math.max(1,deadline-performance.now()),undefined,{signal});if(performance.now()-deadline>1000)fail("SPATIAL_MEDIA_DEADLINE");}
  async function request(path,actor,body,expectedStatus=200,binary=false){
    const counter=httpCounts.get(actor),now=performance.now();counter[body===undefined?"reads":"posts"].push(now);const own=self(actor);
    const response=await fetch(origin+path,{method:body===undefined?"GET":"POST",headers:{Origin:origin,Cookie:actor.cookie,"X-House-Identity":actor.identity,...(body===undefined?{}:{"Content-Type":"application/json"}),"X-House-Generation":String(actor.generation),"X-House-Controller-Token":actor.token,"X-House-Access-Generation":String(actor.snapshot.accessGeneration),"X-House-Seat-Generation":String(own.seatGeneration)},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
    if(response.status!==expectedStatus){const error=await response.json().catch(()=>({}));fail("SPATIAL_HTTP_"+response.status+"_"+(error.code??"UNKNOWN"));}
    if(expectedStatus!==200)return response.json();if(binary){if(!response.headers.get("cache-control")?.includes("no-store")||response.headers.get("content-type")!=="image/png")fail("SPATIAL_IMAGE_HEADERS");return Buffer.from(await response.arrayBuffer());}return response.json();
  }
  async function studio(actor,type,payload={},expectedRevision=0){return ok(await request("/api/house/studio/command",actor,{commandId:randomUUID(),roomId:actor.roomId,expectedRevision,type:"studio."+type,payload}));}
  async function upload(actor,seed,revision){const image=spatialPng(seed),begin=await studio(actor,"upload.begin",{bytes:image.length,mime:"image/png"},revision),uploadId=begin.result.uploadId;let index=0;for(let offset=0;offset<image.length;offset+=8192)await studio(actor,"upload.chunk",{uploadId,index:index++,data:image.subarray(offset,offset+8192).toString("base64")},revision);const commit=await studio(actor,"upload.commit",{uploadId},revision),url="/api/house/studio/image?roomId="+actor.roomId+"&imageId="+commit.result.imageId,read=await request(url,actor,undefined,200,true);evidence.media.uploads.push({inputBytes:image.length,inputSHA256:hash(image),readBytes:read.length,readSHA256:hash(read),chunks:index});return {image,url,commit};}
  const state=(actor,kind)=>request("/api/house/gathering?kind="+kind,actor);
  async function gathering(actor,kind,type,payload={},expectedStatus=200){const current=await state(actor,kind);return request("/api/house/gathering",actor,{commandId:randomUUID(),kind,sessionId:current.sessionId,type:"gathering."+type,payload},expectedStatus);}
  const participation=new Map();
  async function join(actor,kind){const participationId=randomUUID();participation.set(actor,participationId);await gathering(actor,kind,"join",{participationId});}
  const leave=(actor,kind)=>gathering(actor,kind,"leave",{participationId:participation.get(actor)});
  async function animate(actor,kind){const begun=performance.now();for(let index=0;index<48;index++){const deadline=begun+index*200;await timerDelay(Math.max(1,deadline-performance.now()),undefined,{signal});if(performance.now()-deadline>=1000)fail("SPATIAL_MARKER_CADENCE");await gathering(actor,kind,index%2?"pointer":"view",index%2?{x:(index%10)/10,y:0.5}:{x:(index%10)/10,y:0.5,zoom:1+(index%4)});evidence.media.markerActions++;}}
  async function playMedia(){
    const [owner,leader,third]=media;owner.roomId=owner.snapshot.durable.residents.find(person=>person.id===owner.identity).bedroomId;
    await at(18);await subscribe(owner,owner.roomId);
    const first=await upload(owner,1927,0);check("studioFirstRead",hash(first.image)===evidence.media.uploads[0].readSHA256);
    const second=await upload(owner,1928,1);check("studioReplacementRead",hash(second.image)===evidence.media.uploads[1].readSHA256);
    const command={commandId:randomUUID(),roomId:owner.roomId,expectedRevision:2,type:"studio.view",payload:{x:0.25,y:0.75,zoom:2}},receipt=await request("/api/house/studio/command",owner,command);await studio(owner,"soundscape",{preset:"night"},3);check("studioOriginalReceiptReplay",JSON.stringify(await request("/api/house/studio/command",owner,command))===JSON.stringify(receipt));
    check("studioGuestDeniedClosed",(await request(second.url,leader,undefined,403)).ok===false);
    async function configure(open){const current=await request("/api/house/snapshot?zone="+owner.roomId,owner);await request("/api/house/command",owner,{commandId:randomUUID(),houseId:houses[1].id,type:"room.configure",expectedRevision:current.room.revision,payload:{roomId:owner.roomId,open,palette:"sage"}});await subscribe(owner,owner.roomId);}
    await configure(true);check("studioGuestReadOpen",hash(await request(second.url,leader,undefined,200,true))===hash(second.image));await configure(false);check("studioGuestRevoked",(await request(second.url,leader,undefined,403)).ok===false);
    const pending=await studio(owner,"upload.begin",{bytes:second.image.length,mime:"image/png"},4);await studio(owner,"upload.chunk",{uploadId:pending.result.uploadId,index:0,data:second.image.subarray(0,8192).toString("base64")},4);await studio(owner,"upload.abort",{uploadId:pending.result.uploadId},4);check("studioTemporaryAbort",true);await subscribe(owner,"lounge");
    await at(30);await Promise.all(media.map((actor,index)=>sit(actor,"seat-"+(index+1))));for(const actor of media)await join(actor,"study");check("studyExplicitJoin",(await state(owner,"study")).members.length===3);await gathering(leader,"study","share");check("studyPresenter",(await state(owner,"study")).presenterId===leader.identity);await animate(leader,"study");let current=await state(third,"study");check("studyPointerView",current.pointer?.x===0.7&&current.view.zoom===3);
    await stand(leader);current=await state(owner,"study");check("studyNoAutomaticSuccessor",current.presenterId===null&&current.members.length===2&&current.pointer===null);await gathering(third,"study","share");check("studyExplicitSuccessor",(await state(owner,"study")).presenterId===third.identity);for(const actor of [owner,third])await leave(actor,"study");current=await state(owner,"study");check("studyAllLeft",current.members.length===0&&current.presenterId===null);
    await at(120);await Promise.all(media.map((actor,index)=>sit(actor,"rest-seat-"+(index+1))));for(const actor of media)await join(actor,"sofa");check("sofaExplicitJoin",(await state(owner,"sofa")).members.length===3);await gathering(owner,"sofa","share",{roomId:owner.roomId});current=await state(leader,"sofa");const url="/api/house/gathering/image?kind=sofa&itemId="+current.item.id;check("sofaImageAllReaders",(await Promise.all(media.map(actor=>request(url,actor,undefined,200,true)))).every(bytes=>hash(bytes)===hash(second.image)));check("sofaPresenterConflict",(await gathering(leader,"sofa","share",{},409)).ok===false);
    await leave(owner,"sofa");current=await state(leader,"sofa");check("sofaFrozenAfterLeave",current.presenterId===null&&current.item!==null&&current.pointer===null);await gathering(leader,"sofa","share");await animate(leader,"sofa");current=await state(third,"sofa");check("sofaPointerView",current.pointer?.x===0.7&&current.view.zoom===3);await leave(leader,"sofa");await gathering(third,"sofa","share");check("sofaExplicitSuccessor",(await state(owner,"sofa")).presenterId===third.identity);await join(leader,"sofa");
    await reconnect(third);evidence.reconnects++;current=await state(third,"sofa");check("sofaReconnectNoConsent",current.selfJoined===false&&current.members.length===1&&current.presenterId===null&&current.item!==null);third.spatialSeat=self(third)?.seatId??null;await join(third,"sofa");check("sofaFreshJoin",(await state(third,"sofa")).selfJoined===true);await gathering(leader,"sofa","share");await gathering(leader,"sofa","clear");current=await state(third,"sofa");check("sofaClearReleasesImage",current.item===null&&current.pointer===null);for(const actor of [leader,third])await leave(actor,"sofa");current=await state(owner,"sofa");check("sofaAllLeft",current.members.length===0&&current.presenterId===null&&current.item===null);
    await at(285);await subscribe(owner,owner.roomId);const saved=await request("/api/house/studio?roomId="+owner.roomId,owner);check("studioReturnContinuity",saved.revision===4&&saved.view.x===0.25&&saved.view.y===0.75&&saved.view.zoom===2&&saved.soundscape==="night"&&hash(await request(second.url,owner,undefined,200,true))===hash(second.image));
  }
  return {
    evidence,
    async prepare(){await Promise.all(actors.games.flat().map(actor=>sit(actor,"game-seat-"+(actor.memberIndex+1),true)));evidence.status="READY";},
    begin(clockStart){start=clockStart;for(const row of motion.values())row.lastAt=start;},
    sampleMotion(now){for(const actor of all){const row=motion.get(actor);if(row.lastKind==="standing")row.standingMs+=now-row.lastAt;if(row.lastKind==="seated")row.seatedMs+=now-row.lastAt;row.lastAt=now;row.lastKind=actor.ready&&actor.socket.connected&&!actor.intendedFault?(isSeated(actor)?"seated":"standing"):null;}},
    shouldMove(actor){if(!isSeated(actor))return true;motion.get(actor).suppressed++;return false;},
    motionTarget(actor){return actor.spatialRoute?.[0]??{x:actor.x,z:actor.z};},
    motionACK(actor,point){actor.x=point.x;actor.z=point.z;if(actor.spatialRoute?.[0]===point)actor.spatialRoute.shift();},
    async run(){evidence.status="RUNNING";await Promise.all([playMedia(),(async()=>{await at(236);await Promise.all(all.map(actor=>sit(actor,"game-seat-"+(actor.memberIndex+1))));await at(255);evidence.allGameSeatsBy255=all.every(actor=>self(actor)?.seatId==="game-seat-"+(actor.memberIndex+1));if(!evidence.allGameSeatsBy255)fail("SPATIAL_PICTURE_SEATS");})()]);evidence.status="COMPLETE";},
    finish(){
      evidence.motion=all.map(actor=>{const row=motion.get(actor),seconds=round(row.standingMs/1000);return {viewIndex:actor.index,houseIndex:actor.house,memberIndex:actor.memberIndex,standingSeconds:seconds,seatedSeconds:round(row.seatedMs/1000),normalMotionSent:actor.normalMotionSent,standingHz:seconds>0.5?round(actor.normalMotionSent/seconds):null,seatedSuppressed:row.suppressed};});
      evidence.media.httpBudget=media.map(actor=>{const row=httpCounts.get(actor);return {viewIndex:actor.index,totalReads:row.reads.length,totalPosts:row.posts.length,rollingReadMax60s:rollingMax(row.reads),rollingPostMax60s:rollingMax(row.posts)};});
      return {spatialLifecycle:gradeSpatialLifecycle(scenario,evidence),spatialMotion:gradeMixedMotion(evidence)};
    },
    gradeWorkload(stats,perView,workload){return stats.patchSkipped===0&&stats.chatSkipped===0&&stats.patchSaved>=workload.minimumSavedPatches&&stats.chatSaved>=workload.minimumSavedChat&&perView.filter(v=>v.role==="board").every(v=>v.pointerHz>=18&&v.pointerHz<=20.5)&&gradeMixedMotion(evidence);},
    verifyClosed(path){const db=new DatabaseSync(path,{readOnly:true});try{const studio=db.prepare("SELECT count(*) AS rows,coalesce(sum(length(image)),0) AS imageBytes,max(revision) AS revision FROM room_studio_rooms").get(),uploads=db.prepare("SELECT count(*) AS count,coalesce(sum(length(data)),0) AS bytes FROM room_studio_uploads").get(),receipts=db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS bytes,coalesce(max(octet_length(response)),0) AS maxBytes FROM room_studio_receipts").get();evidence.persisted={studio,uploads,receipts};return studio.rows===1&&studio.imageBytes===evidence.media.uploads[1]?.inputBytes&&studio.revision===4&&uploads.count===0&&uploads.bytes===0&&receipts.maxBytes<=512&&receipts.bytes<=32768;}finally{db.close();}},
    close(){}
  };
}
