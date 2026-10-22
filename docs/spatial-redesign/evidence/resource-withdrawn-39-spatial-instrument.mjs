/** Additive local synthetic activity/media driver. No service or CLI side effects. */
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { setTimeout as timerDelay } from "node:timers/promises";
import { crc32, deflateSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { io } from "socket.io-client";
import { HOUSE_WORLD_VERSION, createLayout, findRoute } from "../public/house-geometry.js";
import { capturePictureAuthority, pictureAuthorityEvidence, picturePlan, normalizePictureFrame, pictureFrameMatches, puzzleIntentACK, gradePictureEvidence, verifyClosedPictureTables } from "./board-resource-p7.mjs";
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

export const SPATIAL_CHECKS = Object.freeze([
  "studioFirstRead", "studioReplacementRead", "studioOriginalReceiptReplay", "studioGuestDeniedClosed",
  "studioGuestReadOpen", "studioGuestRevoked", "studioTemporaryAbort", "studyExplicitJoin", "studyPresenter",
  "studyPointerView", "studyNoAutomaticSuccessor", "studyExplicitSuccessor", "studyAllLeft",
  "sofaExplicitJoin", "sofaImageAllReaders", "sofaPresenterConflict", "sofaPointerView", "sofaFrozenAfterLeave",
  "sofaExplicitSuccessor", "sofaReconnectNoConsent", "sofaFreshJoin", "sofaClearReleasesImage", "sofaAllLeft",
  "studioReturnContinuity"
]);
export function gradeSpatialLifecycle(scenario, evidence) {
  if(evidence?.status!=="COMPLETE" || evidence.unexpectedDisconnects!==0 || evidence.scopeErrors!==0 || evidence.transport.created!==16 || evidence.transport.expectedReconnects!==1 || evidence.transport.connectedAtEnd!==15) return false;
  if(Object.keys(evidence.media.checks).length!==SPATIAL_CHECKS.length || !SPATIAL_CHECKS.every(key=>evidence.media.checks[key]===true)) return false;
  const claims=evidence.seatClaims;
  if(!Array.isArray(claims)||!Array.from({length:12},(_,index)=>claims.some(claim=>claim.actualViewIndex===index+24&&claim.purpose==="game"&&claim.seatId==="game-seat-"+(index%6+1)&&Number.isSafeInteger(claim.seatGeneration)&&claim.seatGeneration>0)).every(Boolean))return false;
  if(evidence.media.uploads.length!==2 || evidence.media.uploads.some(upload=>upload.inputBytes<scenario.media.minimumPngBytes||upload.inputBytes>262144||upload.readBytes!==upload.inputBytes||upload.readSHA256!==upload.inputSHA256||upload.chunks!==Math.ceil(upload.inputBytes/8192)))return false;
  if(evidence.media.pointerViewActions!==200 || evidence.media.httpBudget.length!==15 || new Set(evidence.media.httpBudget.map(row=>row.actorIndex)).size!==15 || evidence.media.httpBudget.some(row=>!Number.isSafeInteger(row.totalReads)||row.totalReads<0||!Number.isSafeInteger(row.totalWrites)||row.totalWrites<0||!Number.isSafeInteger(row.rollingReadMax60s)||row.rollingReadMax60s<0||row.rollingReadMax60s>240||!Number.isSafeInteger(row.rollingWriteMax60s)||row.rollingWriteMax60s<0||row.rollingWriteMax60s>240))return false;
  return true;
}

function gameStepPlan(neutral) {
    const steps = [{ type: "join", slot: 0, code: "joined" }, { type: "join", slot: 1, code: "joined" }, { type: "ready", slot: 0, code: "ready" }, { type: "ready", slot: 1, code: "started" }];
    const columns = neutral ? [0, 1] : [0, 1, 0, 1, 0, 1, 0];
    for (const [i, column] of columns.entries()) steps.push({ type: "move", slot: i % 2, column, code: !neutral && i === 6 ? "win" : "moved" });
    if (neutral) steps.push({ type: "leave", slot: 0, code: "left" });
    return steps;
}
function gameTargetIndices(houseIndex, scheduledSeconds, slowReader) {
    return Array.from({ length: 6 }, (_, memberIndex) => houseIndex * 12 + memberIndex * 2)
        .filter(index => !(index === 0 && scheduledSeconds >= slowReader.pauseAtSeconds && scheduledSeconds < slowReader.pauseAtSeconds + slowReader.pauseSeconds));
}
function rememberGameProjection(view, game) {
    if (!game || !Number.isSafeInteger(game.revision)) return;
    view.gameFrames ??= new Map();
    if (!view.gameFrames.has(game.revision)) view.gameFrames.set(game.revision, { game, at: performance.now(), hash: hash(Buffer.from(JSON.stringify(game))) });
}
function gameProjectionMatches(game, expected) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!game || game.revision !== expected.revision || game.rosterRevision !== expected.rosterRevision) return false;
    const terminal = expected.status === "terminal", state = terminal ? game.latestResult : game.current;
    if (!state || state.roundId !== expected.roundId || !same(state.players, expected.players) || !same(state.cells, expected.cells) || !same(state.lastMove, expected.lastMove)) return false;
    if (terminal) return game.current === null && state.reason === expected.reason && state.winner === expected.winner && Number.isSafeInteger(state.startedAt) && Number.isSafeInteger(state.endedAt) && state.endedAt >= state.startedAt;
    return state.status === expected.status && same(state.ready?.map(Boolean), expected.ready) && state.turn === expected.turn && state.resumeRevision === 0 && state.recoveryDeadlineAt === null;
}
function gradeGameEvidence(scenario, slowReader, evidence) {
    const actions = evidence.actions, times = [];
    if (evidence.status !== "COMPLETE" || actions.length !== scenario.expectedActions || evidence.rounds.length !== 12) return false;
    for (let houseIndex = 0; houseIndex < 2; houseIndex++) {
        let revision = 0;
        for (let roundIndex = 0; roundIndex < 6; roundIndex++) {
            const plan = gameStepPlan(scenario.neutralRoundIndices.includes(roundIndex));
            for (const [stepIndex, step] of plan.entries()) {
                const matches = actions.filter(a => a.houseIndex === houseIndex && a.roundIndex === roundIndex && a.stepIndex === stepIndex);
                if (matches.length !== 1) return false;
                const action = matches[0], scheduled = scenario.roundStartsSeconds[roundIndex] + stepIndex * scenario.actionIntervalSeconds;
                const targets = gameTargetIndices(houseIndex, scheduled, slowReader);
                if (action.status !== "VISIBLE" || typeof action.gameHash !== "string" || !/^[a-f0-9]{64}$/.test(action.gameHash) || action.type !== step.type || action.slot !== step.slot || action.code !== step.code || action.revision !== ++revision || action.scheduledOffsetSeconds !== scheduled || !Number.isFinite(action.sendLagMs) || action.sendLagMs < 0 || action.sendLagMs > scenario.maximumScheduleLagMs || JSON.stringify(action.targetIndices) !== JSON.stringify(targets) || action.observed.length !== targets.length) return false;
                for (const target of targets) {
                    const observations = action.observed.filter(o => o.viewIndex === target);
                    if (observations.length !== 1 || observations[0].gameHash !== action.gameHash || !Number.isFinite(observations[0].latencyMs) || observations[0].latencyMs < 0) return false;
                    times.push(observations[0].latencyMs);
                }
            }
            const rounds = evidence.rounds.filter(r => r.houseIndex === houseIndex && r.roundIndex === roundIndex);
            if (rounds.length !== 1 || rounds[0].actions !== plan.length || rounds[0].finalRevision !== revision || rounds[0].outcome !== (scenario.neutralRoundIndices.includes(roundIndex) ? "player_left" : "win")) return false;
        }
    }
    return times.length === scenario.expectedReadableProjectionTargets && q(times, 0.95) <= scenario.visibleP95Ms;
}


