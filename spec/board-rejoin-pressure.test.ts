import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Server, type Socket as ServerSocket } from "socket.io";
import { io, type Socket } from "socket.io-client";
import { afterEach, expect, test } from "vitest";
import { BoardStore } from "../src/board-store.ts";
import { HouseStore } from "../src/house-store.ts";
import { attachBoardService } from "../src/board-service.ts";

interface Connection {
  readyState: string;
  writeBuffer: Array<{ type: string; data?: unknown }>;
  transport: { writable: boolean; socket: { bufferedAmount: number } };
  flush(): void;
}
const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async()=>{for(const action of cleanup.splice(0).reverse())await action();});
const ask=(socket:Socket,event:string,value:unknown)=>socket.timeout(1500).emitWithAck(event,value) as Promise<any>;
function textElement(index:number){
  const text="n".repeat(11500);
  return {id:"pressure_"+index,type:"text",x:0,y:index*30,width:100,height:20,angle:0,strokeColor:"#1e1e1e",backgroundColor:"transparent",fillStyle:"solid",strokeWidth:2,strokeStyle:"solid",roundness:null,roughness:1,opacity:100,seed:1,version:1,versionNonce:100+index,index:"a"+String(index).padStart(3,"0"),isDeleted:false,groupIds:[],frameId:null,boundElements:null,updated:1000,link:null,locked:false,text,originalText:text,fontSize:20,fontFamily:5,textAlign:"left",verticalAlign:"top",containerId:null,autoResize:false,lineHeight:1.25};
}
function packetKind(packet:{type:string;data?:unknown}){
  if(packet.type!=="message")return packet.type;
  if(typeof packet.data!=="string")return "message:binary-or-unknown";
  if(packet.data.startsWith("3/board,"))return "message:ack";
  const event=/^2\/board,\["(board\.(?:presence|chat|patch|snapshot|revoked))"/.exec(packet.data);
  return event?"message:"+event[1]:"message:other";
}
function next(socket:Socket,event:string){return new Promise<any>((resolve,reject)=>{
 const timer=setTimeout(()=>{socket.off(event,receive);reject(new Error("Missing bounded board delivery"));},1500);
 function receive(value:unknown){clearTimeout(timer);socket.off(event,receive);resolve(value);}socket.once(event,receive);
});}
async function fixture(){
 const root=mkdtempSync(join(tmpdir(),"board-rejoin-")),house=new HouseStore(join(root,"house.sqlite")),board=new BoardStore(join(root,"board.sqlite"));
 const owner=house.ensureSession(),resident=house.ensureSession();
 house.execute(owner.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Snapshot owner",colour:"sage"}});const home=house.me(owner.id).home!;
 house.execute(resident.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Snapshot resident",colour:"blue"}});
 const elements=Array.from({length:80},(_,index)=>textElement(index));
 for(let start=0;start<elements.length;start+=4)board.patch(owner.id,{id:randomUUID(),houseId:home.id,elements:elements.slice(start,start+4)});
 for(let n=0;n<100;n++)board.chat(owner.id,"Snapshot owner",{id:randomUUID(),houseId:home.id,text:"c".repeat(4000)});
 const seeded=board.snapshot(home.id),sceneBytes=Buffer.byteLength(JSON.stringify(seeded.elements)),snapshotBytes=Buffer.byteLength(JSON.stringify(seeded));
 expect(sceneBytes).toBeGreaterThan(1.75*1024*1024);expect(sceneBytes).toBeLessThan(1.9*1024*1024);
 expect(seeded.chat.length).toBe(100);expect(seeded.chat.every(message=>message.text.length===4000)).toBe(true);expect(snapshotBytes).toBeLessThan(4*1024*1024);
 const server=createServer((request,response)=>{void service.handle(request,response).then(handled=>{if(!handled)response.writeHead(404).end();});});
 const sockets=new Server(server,{transports:["websocket"],maxHttpBufferSize:16*1024,perMessageDeflate:false});
 const outcomes:string[]=[];const service=attachBoardService(sockets,house,board,{log:record=>outcomes.push(String(record.outcome))});
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 cleanup.push(()=>{if(!root.startsWith(join(tmpdir(),"board-rejoin-")))throw new Error("Unexpected fixture target");rmSync(root,{recursive:true,force:true});},()=>house.close(),()=>board.close(),()=>new Promise<void>(resolve=>{service.close();server.closeAllConnections();sockets.close(()=>resolve());}));
 async function connect(person:typeof owner,subscribe=true){
  const client=io(url+"/board",{transports:["websocket"],reconnection:false,forceNew:true,extraHeaders:{Origin:url,Cookie:`house_session=${person.token}`}});cleanup.push(()=>{client.disconnect();});
  await new Promise<void>((resolve,reject)=>{client.once("connect",resolve);client.once("connect_error",reject);});
  const peer=sockets.of("/board").sockets.get(client.id!)!;expect(Boolean(peer)).toBe(true);const conn=peer.conn as unknown as Connection;
  let subscriptionId="";
  if(subscribe){const reply=await ask(client,"board.subscribe",{houseId:home.id});expect(reply.ok).toBe(true);expect(reply.snapshot.chat.length).toBe(100);subscriptionId=reply.subscriptionId;}
  await expect.poll(()=>conn.writeBuffer.length).toBe(0);await expect.poll(()=>conn.transport.writable).toBe(true);
  return {client,peer,conn,subscriptionId};
 }
 const healthy=await connect(owner),old=await connect(resident);old.client.disconnect();
 await expect.poll(()=>sockets.of("/board").sockets.size).toBe(1);await expect.poll(()=>sockets.engine.clientsCount).toBe(1);
 const current=await connect(resident,false);expect(current.peer.id===old.peer.id).toBe(false);expect(house.me(resident.id).home?.id===home.id).toBe(true);
 current.conn.transport.writable=false;
 const rejoined=ask(current.client,"board.subscribe",{houseId:home.id}).then(reply=>({ok:true,reply}),()=>({ok:false,reply:null}));
 await expect.poll(()=>current.conn.writeBuffer.some(packet=>packetKind(packet)==="message:ack")).toBe(true);
 const ackPacket=current.conn.writeBuffer.find(packet=>packetKind(packet)==="message:ack")!;
 const data=String(ackPacket.data),encoded=JSON.parse(data.slice(data.indexOf("[")))[0];
 expect(encoded.ok).toBe(true);expect(encoded.subscriptionId===encoded.snapshot.subscriptionId).toBe(true);expect(encoded.subscriptionId===old.subscriptionId).toBe(false);
 const trace:Array<Record<string,unknown>>=[];
 function capture(phase:string){const queued=current.conn.writeBuffer;const bytes=queued.reduce((total,packet)=>total+(typeof packet.data==="string"||Buffer.isBuffer(packet.data)?Buffer.byteLength(packet.data):0)+32,current.conn.transport.socket.bufferedAmount);
  const sample={phase,epoch:2,epochCurrent:current.conn.readyState==="open"&&encoded.subscriptionId===encoded.snapshot.subscriptionId,state:current.conn.readyState,currentSocket:sockets.of("/board").sockets.get(current.peer.id)?.conn===current.peer.conn,namespaceViews:sockets.of("/board").sockets.size,engines:sockets.engine.clientsCount,packets:queued.length,packetTypes:queued.map(packetKind),bytes};trace.push(sample);return sample;}
 capture("large-ack-queued");expect(current.conn.transport.socket.bufferedAmount).toBe(0);expect(Number(trace[0]!.bytes)).toBeGreaterThan(2*1024*1024);expect(Number(trace[0]!.bytes)).toBeLessThan(4*1024*1024);
 function restore(){current.conn.transport.writable=true;if(current.conn.readyState==="open")current.conn.flush();}
 async function pointer(index:number){const reply=await ask(healthy.client,"board.pointer",{subscriptionId:healthy.subscriptionId,x:index,y:index,selectedElementIds:[]});expect(reply.ok).toBe(true);}
 async function chat(index:number){const response=await fetch(url+"/api/board/chat",{method:"POST",headers:{Origin:url,Cookie:`house_session=${owner.token}`,"X-House-Identity":owner.id,"Content-Type":"application/json"},body:JSON.stringify({id:randomUUID(),houseId:home.id,text:"Reliable pressure "+index})});expect(response.status).toBe(200);await response.json();}
 return {healthy,current,rejoined,encoded,trace,capture,restore,pointer,chat,outcomes};
}

test("legal transient pointer pressure does not evict a current large-board rejoin ACK",async()=>{
 const f=await fixture();
 try{
  for(let n=0;n<8;n++){await f.pointer(n);f.capture("pointer-"+n);if(f.current.conn.readyState!=="open")break;await new Promise(resolve=>setTimeout(resolve,50));}
  console.info("board rejoin transient pressure",JSON.stringify(f.trace));
  // The actual current connection, rather than an obsolete client listener, must survive.
  expect(f.current.conn.readyState).toBe("open");expect(f.outcomes).not.toContain("SLOW_CONNECTION");
  // Install the observer before releasing transport pressure. Recovery must
  // deliver the latest already-accepted pointer without fresh user input.
  let currentDeliveries=0,healthyFeedback=0;
  f.current.client.on("board.presence",()=>{currentDeliveries++;});
  f.healthy.client.on("board.presence",()=>{healthyFeedback++;});
  const deferred=next(f.current.client,"board.presence");
  f.restore();const recovered=await f.rejoined;expect(recovered.ok).toBe(true);expect(recovered.reply.subscriptionId===f.encoded.subscriptionId).toBe(true);
  expect(recovered.reply.snapshot.chat.length).toBe(100);
  const latest=await deferred;
  expect(latest.subscriptionId).toBe(recovered.reply.subscriptionId);
  expect(latest.views.find((view:{name:string})=>view.name==="Snapshot owner").pointer).toMatchObject({x:7,y:7});
  await new Promise(resolve=>setTimeout(resolve,100));
  expect(currentDeliveries).toBe(1);expect(healthyFeedback).toBe(0);
  expect(f.current.conn.readyState).toBe("open");
 }finally{f.restore();await f.rejoined;}
});

test("reliable queued board traffic still enforces the unchanged packet cap below the byte cap",async()=>{
 const f=await fixture();
 try{
  for(let n=0;n<9;n++){const received=next(f.healthy.client,"board.chat");await f.chat(n);expect((await received).schemaVersion).toBe(1);f.capture("reliable-"+n);if(f.current.conn.readyState!=="open")break;}
  console.info("board rejoin reliable pressure",JSON.stringify(f.trace));
  expect(f.current.conn.readyState).not.toBe("open");expect(f.outcomes).toContain("SLOW_CONNECTION");
  const open=f.trace.filter(sample=>sample.state==="open");expect(open.some(sample=>sample.packets===8)).toBe(true);expect(open.every(sample=>Number(sample.bytes)<4*1024*1024)).toBe(true);
  expect(f.healthy.conn.readyState).toBe("open");
 }finally{f.restore();await f.rejoined;}
});

test("a second reliable near-limit bootstrap still enforces the unchanged four-MiB byte cap",async()=>{
 const f=await fixture();let second:Promise<any>|null=null;
 try{
  const pendingBytes=Number(f.trace[0]!.bytes),nextAckBytes=Buffer.byteLength(JSON.stringify(f.encoded));
  expect(pendingBytes+nextAckBytes+64).toBeGreaterThan(4*1024*1024);
  second=ask(f.current.client,"board.subscribe",{houseId:f.encoded.snapshot.houseId}).then(()=>true,()=>false);
  await expect.poll(()=>f.current.conn.readyState!=="open").toBe(true);
  f.capture("second-bootstrap-byte-cap");console.info("board rejoin byte pressure",JSON.stringify(f.trace));
  expect(f.healthy.conn.readyState).toBe("open");expect(f.current.conn.readyState).not.toBe("open");
 }finally{f.restore();await f.rejoined;if(second)await second;}
});


type ReadyListener = (...args: unknown[]) => void;
type PresenceConnection = Connection & {
  transport: Connection["transport"] & {
    emit(event: "ready"): boolean;
    listeners(event: "ready"): ReadyListener[];
  };
};

// These lifecycle cases intentionally use small boards: a second subscription
// must succeed here, while the near-limit bootstrap above still hits its cap.
async function lifecycleFixture() {
  const root = mkdtempSync(join(tmpdir(), "board-rejoin-lifecycle-"));
  const house = new HouseStore(join(root, "house.sqlite"));
  const board = new BoardStore(join(root, "board.sqlite"));
  const owner = house.ensureSession(), resident = house.ensureSession(), destinationOwner = house.ensureSession();
  house.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Original owner", colour: "sage" } });
  const home = house.me(owner.id).home!;
  house.execute(resident.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Moving resident", colour: "blue" } });
  house.execute(destinationOwner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Destination owner", colour: "rose" } });
  const destinationHome = house.me(destinationOwner.id).home!;
  for (const [person, place, label] of [[owner, home, "Original scene"], [destinationOwner, destinationHome, "Destination scene"]] as const) {
    board.patch(person.id, { id: randomUUID(), houseId: place.id, elements: [{ ...textElement(0), text: label, originalText: label }] });
    expect(Buffer.byteLength(JSON.stringify(board.snapshot(place.id)))).toBeLessThan(8 * 1024);
  }
  const server = createServer();
  const sockets = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false });
  const service = attachBoardService(sockets, house, board);
  const originalReadyListeners = new Map<string, ReadyListener[]>();
  sockets.of("/board").use((peer: ServerSocket, accept) => {
    originalReadyListeners.set(peer.id, [...(peer.conn as unknown as PresenceConnection).transport.listeners("ready")]);
    accept();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  cleanup.push(
    () => {
      if (!root.startsWith(join(tmpdir(), "board-rejoin-lifecycle-"))) throw new Error("Unexpected lifecycle fixture target");
      rmSync(root, { recursive: true, force: true });
    },
    () => house.close(),
    () => board.close(),
    () => new Promise<void>(resolve => { service.close(); server.closeAllConnections(); sockets.close(() => resolve()); }),
  );
  async function connect(person: typeof owner, houseId: string) {
    const client = io(url + "/board", { transports: ["websocket"], reconnection: false, forceNew: true, extraHeaders: { Origin: url, Cookie: "house_session=" + person.token } });
    cleanup.push(() => { client.disconnect(); });
    await new Promise<void>((resolve, reject) => { client.once("connect", resolve); client.once("connect_error", reject); });
    const peer = sockets.of("/board").sockets.get(client.id!)!;
    expect(Boolean(peer)).toBe(true);
    const conn = peer.conn as unknown as PresenceConnection;
    const reply = await ask(client, "board.subscribe", { houseId });
    expect(reply.ok).toBe(true);
    expect(reply.snapshot.houseId).toBe(houseId);
    expect(Buffer.byteLength(JSON.stringify(reply))).toBeLessThan(8 * 1024);
    expect((await ask(client, "board.pointer", { subscriptionId: reply.subscriptionId, x: 1, y: 2 })).ok).toBe(true);
    await expect.poll(() => conn.writeBuffer.length).toBe(0);
    await expect.poll(() => conn.transport.writable).toBe(true);
    // Initial presence may flush after a valid pointer ACK. This later rejected
    // command generates no presence, so its ACK proves earlier delivery arrived.
    expect((await ask(client, "board.pointer", { subscriptionId: randomUUID(), x: 0, y: 0 })).code).toBe("STALE_SUBSCRIPTION");
    return { client, peer, conn, subscriptionId: reply.subscriptionId, readyBeforeBoard: originalReadyListeners.get(peer.id)! };
  }
  const healthy = await connect(owner, home.id);
  const destination = await connect(destinationOwner, destinationHome.id);
  const current = await connect(resident, home.id);
  const received: any[] = [];
  current.client.on("board.presence", value => received.push(value));
  async function stallPresence() {
    await expect.poll(() => current.conn.writeBuffer.length).toBe(0);
    await expect.poll(() => current.conn.transport.writable).toBe(true);
    current.conn.transport.writable = false;
    expect((await ask(healthy.client, "board.pointer", { subscriptionId: healthy.subscriptionId, x: 17, y: 19 })).ok).toBe(true);
    expect(current.conn.readyState).toBe("open");
    expect(current.conn.writeBuffer.filter(packet => packetKind(packet) === "message:board.presence")).toEqual([]);
    expect(received).toEqual([]);
  }
  function release() {
    const transport = current.conn.transport;
    transport.writable = true;
    if (current.conn.readyState === "open") {
      transport.emit("ready");
      current.conn.flush();
    }
  }
  cleanup.push(release);
  return { house, home, destinationHome, owner, resident, destinationOwner, healthy, destination, current, sockets, received, stallPresence, release };
}

test.each(["remove", "recover"] as const)("deferred presence rechecks authority after %s before transport ready", async action => {
  const f = await lifecycleFixture();
  const { vi } = await import("vitest");
  await f.stallPresence();
  const sent = vi.spyOn(f.current.peer, "emit");
  const revoked = next(f.current.client, "board.revoked");
  try {
    // Change authority and release synchronously, before the periodic sweep can
    // revoke the view. Capture the ready callback's own result before yielding.
    if (action === "remove")
      f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: f.home.id, payload: { memberId: f.resident.id } });
    else
      f.house.recover(f.house.issueRecovery(f.resident.id));
    f.release();
    const immediateRevocation = sent.mock.calls.find(([event]) => event === "board.revoked")?.[1];
    const event = await revoked;
    const expected = {
      schemaVersion: 1,
      subscriptionId: f.current.subscriptionId,
      code: action === "remove" ? "FORBIDDEN" : "UNAUTHENTICATED",
    };
    expect(immediateRevocation).toMatchObject(expected);
    expect(event).toMatchObject(expected);
    f.current.conn.transport.emit("ready");
    // A same-connection ACK fences all preceding server delivery, including any
    // accidental old presence caused by a second readiness notification.
    expect((await ask(f.current.client, "board.pointer", { subscriptionId: f.current.subscriptionId, x: 0, y: 0 })).ok).toBe(false);
    expect(f.received).toEqual([]);
    expect(sent.mock.calls.some(([event]) => event === "board.presence")).toBe(false);
    expect(f.current.conn.readyState).toBe("open");
  } finally {
    sent.mockRestore();
  }
});

test("same-socket deferred presence follows only the current house and renewed subscription", async () => {
  const f = await lifecycleFixture();
  await f.stallPresence();
  f.house.execute(f.resident.id, { commandId: randomUUID(), type: "house.leave", houseId: f.home.id, payload: {} });
  f.house.execute(f.resident.id, { commandId: randomUUID(), type: "house.join", payload: { code: f.destinationHome.code, name: "Moving resident", colour: "blue" } });
  const socketId = f.current.peer.id, conn = f.current.conn;
  const subscribed = ask(f.current.client, "board.subscribe", { houseId: f.destinationHome.id });
  try {
    await expect.poll(() => conn.writeBuffer.some(packet => packetKind(packet) === "message:ack")).toBe(true);
    const packet = conn.writeBuffer.find(candidate => packetKind(candidate) === "message:ack")!;
    const encoded = String(packet.data), reply = JSON.parse(encoded.slice(encoded.indexOf("[")))[0];
    expect(reply.ok).toBe(true);
    expect(reply.snapshot.houseId).toBe(f.destinationHome.id);
    expect(reply.subscriptionId).not.toBe(f.current.subscriptionId);
    expect(reply.snapshot.subscriptionId).toBe(reply.subscriptionId);
    expect(Buffer.byteLength(JSON.stringify(reply))).toBeLessThan(8 * 1024);
    expect((await ask(f.destination.client, "board.pointer", { subscriptionId: f.destination.subscriptionId, x: 83, y: 89 })).ok).toBe(true);
    expect(conn.writeBuffer.filter(candidate => packetKind(candidate) === "message:board.presence")).toEqual([]);
    const deferred = next(f.current.client, "board.presence");
    f.release();
    const accepted = await subscribed;
    const latest = await deferred;
    expect(accepted.ok).toBe(true);
    expect(latest).toMatchObject({ schemaVersion: 1, houseId: f.destinationHome.id, subscriptionId: accepted.subscriptionId });
    expect(latest.views.map((view: { id: string }) => view.id).sort()).toEqual([f.resident.id, f.destinationOwner.id].sort());
    expect(latest.views.find((view: { name: string }) => view.name === "Destination owner").pointer).toMatchObject({ x: 83, y: 89 });
    expect(latest.views.find((view: { id: string }) => view.id === f.resident.id)).not.toHaveProperty("pointer");
    expect(latest.views.some((view: { id: string }) => view.id === f.owner.id)).toBe(false);
    conn.transport.emit("ready");
    // Reject an old-epoch command and use its ACK as the delivery barrier.
    expect((await ask(f.current.client, "board.pointer", { subscriptionId: f.current.subscriptionId, x: 0, y: 0 })).code).toBe("STALE_SUBSCRIPTION");
    expect(f.received).toHaveLength(1);
    expect(f.received.every(value => value.houseId === f.destinationHome.id && value.subscriptionId === accepted.subscriptionId)).toBe(true);
    expect(f.current.peer.id).toBe(socketId);
    expect(f.current.peer.conn).toBe(conn);
    expect(conn.readyState).toBe("open");
  } finally {
    f.release();
    await subscribed;
  }
});

test("board disconnect removes its ready listener while the captured transport remains open", async () => {
  const f = await lifecycleFixture();
  const companion = f.current.client.io.socket("/");
  cleanup.push(() => { companion.disconnect(); });
  await new Promise<void>((resolve, reject) => {
    if (companion.connected) return resolve();
    companion.once("connect", resolve);
    companion.once("connect_error", reject);
  });
  await f.stallPresence();
  const transport = f.current.conn.transport;
  const added = transport.listeners("ready").filter(listener => !f.current.readyBeforeBoard.includes(listener));
  expect(added).toHaveLength(1);
  const disconnected = next(f.current.client, "disconnect");
  f.current.peer.disconnect(false);
  expect(f.sockets.of("/board").sockets.has(f.current.peer.id)).toBe(false);
  expect(f.current.conn.readyState).toBe("open");
  expect(f.sockets.of("/").sockets.get(companion.id!)?.conn).toBe(f.current.peer.conn);
  expect(transport.listeners("ready")).not.toContain(added[0]);
  expect(transport.listeners("ready")).toEqual(f.current.readyBeforeBoard);
  f.release();
  expect(await disconnected).toBe("io server disconnect");
  expect(companion.connected).toBe(true);
  expect(f.received).toEqual([]);
});
