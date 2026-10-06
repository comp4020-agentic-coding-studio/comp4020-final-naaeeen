/** Complete actual-server synthetic localhost load; no deployment/human evidence. */
import {fork,execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,createWriteStream,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {io} from 'socket.io-client';
import {Server} from 'socket.io';
import {createLayout,validPosition,slide} from '../public/house-geometry.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const arg=(key,fallback)=>{const n=process.argv.indexOf(key);return n<0?fallback:process.argv[n+1];};
const q=(v,p)=>v.length?[...v].sort((a,b)=>a-b)[Math.max(0,Math.ceil(v.length*p)-1)]:null;
const round=v=>v===null?null:Math.round(v*1000)/1000;
const ok=v=>{if(!v?.ok)throw new Error('Action rejected: '+(v?.code??'NO_ACK'));return v;};
async function serve(){
  let sio;const original=Server.prototype.attach;
  Server.prototype.attach=function(...args){sio=this;return original.apply(this,args);};
  const counts={}, log=console.log;
  console.log=(...args)=>{for(const a of args)if(typeof a==='string')try{const r=JSON.parse(a);if(r.action&&r.outcome){const k=r.action+':'+r.outcome;counts[k]=(counts[k]??0)+1;if(r.action==='connection.disconnect')process.send?.({kind:'closed',id:r.actor,at:Date.now()});}}catch{}log(...args);};
  const {createService}=await import('../src/server.ts');
  const port=Number(arg('--port','4096')), origin='http://127.0.0.1:'+port;
  const service=createService({dataDir:arg('--data-dir'),secureCookies:false,origin});
  const loop=monitorEventLoopDelay({resolution:10});loop.enable();
  let maxPackets=0,maxBytes=0,maxConnections=0;
  const sample=()=>{const sockets=[...(sio?.of('/').sockets.values()??[])];maxConnections=Math.max(maxConnections,sockets.length);
    for(const s of sockets){const b=s.conn.writeBuffer,ws=s.conn.transport.socket;if(!Array.isArray(b)||typeof ws?.bufferedAmount!=='number')throw new Error('Pinned queue telemetry changed');
      const bytes=b.reduce((n,p)=>n+32+((typeof p.data==='string'||Buffer.isBuffer(p.data))?Buffer.byteLength(p.data):0),0)+ws.bufferedAmount;
      maxPackets=Math.max(maxPackets,b.length);maxBytes=Math.max(maxBytes,bytes);}
    return {kind:'stats',rss:process.memoryUsage().rss/1024**2,maxPackets,maxBytes,maxConnections,p95:loop.percentile(95)/1e6,p99:loop.percentile(99)/1e6,loopMax:loop.max/1e6,counts};};
  const timer=setInterval(()=>process.send?.(sample()),100);
  await new Promise((done,reject)=>{service.server.once('error',reject);service.server.listen(port,'127.0.0.1',done);});process.send?.({kind:'ready'});
  let closing=false;process.on('message',async v=>{if(v!=='stop'||closing)return;closing=true;clearInterval(timer);process.send?.(sample());loop.disable();await service.close();process.exit(0);});
}
async function load(config,seconds,port){
  const protocol=JSON.parse(readFileSync(join(root,'evaluation/house-load.protocol.json'),'utf8')),def=protocol.configurations[config];if(!def)throw new Error('Choose L1, L2 or all');
  const data=join(root,'.local/house-load',new Date().toISOString().replaceAll(':','-')+'-'+config+'-'+randomUUID());mkdirSync(join(data,'data'),{recursive:true});
  const label=arg('--label','');const plannedOutput=join(root,'evaluation','house-load.'+config+(seconds>=1800?'':'.calibration')+(label?'.'+label:'')+'.results.json');if(label&&existsSync(plannedOutput))throw new Error('Refusing to overwrite a labelled acceptance result');
  const candidateCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const sourceHashes=Object.fromEntries(['src/server.ts','src/house-realtime.ts','src/house-store.ts','src/house-contract.ts','src/store.ts','src/domain.ts','public/house-geometry.js','tools/house-load.mjs','tools/house-load-calibration.mjs','evaluation/house-load.protocol.json','evaluation/house-load.protocol.v2-preserved.json','package.json','pnpm-lock.yaml'].map(p=>[p,createHash('sha256').update(readFileSync(join(root,p))).digest('hex')]));
  const child=fork(fileURLToPath(import.meta.url),['--server','--data-dir',join(data,'data'),'--port',String(port)],{cwd:root,silent:true,env:{...process.env,NODE_ENV:'test'}});
  child.stdout.pipe(createWriteStream(join(data,'server.log')));child.stderr.pipe(createWriteStream(join(data,'server.stderr.log')));
  const stats={rss:0,maxPackets:0,maxBytes:0,maxConnections:0,p95:0,p99:0,loopMax:0,counts:{}},closed=new Map();
  child.on('message',v=>{if(v?.kind==='closed')closed.set(v.id,v.at);if(v?.kind==='stats'){for(const k of ['rss','maxPackets','maxBytes','maxConnections','loopMax'])stats[k]=Math.max(stats[k],v[k]);stats.p95=v.p95;stats.p99=v.p99;stats.counts=v.counts;}});
  const origin='http://127.0.0.1:'+port,views=[],houses=[],deliveries=[],slowEvidence=[],errors={};
  let healthAtStart=false,healthAtEnd=false,closingHarness=false,unexpectedDisconnects=0,healthyViewsAtEnd=0;const disconnectCounts={};
  let running=false,motionTimer,intentTimer,start=0,end=0,failure=null,motionSent=0,motionOk=0,motionRejected=0,expectedTimeouts=0,unexpectedTimeouts=0,intentsSaved=0,maxOutstanding=0,maxOutstandingNormal=0,maxOutstandingPaused=0,droppedRejectedTraces=0;
  const problem=code=>errors[code]=(errors[code]??0)+1;
  const rejectedFrameTraces=[],rejectionTraceLimit=32;
  function recordMotionFailure(v,body,frame,code,message,ackAt){
    if(rejectedFrameTraces.length>=rejectionTraceLimit){droppedRejectedTraces++;return;}
    rejectedFrameTraces.push({viewIndex:v.index,sequence:body.sequence,generation:body.generation,
      sendAtMs:round(frame.sentAt-start),ackAtMs:round(ackAt-start),elapsedMs:round(frame.elapsed),
      previousAckAtMs:round(frame.previousAck-start),outstandingAtSend:frame.outstanding,outstandingAtAck:v.outstanding,
      pausedAtSend:frame.paused,pausedAtAck:v.paused,readyAtSend:frame.ready,readyAtAck:v.ready,code,message});
  }
  function deliver(view,snapshot,at=performance.now()){view.snapshot=snapshot;view.generation=snapshot.generation;view.receivedAt=at;
    for(const d of deliveries)if(d.house===view.house&&d.pending.has(view.index)&&snapshot.durable.sequence>=d.sequence){d.pending.delete(view.index);d.latencies.push(at-d.at);if(d.slow.has(view.index))d.slowLatencies.push(at-d.at);}}
  async function http(path,cookie,body){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await r.json();if(!r.ok)throw new Error('HTTP rejected: '+(value.code??r.status));return{value,cookie:r.headers.get('set-cookie')?.split(';')[0]??cookie};}
  async function connect(v){if(v.outstanding!==0)throw new Error('Motion ACKs did not settle before reconnect');v.ready=false;v.socket=io(origin,{autoConnect:false,forceNew:true,reconnection:false,transports:['websocket'],extraHeaders:{Origin:origin,Cookie:v.cookie}});
    v.socket.on('house.snapshot',s=>deliver(v,s));v.socket.on('disconnect',reason=>{v.ready=false;v.reasons.push(reason);if(start&&!closingHarness&&!v.paused){unexpectedDisconnects++;disconnectCounts[reason]=(disconnectCounts[reason]??0)+1;}if(running&&v.controller)v.connectedMs+=performance.now()-Math.max(start,v.connectedAt);});
    await new Promise((done,reject)=>{v.socket.once('connect',done);v.socket.once('connect_error',reject);v.socket.connect();});
    const r=ok(await v.socket.timeout(3000).emitWithAck('house.subscribe',{zoneId:'lounge',controllerToken:v.token}));deliver(v,r.snapshot);
    if(r.snapshot.controller!==v.controller)throw new Error('Controller/observer fixture mismatch');
    const own=r.snapshot.players.find(p=>p.id===v.identity);if(v.controller&&(!Number.isFinite(own?.x)||!Number.isFinite(own?.z)))throw new Error('Actual controller spawn is not finite');v.x=own?.x??0;v.z=own?.z??2.85;v.initialPose??={slot:r.snapshot.durable.residents.find(p=>p.id===v.identity)?.slot,x:v.x,z:v.z};v.sequence=0;v.lastSend=performance.now();v.lastAck=v.lastSend;v.connectedAt=v.lastSend;v.nextSend=v.lastSend+100;v.ready=true;}
  function view(member,controller){const v={...member,index:views.length,controller,token:randomUUID(),socket:null,snapshot:null,generation:0,sequence:0,x:0,z:2.85,direction:1,lastSend:0,lastAck:0,preparingPause:false,ready:false,connectedAt:0,connectedMs:0,motionSent:0,paused:false,outstanding:0,reasons:[]};views.push(v);return v;}
  async function slow(v,cycle){const socket=v.socket,ws=socket.io.engine.transport.ws,tcp=ws?._socket;
    if(typeof ws?.pause!=='function'||typeof ws?.resume!=='function'||typeof tcp?.isPaused!=='function')throw new Error('Pinned real TCP reader path changed');
    v.preparingPause=true;for(let i=0;v.outstanding>0&&i<100;i++)await sleep(10);if(v.outstanding>0)throw new Error('Motion ACKs did not drain before slow read');v.preparingPause=false;
    const generation=v.generation,sequence=v.snapshot.durable.sequence,receivedAt=v.receivedAt;
    v.paused=true;ws.pause();const e={reader:v.slowReaderIndex,cycle,completed:false,role:v.controller?'controller':'observer',tcpPauseVerified:tcp.isPaused(),readerStayedPaused:false,expiryObserved:false,rejoined:false,freshSnapshot:false,quietAfterExpiry:null,generationAdvanced:null};slowEvidence.push(e);if(!e.tcpPauseVerified)throw new Error('TCP not paused');
    await sleep(seconds>=100?65000:Math.min(8000,(seconds-8)*1000));
    e.readerStayedPaused=v.receivedAt===receivedAt;e.expiryObserved=!!closed.get(v.identity)&&Date.now()-closed.get(v.identity)>30000&&!socket.connected;
    if(socket.connected){ws.resume();v.paused=false;e.resumedBeforeExpiry=true;}else{ws.resume();socket.disconnect();v.paused=false;await connect(v);e.rejoined=true;e.freshSnapshot=v.snapshot.durable.sequence>=Math.max(sequence,...deliveries.filter(d=>d.house===v.house&&Number.isFinite(d.sequence)).map(d=>d.sequence));
      if(v.controller){const own=v.snapshot.players.find(p=>p.id===v.identity);e.quietAfterExpiry=own.availability==='quiet';e.generationAdvanced=v.generation>generation;ok(await v.socket.timeout(3000).emitWithAck('house.availability',{generation:v.generation,value:'chat'}));}}e.completed=true;}
  const intentJobs=[],slowJobs=[];
  async function intent(h,n){h.intentOffsets.push(performance.now()-start);const candidate=h.controllers[Math.floor(n/2)%6],v=candidate.ready&&candidate.socket.connected&&!candidate.paused?candidate:h.controllers.find(v=>v.ready&&v.socket.connected&&!v.paused);if(!v)throw new Error('No connected intent author');
    const card=n%2===1,old=v.snapshot.durable.cards.find(c=>c.authorId===v.identity&&c.state==='active');
    const command={commandId:randomUUID(),houseId:h.id,type:card?'card.save':'chat.send',payload:card?{...(old?{cardId:old.id}:{}),smallGoal:'Synthetic question',question:'Synthetic bounded question',resourceUrl:'',nextStep:'Synthetic next step '+n,helpRequested:true}:{zoneId:'lounge',text:'Synthetic bounded chat '+n},...(card?{expectedRevision:old?.revision??0}:{})};
    const d={house:h.index,sequence:Infinity,at:performance.now(),pending:new Set(views.filter(v=>v.house===h.index).map(v=>v.index)),slow:new Set(views.filter(v=>v.house===h.index&&v.paused).map(v=>v.index)),latencies:[],slowLatencies:[]};deliveries.push(d);
    const receipt=ok(await v.socket.timeout(5000).emitWithAck('house.command',{generation:v.generation,zoneId:'lounge',command}));d.sequence=receipt.sequence;intentsSaved++;h.saved++;
    for(const r of views)if(r.house===h.index&&r.snapshot.durable.sequence>=receipt.sequence)deliver(r,r.snapshot,r.receivedAt);}
  try{
    await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);const handler=v=>{if(v?.kind==='ready'){clearTimeout(timer);child.off('message',handler);done();}};child.on('message',handler);child.once('exit',c=>reject(new Error('Server exited: '+c)));});
    healthAtStart=(await http('/health')).value.ok===true;if(!healthAtStart)throw new Error('Actual service is not healthy at start');
    for(let h=0;h<def.houses;h++){const members=[];for(let n=0;n<6;n++){const b=await http('/api/house/me');await http('/api/house/command',b.cookie,{commandId:randomUUID(),type:n===0?'house.create':'house.join',payload:{...(n===0?{capacity:6}:{code:houses[h].code}),name:'Synthetic '+h+' '+n,colour:['sage','blue','rose','amber','peach','lavender'][n]}});
        const me=(await http('/api/house/me',b.cookie)).value;if(n===0)houses.push({index:h,id:me.home.id,code:me.home.code,controllers:[],counter:0,saved:0,intentOffsets:[]});members.push({identity:me.identity.id,cookie:b.cookie,house:h});}
      for(const m of members){const v=view(m,true);houses[h].controllers.push(v);await connect(v);ok(await v.socket.timeout(3000).emitWithAck('house.availability',{generation:v.generation,value:'chat'}));}
      if(def.observers)for(const m of members){const v=view(m,false);await connect(v);}}
    if(views.length!==12||views.filter(v=>v.controller).length!==def.controllers)throw new Error('Exact twelve-view fixture failed');
    const layout=createLayout(6);for(const v of views.filter(v=>v.controller))for(const x of [-2,0,2])if(!validPosition(layout,{x,z:v.z}))throw new Error('Actual arrival corridor invalid');
    const slowViews=config==='L1'?views.filter(v=>!v.controller).slice(0,2):houses.map(h=>h.controllers[0]);slowViews.forEach((v,n)=>v.slowReaderIndex=n);
    start=performance.now();running=true;
    views.filter(v=>v.controller).forEach((v,n,list)=>{v.nextSend=start+100+n*100/list.length;});
    motionTimer=setInterval(()=>{const now=performance.now();for(const v of views)if(v.controller&&v.ready&&v.socket.connected&&!v.preparingPause){const elapsed=now-v.lastSend;if(now<v.nextSend||elapsed<80||(!v.paused&&(v.outstanding>0||now-v.lastAck<80)))continue;v.nextSend+=100;const distance=v.paused?0:2*Math.min(elapsed/1000,.1);let direction=v.direction;if(v.x+direction*distance>2||v.x+direction*distance< -2)direction*=-1;
      const next=slide(layout,{x:v.x,z:v.z},direction*distance,0);if(!validPosition(layout,next)){problem('HARNESS_ROUTE');continue;}
      const body={generation:v.generation,sequence:++v.sequence,x:next.x,z:next.z,heading:direction>0?Math.PI/2:-Math.PI/2};v.lastSend=now;motionSent++;v.motionSent++;v.outstanding++;maxOutstanding=Math.max(maxOutstanding,v.outstanding);const paused=v.paused,socket=v.socket;
      if(paused)maxOutstandingPaused=Math.max(maxOutstandingPaused,v.outstanding);else maxOutstandingNormal=Math.max(maxOutstandingNormal,v.outstanding);
      const frame={sentAt:now,elapsed,previousAck:v.lastAck,outstanding:v.outstanding,paused,ready:v.ready};
      socket.timeout(3500).emit('house.move',body,(error,r)=>{v.outstanding--;const ackAt=performance.now();if(error){if(paused)expectedTimeouts++;else{unexpectedTimeouts++;problem('MOTION_ACK_TIMEOUT');recordMotionFailure(v,body,frame,'MOTION_ACK_TIMEOUT',error.message??'Motion acknowledgement timed out.',ackAt);}}else if(!r?.ok){motionRejected++;problem(r?.code??'NO_ACK');recordMotionFailure(v,body,frame,r?.code??'NO_ACK',r?.message??'The motion did not receive a successful acknowledgement.',ackAt);}else{motionOk++;if(v.ready&&v.socket===socket&&v.generation===body.generation){v.lastAck=ackAt;v.x=next.x;v.z=next.z;v.direction=direction;}}});}},10);
    for(const h of houses)intentJobs.push(intent(h,h.counter++));
    intentTimer=setInterval(()=>{if(running&&performance.now()-start<seconds*1000)for(const h of houses){if(h.counter>=Math.ceil(seconds/10))continue;const p=intent(h,h.counter++);intentJobs.push(p);p.catch(e=>failure??=e.message);}},10000);
    for(const v of slowViews)slowJobs.push((async()=>{await sleep(seconds>=100?15000:5000);let n=0;while(running){await slow(v,++n);if(seconds<1800)break;await sleep(235000);}})().catch(e=>failure??=e.message));
    for(let elapsed=0;elapsed<seconds;elapsed++){await sleep(1000);if(elapsed%60===59)console.log(JSON.stringify({config,elapsedSeconds:elapsed+1,rssMiB:round(stats.rss),intentsSaved,motionRejected,unexpectedTimeouts}));if(child.exitCode!==null)throw new Error('Actual server exited during measurement');}
    end=performance.now();for(const v of views)if(v.controller&&v.socket.connected)v.connectedMs+=end-Math.max(start,v.connectedAt);running=false;clearInterval(motionTimer);clearInterval(intentTimer);await Promise.all(intentJobs);await sleep(4000);
    for(const v of views)if(v.socket.connected&&!v.paused){const r=ok(await v.socket.timeout(3000).emitWithAck('house.subscribe',{zoneId:'lounge',controllerToken:v.token}));deliver(v,r.snapshot);}healthyViewsAtEnd=views.filter(v=>v.socket.connected).length;
    await Promise.all(slowJobs);healthAtEnd=(await http('/health')).value.ok===true;
  }catch(e){failure=e.message;}finally{closingHarness=true;running=false;clearInterval(motionTimer);clearInterval(intentTimer);for(const v of views)v.socket?.disconnect();if(child.exitCode===null){child.send('stop');await Promise.race([new Promise(done=>child.once('exit',done)),sleep(5000)]);if(child.exitCode===null)child.kill('SIGTERM');}}
  const latencies=deliveries.flatMap(d=>d.latencies),slowLatencies=deliveries.flatMap(d=>d.slowLatencies),missing=deliveries.reduce((n,d)=>n+d.pending.size,0),full=seconds>=1800;
  const motionRates=views.filter(v=>v.controller).map(v=>v.connectedMs>0?v.motionSent/(v.connectedMs/1000):0);
  const expectedIntents=Math.ceil(seconds/10),expectedSlowCycles=full?Math.ceil((seconds-15)/300):1;
  const intentStats=houses.map(h=>({house:h.index,scheduled:h.counter,saved:h.saved,expected:expectedIntents,maxIntervalMs:round(Math.max(0,...h.intentOffsets.slice(1).map((at,n)=>at-h.intentOffsets[n])))}));
  const gates={actualHealth:healthAtStart&&healthAtEnd,intentWorkload:intentStats.every(h=>h.saved===h.expected&&h.scheduled===h.expected&&h.maxIntervalMs<=11000),healthyViews:healthyViewsAtEnd===12&&stats.maxConnections===12&&unexpectedDisconnects===0,motionCadence:motionRates.every(rate=>rate>=9.8&&rate<=10.2),exactViews:views.length===12&&views.filter(v=>v.controller).length===def.controllers,fullDuration:full&&end-start>=1800000,rss:stats.rss<=180,visibleP95:q(latencies,.95)!==null&&q(latencies,.95)<=1000,durableDeliveryComplete:missing===0,validNormalMotion:motionRejected===0&&unexpectedTimeouts===0,boundedServerQueue:stats.maxPackets<=4&&stats.maxBytes<=524288,eventLoop:stats.p95<=50&&stats.p99<=100,slowExpiryRejoin:slowEvidence.length===expectedSlowCycles*2&&[0,1].every(reader=>slowEvidence.filter(e=>e.reader===reader).length===expectedSlowCycles)&&slowEvidence.every(e=>e.completed&&e.tcpPauseVerified&&e.readerStayedPaused&&e.expiryObserved&&e.rejoined&&e.freshSnapshot&&(e.role!=='controller'||(e.quietAfterExpiry&&e.generationAdvanced)))};
  const result={protocolVersion:protocol.version,classification:'synthetic-localhost-complete-server',config,status:failure?'FAIL':full?(Object.values(gates).every(Boolean)?'PASS':'FAIL'):'CALIBRATION',limitation:'No Fly deployment, real network, physical phone, human usability or value evidence.',durationRequestedSeconds:seconds,durationMeasuredSeconds:round((end-start)/1000),candidate:{commitAtStart:candidateCommit,sourceHashes},runtime:{node:process.version,socketIO:'4.8.4',engineIO:'6.6.11',ws:'8.21.3',bind:'127.0.0.1',port,secureCookies:false},workload:{houses:def.houses,controllers:def.controllers,observers:def.observers,totalViews:views.length,motionHzPerConnectedController:10,subscriptionReadyRequired:true,fullExpiryFault:seconds>=100,motionMetresPerSecond:2,initialControllerPoses:views.filter(v=>v.controller).map(v=>({house:v.house,...v.initialPose})),intentsPerMinutePerHouse:6,intentStats,chatAndCardAlternated:true,motionRateHzPerController:motionRates.map(round),motionSent,motionAcknowledged:motionOk,motionRejected,intentsSaved,expectedSlowAckTimeouts:expectedTimeouts,unexpectedTimeouts,maxOutstandingMotion:maxOutstanding,maxOutstandingMotionNormal:maxOutstandingNormal,maxOutstandingMotionPaused:maxOutstandingPaused,healthAtStart,healthAtEnd,unexpectedDisconnects,healthyViewsAtEnd,disconnectCounts},metrics:{serverRssMaxMiB:round(stats.rss),serverQueuePacketsObservedMax:stats.maxPackets,serverQueueBytesObservedMax:stats.maxBytes,maxConnectionsObserved:stats.maxConnections,eventLoopP95Ms:round(stats.p95),eventLoopP99Ms:round(stats.p99),eventLoopMaxMs:round(stats.loopMax),visibilitySamples:latencies.length,durableMissingDeliveries:missing,durableVisibleP95Ms:round(q(latencies,.95)),durableVisibleMaxMs:round(Math.max(0,...latencies)),slowVisibilitySamples:slowLatencies.length,slowVisibleMaxMs:round(Math.max(0,...slowLatencies))},slowReaders:slowEvidence,actionCounts:stats.counts,errors,diagnostics:{rejectedFrameTraceLimit:rejectionTraceLimit,rejectedFrameTraces,droppedRejectedFrameTraces:droppedRejectedTraces},gates,...(failure?{failure}:{})};
  const output=join(root,'evaluation','house-load.'+config+(full?'':'.calibration')+(label?'.'+label:'')+'.results.json');if(label&&existsSync(output))throw new Error('Refusing to overwrite a labelled acceptance result');writeFileSync(output,JSON.stringify(result,null,2)+'\n');{const historyPath=join(root,'evaluation/house-load.'+(full?'full':'calibration')+'-history.results.json');const history=existsSync(historyPath)?JSON.parse(readFileSync(historyPath,'utf8')):{classification:'synthetic-localhost-'+(full?'full':'calibration')+'-history',runs:[]};history.runs.push(result);writeFileSync(historyPath,JSON.stringify(history,null,2)+'\n');}console.log(JSON.stringify({config,status:result.status,result:output,metrics:result.metrics,gates}));if(result.status==='FAIL')process.exitCode=1;return result;
}
if(process.argv.includes('--server'))await serve();else{const label=arg('--label','');if(label&&!/^[a-z0-9-]{1,64}$/.test(label))throw new Error('Use a safe lowercase result label');const seconds=Number(arg('--duration','1800')),config=arg('--config','all'),port=Number(arg('--port','4096'));if(!Number.isInteger(seconds)||seconds<10||seconds>3600||!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use duration 10..3600 and port 1024..65535');for(const choice of config==='all'?['L1','L2']:[config])await load(choice,seconds,port);process.exit(process.exitCode??0);}