export function createSpatialWorkload({ origin, scenario, signal, rpc }) {
  const p={gameScenario:scenario.gameScenario,pictureScenario:scenario.pictureScenario,slowReader:{pauseAtSeconds:-1,pauseSeconds:0}};
  const gameEvidence={status:"NOT_RUN",actions:[],rounds:[],storage:[]};
  const pictureEvidence={status:"NOT_RUN",actions:[],admissions:[],invalidFrames:0,conflictingFrames:0};
  const evidence={status:"PREPARING",logicalIndexPolicy:"Game/picture viewIndex is the historical six-per-house observation index; actualViewIndex 24..35 identifies additional sockets. Base views 0..23 remain separate.",transport:{created:0,expectedReconnects:0,connectedAtEnd:0},unexpectedDisconnects:0,scopeErrors:0,seatClaims:[],game:gameEvidence,picture:pictureEvidence,media:{checks:{},uploads:[],pointerViewActions:0,httpBudget:[]}};
  const houses=[],views=[],media=[],all=[],httpCounts=new Map(); let start=0,closing=false;
  const cancellation={signal};
  async function request(path, actor, body, expectedStatus=200, binary=false) {
    const at=performance.now(), counter=httpCounts.get(actor.identity)??{reads:[],writes:[]};counter[body===undefined?"reads":"writes"].push(at);httpCounts.set(actor.identity,counter);
    const own=actor.snapshot?.players.find(person=>person.id===actor.identity);
    const response=await fetch(origin+path,{method:body===undefined?"GET":"POST",headers:{Origin:origin,Cookie:actor.cookie,"X-House-Identity":actor.identity,...(body===undefined?{}:{"Content-Type":"application/json"}),...(actor.snapshot?{"X-House-Generation":String(actor.generation),"X-House-Controller-Token":actor.token,"X-House-Access-Generation":String(actor.snapshot.accessGeneration),"X-House-Seat-Generation":String(own?.seatGeneration)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
    if(response.status!==expectedStatus) { const error=await response.json().catch(()=>({}));fail("SPATIAL_HTTP_"+response.status+"_"+(error.code??"UNKNOWN")); }
    if(expectedStatus!==200)return response.json();
    if(binary){if(!response.headers.get("cache-control")?.includes("no-store")||response.headers.get("content-type")!=="image/png")fail("SPATIAL_IMAGE_HEADERS");return Buffer.from(await response.arrayBuffer());}
    return response.json();
  }
  async function makeHouse(count,houseIndex) {
    const house={index:houseIndex,id:null,code:null,members:[]};
    for(let memberIndex=0;memberIndex<count;memberIndex++) {
      const response=await fetch(origin+"/api/house/me",{signal:AbortSignal.timeout(10000)}),me=await response.json();
      const member={identity:me.identity.id,cookie:response.headers.get("set-cookie").split(";")[0],memberIndex,token:randomUUID(),connections:0,motionSequence:0,pictureIntentSequence:0,house:houseIndex,index:houseIndex*12+memberIndex*2,actualViewIndex:24+houseIndex*6+memberIndex};
      await request("/api/house/command",member,{commandId:randomUUID(),type:memberIndex?"house.join":"house.create",payload:{...(memberIndex?{code:house.code}:{capacity:6}),name:"Spatial resource "+memberIndex,colour:["sage","blue","rose","amber","peach","lavender"][memberIndex]}});
      const latest=await request("/api/house/me",member); if(!memberIndex){house.id=latest.home.id;house.code=latest.home.code;}
      member.roomId=latest.residents?.find(person=>person.id===member.identity)?.bedroomId;
      house.members.push(member);all.push(member);
    }
    return house;
  }
  async function connect(actor,zoneId="lounge",expectedReconnect=false) {
    const socket=io(origin,{autoConnect:false,forceNew:true,reconnection:false,transports:["websocket"],auth:{worldVersion:HOUSE_WORLD_VERSION},extraHeaders:{Origin:origin,Cookie:actor.cookie}});
    actor.socket=socket; actor.connections++;evidence.transport.created++;
    socket.on("disconnect",()=>{if(!closing&&!actor.expectedDisconnect){evidence.unexpectedDisconnects++;}actor.ready=false;});
    socket.on("house.snapshot",snapshot=>{
      const house=actor.house<2?houses[actor.house]:mediaHouse;
      if(snapshot.worldVersion!==HOUSE_WORLD_VERSION||snapshot.durable?.house?.id!==house.id||snapshot.durable?.selfId!==actor.identity){evidence.scopeErrors++;return;}
      actor.snapshot=snapshot;actor.generation=snapshot.generation;
      if(actor.house<2){rememberGameProjection(actor,snapshot.durable.game);capturePicture(actor,snapshot);}
    });
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Object.assign(new Error("CONNECT_TIMEOUT"),{code:"SPATIAL_CONNECT_TIMEOUT"})),5000);socket.once("connect",()=>{clearTimeout(timeout);resolve();});socket.once("connect_error",error=>{clearTimeout(timeout);reject(error);});socket.connect();});
    await subscribe(actor,zoneId);
    if(expectedReconnect)evidence.transport.expectedReconnects++;
    actor.expectedDisconnect=false;actor.ready=true;
  }
  async function subscribe(actor,zoneId) {
    const reply=ok(await actor.socket.timeout(5000).emitWithAck("house.subscribe",{zoneId,controllerToken:actor.token}));
    if(!reply.snapshot.controller)fail("SPATIAL_NOT_CONTROLLER");
    actor.snapshot=reply.snapshot;actor.generation=reply.snapshot.generation;
    if(actor.house<2){actor.pictureAuthority=capturePictureAuthority(actor.snapshot);rememberGameProjection(actor,actor.snapshot.durable.game);capturePicture(actor,actor.snapshot);
      pictureEvidence.admissions.push({houseIndex:actor.house,memberIndex:actor.memberIndex,viewIndex:actor.index,actualViewIndex:actor.actualViewIndex,connectionOrdinal:actor.connections,...pictureAuthorityEvidence(actor.pictureAuthority)});}
  }
  const ask=(actor,event,body)=>actor.socket.timeout(5000).emitWithAck(event,{generation:actor.generation,...body});
  async function waitFor(predicate,code) { const until=performance.now()+5000;while(performance.now()<until){if(predicate())return;await timerDelay(10,undefined,{signal});}fail(code); }
  async function stand(actor) {ok(await ask(actor,"house.stand",{}));await waitFor(()=>!actor.snapshot.players.find(person=>person.id===actor.identity)?.seatId,"SPATIAL_STAND_SNAPSHOT");}
  async function sit(actor,seatId) {
    const layout=createLayout(6),own=actor.snapshot.players.find(person=>person.id===actor.identity),seat=layout.seats.find(candidate=>candidate.id===seatId);
    if(!seat||!own)fail("SPATIAL_SEAT_FIXTURE");
    if(own.seatId)await stand(actor);
    const position=actor.snapshot.players.find(person=>person.id===actor.identity),route=findRoute(layout,{x:position.x,z:position.z},seat.target);
    if(!route)fail("SPATIAL_ROUTE_MISSING");
    // Every ordinary move respects the unchanged 80 ms throttle and speed budget.
    for(const point of route.slice(1)){await timerDelay(85,undefined,{signal});ok(await ask(actor,"house.move",{sequence:++actor.motionSequence,...point,heading:0}));}
    ok(await ask(actor,"house.seat",{seatId}));
    await waitFor(()=>actor.snapshot.players.find(person=>person.id===actor.identity)?.seatId===seatId,"SPATIAL_SEAT_SNAPSHOT");
    const saved=actor.snapshot.players.find(person=>person.id===actor.identity);
    evidence.seatClaims.push({actualViewIndex:actor.actualViewIndex,seatId,purpose:seat.purpose,seatGeneration:saved.seatGeneration,generation:actor.generation});
  }
  async function at(seconds){const deadline=start+seconds*1000;while(performance.now()<deadline)await timerDelay(Math.max(1,deadline-performance.now()),undefined,{signal});if(performance.now()-deadline>1000)fail("SPATIAL_MEDIA_DEADLINE");}
  const check=(key,value)=>{evidence.media.checks[key]=value===true;if(value!==true)fail("SPATIAL_CHECK_"+key);};
  let mediaHouse;
  async function studio(actor,type,payload={},expectedRevision=0){return ok(await request("/api/house/studio/command",actor,{commandId:randomUUID(),roomId:actor.roomId,expectedRevision,type:"studio."+type,payload}));}
  async function upload(actor,seed,revision){
    const image=spatialPng(seed),begin=await studio(actor,"upload.begin",{bytes:image.length,mime:"image/png"},revision),uploadId=begin.result.uploadId;
    let index=0;for(let offset=0;offset<image.length;offset+=8192)await studio(actor,"upload.chunk",{uploadId,index:index++,data:image.subarray(offset,offset+8192).toString("base64")},revision);
    const commit=await studio(actor,"upload.commit",{uploadId},revision),url="/api/house/studio/image?roomId="+actor.roomId+"&imageId="+commit.result.imageId,read=await request(url,actor,undefined,200,true);
    evidence.media.uploads.push({inputBytes:image.length,inputSHA256:hash(image),readBytes:read.length,readSHA256:hash(read),chunks:index});
    return {commit,url,image};
  }
  async function gatheringState(actor,kind){return request("/api/house/gathering?kind="+kind,actor);}
  async function gathering(actor,kind,type,payload={},expectedStatus=200){const state=await gatheringState(actor,kind);return request("/api/house/gathering",actor,{commandId:randomUUID(),kind,sessionId:state.sessionId,type:"gathering."+type,payload},expectedStatus);}
  const participations=new Map();
  async function joinAll(kind){for(const actor of media){const participationId=randomUUID();participations.set(actor,participationId);await gathering(actor,kind,"join",{participationId});}return gatheringState(media[0],kind);}
  async function leave(actor,kind){return gathering(actor,kind,"leave",{participationId:participations.get(actor)});}
  async function animate(actor,kind){
    const begun=performance.now();for(let index=0;index<100;index++){const deadline=begun+index*100;await timerDelay(Math.max(1,deadline-performance.now()),undefined,{signal});if(performance.now()-deadline>=1000)fail("SPATIAL_VIEW_CADENCE");const view={x:(index%10)/10,y:0.5,zoom:1+(index%4)};await gathering(actor,kind,index%2?"pointer":"view",index%2?{x:view.x,y:view.y}:view);evidence.media.pointerViewActions++;}
  }
  async function playMedia(){
    const [owner,guest,third]=media;await at(20);
    const first=await upload(owner,scenario.media.pngSeeds[0],0);check("studioFirstRead",hash(first.image)===evidence.media.uploads[0].readSHA256);
    const second=await upload(owner,scenario.media.pngSeeds[1],1);check("studioReplacementRead",hash(second.image)===evidence.media.uploads[1].readSHA256);
    // Replaying an accepted command must preserve its original receipt after replacement.
    const viewCommand={commandId:randomUUID(),roomId:owner.roomId,expectedRevision:2,type:"studio.view",payload:{x:0.25,y:0.75,zoom:2}};
    const viewReceipt=await request("/api/house/studio/command",owner,viewCommand);await studio(owner,"soundscape",{preset:"night"},3);
    check("studioOriginalReceiptReplay",JSON.stringify(await request("/api/house/studio/command",owner,viewCommand))===JSON.stringify(viewReceipt));
    check("studioGuestDeniedClosed",(await request(second.url,guest,undefined,403)).ok===false);
    const room=owner.snapshot.durable.residents.find(person=>person.id===owner.identity).bedroomId;
    async function configure(open){const state=await request("/api/house/snapshot?zone="+room,owner);await request("/api/house/command",owner,{commandId:randomUUID(),houseId:mediaHouse.id,type:"room.configure",expectedRevision:state.room.revision,payload:{roomId:room,open,palette:"sage"}});await subscribe(owner,owner.roomId);}
    await configure(true);check("studioGuestReadOpen",hash(await request(second.url,guest,undefined,200,true))===hash(second.image));await configure(false);check("studioGuestRevoked",(await request(second.url,guest,undefined,403)).ok===false);
    const pending=await studio(owner,"upload.begin",{bytes:second.image.length,mime:"image/png"},4);await studio(owner,"upload.chunk",{uploadId:pending.result.uploadId,index:0,data:second.image.subarray(0,8192).toString("base64")},4);await studio(owner,"upload.abort",{uploadId:pending.result.uploadId},4);check("studioTemporaryAbort",true);
    await at(40);await subscribe(owner,"lounge");await Promise.all(media.map((actor,index)=>sit(actor,"seat-"+(index+1))));
    let state=await joinAll("study");check("studyExplicitJoin",state.members.length===3);await gathering(owner,"study","share");state=await gatheringState(guest,"study");check("studyPresenter",state.presenterId===owner.identity);
    await animate(owner,"study");state=await gatheringState(guest,"study");check("studyPointerView",state.pointer?.x===0.9&&state.view.zoom===3);
    await stand(owner);state=await gatheringState(guest,"study");check("studyNoAutomaticSuccessor",state.presenterId===null&&state.members.length===2&&state.pointer===null);await gathering(guest,"study","share");check("studyExplicitSuccessor",(await gatheringState(third,"study")).presenterId===guest.identity);
    for(const actor of [guest,third])await leave(actor,"study");state=await gatheringState(guest,"study");check("studyAllLeft",state.members.length===0&&state.presenterId===null);
    await at(120);await Promise.all(media.map((actor,index)=>sit(actor,"rest-seat-"+(index+1))));state=await joinAll("sofa");check("sofaExplicitJoin",state.members.length===3);await gathering(owner,"sofa","share",{roomId:owner.roomId});state=await gatheringState(guest,"sofa");
    const url="/api/house/gathering/image?kind=sofa&itemId="+state.item.id;const reads=await Promise.all(media.map(actor=>request(url,actor,undefined,200,true)));check("sofaImageAllReaders",reads.every(bytes=>hash(bytes)===hash(second.image)));
    check("sofaPresenterConflict",(await gathering(guest,"sofa","share",{},409)).ok===false);await animate(owner,"sofa");state=await gatheringState(guest,"sofa");check("sofaPointerView",state.pointer?.x===0.9&&state.view.zoom===3);
    await leave(owner,"sofa");state=await gatheringState(guest,"sofa");check("sofaFrozenAfterLeave",state.presenterId===null&&state.item!==null&&state.pointer===null);await gathering(guest,"sofa","share");check("sofaExplicitSuccessor",(await gatheringState(third,"sofa")).presenterId===guest.identity);
    third.expectedDisconnect=true;third.socket.disconnect();await connect(third,"lounge",true);state=await gatheringState(third,"sofa");check("sofaReconnectNoConsent",state.selfJoined===false&&state.members.length===1);
    participations.set(third,randomUUID());await gathering(third,"sofa","join",{participationId:participations.get(third)});check("sofaFreshJoin",(await gatheringState(third,"sofa")).selfJoined===true);
    await gathering(guest,"sofa","clear");state=await gatheringState(third,"sofa");check("sofaClearReleasesImage",state.item===null&&state.pointer===null);for(const actor of [guest,third])await leave(actor,"sofa");state=await gatheringState(guest,"sofa");check("sofaAllLeft",state.members.length===0&&state.presenterId===null&&state.item===null);
    await at(285);await subscribe(owner,owner.roomId);const saved=await request("/api/house/studio?roomId="+owner.roomId,owner);check("studioReturnContinuity",saved.revision===4&&saved.view.x===0.25&&saved.view.y===0.75&&saved.view.zoom===2&&saved.soundscape==="night"&&hash(await request(second.url,owner,undefined,200,true))===hash(second.image));
  }

    async function playGameRound(houseIndex, roundIndex) {
        const scenario = p.gameScenario, neutral = scenario.neutralRoundIndices.includes(roundIndex);
        const actors = scenario.playerMemberIndices.map(memberIndex => views.find(v => v.role === "house" && v.house === houseIndex && v.memberIndex === memberIndex));
        const h = houses[houseIndex], steps = gameStepPlan(neutral), startOffset = scenario.roundStartsSeconds[roundIndex];
        const expected = { revision: h.gameRevision ?? 0, rosterRevision: h.gameRosterRevision ?? 0, roundId: null, status: "waiting", players: [null, null], ready: [false, false], cells: Array(42).fill(null), turn: 0, lastMove: null };
        const old = actors[0].snapshot.durable.game;
        if (!old || old.current !== null || old.revision !== expected.revision || old.rosterRevision !== expected.rosterRevision) fail("GAME_ROUND_INITIAL_STATE");
        for (const [stepIndex, step] of steps.entries()) {
            const scheduledOffsetSeconds = startOffset + stepIndex * scenario.actionIntervalSeconds;
            while (performance.now() < start + scheduledOffsetSeconds * 1000) await timerDelay(Math.max(1, start + scheduledOffsetSeconds * 1000 - performance.now()), undefined, { signal: cancellation.signal });
            const at = performance.now(), sendLagMs = at - start - scheduledOffsetSeconds * 1000;
            if (sendLagMs > scenario.maximumScheduleLagMs) fail("GAME_ACTION_DEADLINE");
            const actor = actors[step.slot], targetIndices = gameTargetIndices(houseIndex, scheduledOffsetSeconds, p.slowReader);
            const targets = targetIndices.map(i => views[i]);
            if (targets.some(v => !v || !v.ready || !v.socket.connected || v.intendedFault)) fail("GAME_READABLE_TARGET_UNAVAILABLE");
            const entry = { houseIndex, roundIndex, stepIndex, type: step.type, slot: step.slot, scheduledOffsetSeconds, sendLagMs: round(sendLagMs), targetIndices, observed: [], status: "PENDING" };
            gameEvidence.actions.push(entry);
            const payload = { roundId: expected.roundId };
            if (step.type === "ready") payload.rosterRevision = expected.rosterRevision;
            if (step.type === "move") payload.column = step.column;
            const command = { commandId: randomUUID(), type: "game." + step.type, houseId: h.id, payload, ...(["join", "move"].includes(step.type) ? { expectedRevision: expected.revision } : {}) };
            const receipt = ok(await actor.socket.timeout(5000).emitWithAck("house.command", { generation: actor.generation, zoneId: "lounge", command }));
            entry.status = "ACCEPTED"; entry.code = receipt.result?.code; entry.revision = receipt.entityRevision;
            if (stepIndex === 0) {
                if (typeof receipt.result?.roundId !== "string") fail("GAME_ROUND_ID_MISSING");
                expected.roundId = receipt.result.roundId;
            }
            expected.revision++;
            if (step.type === "join") { expected.players[step.slot] = actor.identity; expected.rosterRevision++; }
            else if (step.type === "ready") {
                expected.ready[step.slot] = true;
                if (expected.ready.every(Boolean)) { expected.status = "active"; expected.ready = [false, false]; }
            } else if (step.type === "move") {
                let row = 5; while (row >= 0 && expected.cells[row * 7 + step.column] !== null) row--;
                if (row < 0) fail("GAME_INVALID_REGISTERED_COLUMN");
                expected.cells[row * 7 + step.column] = step.slot;
                expected.lastMove = { row, column: step.column, slot: step.slot };
                expected.turn = 1 - step.slot;
            }
            if (step.code === "win" || step.type === "leave") {
                expected.status = "terminal"; expected.rosterRevision++;
                expected.reason = step.type === "leave" ? "player_left" : "win"; expected.winner = step.type === "leave" ? null : 0;
            }
            if (receipt.entityRevision !== expected.revision || receipt.result?.roundId !== expected.roundId || receipt.result?.code !== step.code) fail("GAME_RECEIPT_MISMATCH");
            const deadline = performance.now() + 5000;
            while (targets.some(v => !v.gameFrames?.has(expected.revision)) && performance.now() < deadline) await sleep(10);
            for (const v of targets) {
                const frame = v.gameFrames?.get(expected.revision);
                if (!frame) fail("GAME_PROJECTION_TIMEOUT");
                if (!gameProjectionMatches(frame.game, expected)) fail("GAME_PROJECTION_MISMATCH");
                entry.observed.push({ viewIndex: v.index, latencyMs: round(frame.at - at), gameHash: frame.hash });
            }
            entry.gameHash = entry.observed[0].gameHash;
            if (entry.observed.some(o => o.gameHash !== entry.gameHash)) fail("GAME_PROJECTION_DIVERGED");
            entry.status = "VISIBLE";
        }
        h.gameRevision = expected.revision; h.gameRosterRevision = expected.rosterRevision;
        gameEvidence.rounds.push({ houseIndex, roundIndex, outcome: neutral ? "player_left" : "win", actions: steps.length, finalRevision: expected.revision });
        gameEvidence.storage.push({ phase: "round-finish", houseIndex, roundIndex, elapsedSeconds: round((performance.now() - start) / 1000), ...cleanSample(await rpc("storage")) });
    }
    function capturePicture(v,snapshot) {
        if(!v.pictureAuthority)return;
        const h=houses[v.house],frame=normalizePictureFrame(snapshot,{houseIndex:v.house,houseId:h.id,selfId:v.identity,memberIds:h.members.map(m=>m.identity),...v.pictureAuthority});
        if(!frame.scopeValid||frame.placements.some(e=>e.memberIndex<0))pictureEvidence.invalidFrames++;
        v.pictureFrames??=new Map();
        const key=frame.roundHash+":"+frame.puzzleRevision+":"+frame.rosterRevision,prior=v.pictureFrames.get(key);
        if(prior&&JSON.stringify(prior.frame)!==JSON.stringify(frame))pictureEvidence.conflictingFrames++;
        if(!prior)v.pictureFrames.set(key,{frame,at:performance.now()});
    }
    async function observePicture(entry,expected,targets,at) {
        const deadline=performance.now()+5000;
        while(performance.now()<deadline) {
            if(expected.rosterRevision===undefined) {
                const candidate=[...(targets[0].pictureFrames?.values()??[])].find(o=>o.at>=at&&pictureFrameMatches(o.frame,expected));
                if(candidate)expected.rosterRevision=candidate.frame.rosterRevision;
            }
            if(expected.rosterRevision!==undefined) {
                const observed=targets.map(v=>({v,observation:[...(v.pictureFrames?.values()??[])].find(o=>o.at>=at&&pictureFrameMatches(o.frame,expected))}));
                if(observed.every(o=>o.observation)) {
                    entry.observed=observed.map(({v,observation})=>({viewIndex:v.index,latencyMs:round(observation.at-at),frame:observation.frame}));
                    entry.rosterRevision=expected.rosterRevision;entry.status="VISIBLE";return;
                }
            }
            await sleep(10);
        }
        fail("PICTURE_PROJECTION_TIMEOUT");
    }
    async function playPicture(houseIndex) {
        const scenario=p.pictureScenario,h=houses[houseIndex],targets=Array.from({length:6},(_,m)=>views[houseIndex*12+2*m]);
        const plan=picturePlan(scenario),participants=new Map(),selfHashes=Array(6).fill(null),placements=[];
        let roundId=null,roundHash=null,rosterHead=null;
        if(targets[0].snapshot.durable.puzzle?.current!==null||targets[0].snapshot.durable.puzzle?.revision!==0)fail("PICTURE_INITIAL_STATE");
        for(const [stepIndex,step] of plan.entries()) {
            while(performance.now()<start+step.atSeconds*1000)await timerDelay(Math.max(1,start+step.atSeconds*1000-performance.now()),undefined,{signal:cancellation.signal});
            const at=performance.now(),sendLagMs=at-start-step.atSeconds*1000;
            if(sendLagMs>scenario.maximumScheduleLagMs||step.type==="place"&&sendLagMs>=scenario.placementIntervalSeconds*1000)fail("PICTURE_ABSOLUTE_DEADLINE");
            if(targets.some(v=>!v.ready||!v.socket.connected||v.intendedFault))fail("PICTURE_TARGET_UNAVAILABLE");
            const actor=targets[step.memberIndex],entry={houseIndex,stepIndex,type:step.type,memberIndex:step.memberIndex,scheduledOffsetSeconds:step.atSeconds,sendLagMs:round(sendLagMs),status:"PENDING",observed:[]};
            pictureEvidence.actions.push(entry);
            const expected={houseIndex,puzzleRevision:1,roundHash,illustrationId:scenario.illustrationId,illustrationVersion:scenario.illustrationVersion,illustrationDigest:scenario.illustrationDigest,completed:false,placements,rosterMembers:[],selfHashes,rosterRevision:rosterHead,authorities:targets.map(v=>pictureAuthorityEvidence(v.pictureAuthority))};
            if(step.type==="start") {
                const snapshot=actor.snapshot;
                entry.beforeRosterRevision=snapshot.puzzleRoster.revision;
                const command={commandId:randomUUID(),houseId:h.id,type:"puzzle.start",expectedRevision:snapshot.durable.puzzle.revision,payload:{expectedRoundId:snapshot.durable.puzzle.current?.id??null,illustrationId:scenario.illustrationId,illustrationVersion:scenario.illustrationVersion,confirmUnfinished:false,authority:{serverEpoch:snapshot.serverEpoch,accessGeneration:snapshot.accessGeneration,generation:snapshot.generation},expectedRoster:{serverEpoch:snapshot.puzzleRoster.serverEpoch,revision:snapshot.puzzleRoster.revision}}};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.command",{generation:actor.generation,zoneId:"lounge",command}));
                if(ack.entityRevision!==1||ack.result?.puzzleRevision!==1||typeof ack.result.roundId!=="string")fail("PICTURE_START_ACK");
                roundId=ack.result.roundId;roundHash=hash(Buffer.from(roundId));entry.ack={ok:true,entityRevision:ack.entityRevision,puzzleRevision:ack.result.puzzleRevision,roundHash};
                Object.assign(expected,{roundHash,rosterRevision:undefined,minimumRosterRevision:entry.beforeRosterRevision});
            } else if(step.type==="join") {
                const snapshot=actor.snapshot,request={generation:actor.generation,zoneId:"lounge",serverEpoch:snapshot.serverEpoch,accessGeneration:snapshot.accessGeneration,intentSequence:++actor.pictureIntentSequence,requestId:randomUUID(),roundId,mode:"join"};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.puzzle.intent",request));
                entry.requestHash=hash(Buffer.from(request.requestId));entry.ack=puzzleIntentACK(ack,request);participants.set(step.memberIndex,ack.participationId);selfHashes[step.memberIndex]=entry.ack.participationHash;
                if(entry.ack.rosterRevision<=rosterHead)fail("PICTURE_ROSTER_NOT_ADVANCED");
                Object.assign(expected,{rosterRevision:entry.ack.rosterRevision,rosterMembers:Array.from({length:step.memberIndex+1},(_,i)=>i)});
            } else {
                const pieceIndex=stepIndex-7,revision=pieceIndex+2;
                const command={commandId:randomUUID(),houseId:h.id,type:"puzzle.place",payload:{roundId,participationId:participants.get(step.memberIndex),pieceId:step.pieceId,destination:step.destination}};
                const ack=ok(await actor.socket.timeout(5000).emitWithAck("house.command",{generation:actor.generation,zoneId:"lounge",command}));
                if(ack.entityRevision!==revision||ack.result?.puzzleRevision!==revision||ack.result.roundId!==roundId||ack.result.pieceId!==step.pieceId||ack.result.destination!==step.destination||ack.result.completed!==(pieceIndex===23))fail("PICTURE_PLACEMENT_ACK");
                entry.pieceId=step.pieceId;entry.destination=step.destination;entry.ack={ok:true,entityRevision:ack.entityRevision,puzzleRevision:ack.result.puzzleRevision,roundHash,pieceId:ack.result.pieceId,destination:ack.result.destination,completed:ack.result.completed};
                placements.push({pieceId:step.pieceId,destination:step.destination,memberIndex:step.memberIndex});
                Object.assign(expected,{puzzleRevision:revision,rosterMembers:[0,1,2,3,4,5]});
                if(pieceIndex===23){expected.completed=true;expected.rosterMembers=[];expected.selfHashes=Array(6).fill(null);expected.rosterRevision=undefined;expected.minimumRosterRevision=rosterHead;}
            }
            entry.roundHash=roundHash;entry.status="ACCEPTED";
            await observePicture(entry,expected,targets,at);
            rosterHead=entry.rosterRevision;
        }
    }


  return {
    evidence,
    async prepare(){
      for(let index=0;index<2;index++){const house=await makeHouse(6,index);houses.push(house);for(const actor of house.members){views[actor.index]=actor;await connect(actor);}}
      mediaHouse=await makeHouse(3,2);media.push(...mediaHouse.members);
      for(const actor of media)await connect(actor);
      const owner=media[0];owner.roomId=owner.snapshot.durable.residents.find(person=>person.id===owner.identity).bedroomId;await subscribe(owner,owner.roomId);
      await Promise.all(houses.flatMap(house=>house.members).map(actor=>sit(actor,"game-seat-"+(actor.memberIndex+1))));evidence.status="READY";
    },
    async run(clockStart){start=clockStart;evidence.status="RUNNING";gameEvidence.status="RUNNING";pictureEvidence.status="RUNNING";await Promise.all([...houses.map(async house=>{for(let index=0;index<6;index++)await playGameRound(house.index,index);}),...houses.map(house=>playPicture(house.index)),playMedia()]);gameEvidence.status="COMPLETE";pictureEvidence.status="COMPLETE";evidence.status="COMPLETE";},
    finish(){
      evidence.transport.connectedAtEnd=all.filter(actor=>actor.socket?.connected).length;
      const maximum=times=>{let left=0,max=0;for(let right=0;right<times.length;right++){while(times[right]-times[left]>=60000)left++;max=Math.max(max,right-left+1);}return max;};
      evidence.media.httpBudget=[...httpCounts.values()].map((value,index)=>({actorIndex:index,totalReads:value.reads.length,totalWrites:value.writes.length,rollingReadMax60s:maximum(value.reads),rollingWriteMax60s:maximum(value.writes)}));
      return {spatialActivities:gradeGameEvidence(p.gameScenario,p.slowReader,gameEvidence)&&gradePictureEvidence(p.pictureScenario,pictureEvidence),spatialLifecycle:gradeSpatialLifecycle(scenario,evidence)};
    },
    projectBaseSample(sample){const extra=all.filter(actor=>actor.socket?.connected).length;return {...sample,houseViews:sample.houseViews-extra,activeEngines:sample.activeEngines-extra};},
    verifyClosed(path){
      pictureEvidence.persisted=verifyClosedPictureTables(path,houses,p.pictureScenario,pictureEvidence);
      const db=new DatabaseSync(path,{readOnly:true});try{
        const actors=houses.flatMap(house=>house.members.map(member=>member.identity)),markers=actors.map(()=>"?").join(",");
        const receipts=db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS bytes FROM receipts WHERE actor_id IN ("+markers+")").get(...actors);
        const games=houses.map(house=>db.prepare("SELECT octet_length(state) AS bytes,json_type(state,'$.current') AS currentType FROM game_tables WHERE house_id=?").get(house.id));
        const studio=db.prepare("SELECT count(*) AS rows,coalesce(sum(length(image)),0) AS imageBytes,max(revision) AS revision FROM room_studio_rooms").get();
        const uploads=db.prepare("SELECT count(*) AS count,coalesce(sum(length(data)),0) AS bytes FROM room_studio_uploads").get();
        const studioReceipts=db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS bytes,coalesce(max(octet_length(response)),0) AS maxBytes FROM room_studio_receipts").get();
        evidence.persisted={activityReceipts:receipts,gameTables:games,studio,uploads,studioReceipts};
        return pictureEvidence.persisted.allMatch&&receipts.count===186&&games.every(game=>game&&game.currentType==="null"&&game.bytes<=8192)&&studio.rows===1&&studio.imageBytes===evidence.media.uploads[1]?.inputBytes&&studio.revision===4&&uploads.count===0&&uploads.bytes===0&&studioReceipts.maxBytes<=512&&studioReceipts.bytes<=32768;
      }finally{db.close();}
    },
    close(){closing=true;for(const actor of all)actor.socket?.disconnect();}
  };
}
