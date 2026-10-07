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

// Engine.IO's private-in-types methods are real runtime methods. Only transport flow is stalled;
// authentication, SQLite, event encoding and board delivery remain the actual service.
interface EngineConnection {
  readyState: string;
  writeBuffer: Array<{ type: string; data?: unknown }>;
  transport: { writable: boolean; name: string; socket: { bufferedAmount: number } };
  sendPacket(type: string, data?: unknown): void;
  flush(): void;
}
const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
const engine = (socket: ServerSocket) => socket.conn as unknown as EngineConnection;
const text = "A bounded control-packet fixture";
function nextChat(socket: Socket) {
  return new Promise<any>((resolve, reject) => {
    const timer=setTimeout(()=>{socket.off("board.chat",receive);reject(new Error("Expected bounded board chat delivery"));},1500);
    function receive(value: unknown){clearTimeout(timer);socket.off("board.chat",receive);resolve(value);}
    socket.once("board.chat",receive);
  });
}
async function fixture() {
  const root=mkdtempSync(join(tmpdir(),"board-control-"));
  const house=new HouseStore(join(root,"house.sqlite")), board=new BoardStore(join(root,"board.sqlite"));
  const owner=house.ensureSession(), peerIdentity=house.ensureSession();
  house.execute(owner.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Packet owner",colour:"sage"}});
  const home=house.me(owner.id).home!;
  house.execute(peerIdentity.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Packet peer",colour:"blue"}});
  const server=createServer((request,response)=>{void service.handle(request,response).then(handled=>{if(!handled)response.writeHead(404).end();});});
  const sockets=new Server(server,{transports:["websocket"],maxHttpBufferSize:16*1024,perMessageDeflate:false});
  // Keep diagnostics deliberately free of generated actor IDs, cookie tokens and message content.
  const outcomes: string[]=[];
  const service=attachBoardService(sockets,house,board,{log:record=>outcomes.push(String(record.outcome))});
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  cleanup.push(()=>{if(!root.startsWith(join(tmpdir(),"board-control-")))throw new Error("Unexpected fixture cleanup target");rmSync(root,{recursive:true,force:true});},()=>house.close(),()=>board.close(),()=>new Promise<void>(resolve=>{service.close();server.closeAllConnections();sockets.close(()=>resolve());}));
  async function connect(person: typeof owner) {
    const client=io(url+"/board",{transports:["websocket"],reconnection:false,forceNew:true,extraHeaders:{Origin:url,Cookie:`house_session=${person.token}`}});
    cleanup.push(()=>{client.disconnect();});
    await new Promise<void>((resolve,reject)=>{client.once("connect",resolve);client.once("connect_error",reject);});
    const reply=await client.timeout(1500).emitWithAck("board.subscribe",{houseId:home.id});
    expect(reply.ok).toBe(true);
    const peer=sockets.of("/board").sockets.get(client.id!)!;expect(Boolean(peer)).toBe(true);
    return {client,conn:engine(peer)};
  }
  const healthy=await connect(owner), stalled=await connect(peerIdentity);
  for(const connection of [healthy.conn,stalled.conn]) {
    await expect.poll(()=>connection.writeBuffer.length).toBe(0);
    await expect.poll(()=>connection.transport.writable).toBe(true);
    expect(connection.transport.name).toBe("websocket");
  }
  async function save() {
    const response=await fetch(url+"/api/board/chat",{method:"POST",headers:{Origin:url,Cookie:`house_session=${owner.token}`,"X-House-Identity":owner.id,"Content-Type":"application/json"},body:JSON.stringify({id:randomUUID(),houseId:home.id,text})});
    expect(response.status).toBe(200);await response.json();
    expect(board.snapshot(home.id).chat.length).toBe(1);
  }
  function restore() {stalled.conn.transport.writable=true;if(stalled.conn.readyState==="open")stalled.conn.flush();}
  return {healthy,stalled,outcomes,save,restore};
}

async function receiveHealthy(delivery: Promise<any>) {
  const event=await delivery;
  expect(event.schemaVersion).toBe(1);expect(event.message.text).toBe(text);
  expect(Buffer.byteLength(JSON.stringify(event))).toBeLessThan(1024);
}

test("a healthy below-limit stalled board queue retains and drains legitimate delivery",async()=>{
  const f=await fixture();f.stalled.conn.transport.writable=false;
  try {
    expect(f.stalled.conn.writeBuffer.length).toBe(0);expect(f.stalled.conn.transport.socket.bufferedAmount).toBe(0);
    const healthyDelivery=nextChat(f.healthy.client);await f.save();await receiveHealthy(healthyDelivery);
    expect(f.stalled.conn.readyState).toBe("open");expect(f.stalled.conn.writeBuffer.length).toBeLessThan(8);
    const stalledDelivery=nextChat(f.stalled.client);f.restore();expect((await stalledDelivery).message.text).toBe(text);
    expect(f.outcomes).not.toContain("SLOW_CONNECTION");
  } finally {f.restore();}
});

test("a real queued data-less Engine.IO ping does not revoke a below-limit board subscriber",async()=>{
  const f=await fixture();f.stalled.conn.transport.writable=false;
  try {
    f.stalled.conn.sendPacket("ping");
    expect(f.stalled.conn.writeBuffer.map(packet=>({type:packet.type,dataType:typeof packet.data}))).toEqual([{type:"ping",dataType:"undefined"}]);
    expect(f.stalled.conn.writeBuffer.length).toBe(1);expect(f.stalled.conn.transport.socket.bufferedAmount).toBe(0);
    const healthyDelivery=nextChat(f.healthy.client);await f.save();await receiveHealthy(healthyDelivery);
    // A valid one-packet heartbeat queue must remain open until its bounded delivery drains.
    expect(f.stalled.conn.readyState).toBe("open");expect(f.stalled.conn.writeBuffer.length).toBeLessThan(8);
    expect(f.stalled.conn.writeBuffer.some(packet=>packet.type==="message"&&typeof packet.data==="string")).toBe(true);
    const stalledDelivery=nextChat(f.stalled.client);f.restore();expect((await stalledDelivery).message.text).toBe(text);
    expect(f.outcomes).not.toContain("SLOW_CONNECTION");
  } finally {f.restore();}
});

test("an unknown queued application payload still revokes the stalled board while healthy delivery succeeds",async()=>{
  const f=await fixture();f.stalled.conn.transport.writable=false;
  try {
    f.stalled.conn.sendPacket("message",{unexpected:true});
    expect(f.stalled.conn.writeBuffer.length).toBe(1);
    const healthyDelivery=nextChat(f.healthy.client);await f.save();await receiveHealthy(healthyDelivery);
    expect(f.stalled.conn.readyState).not.toBe("open");expect(f.outcomes).toContain("SLOW_CONNECTION");
    expect(f.healthy.conn.readyState).toBe("open");
  } finally {f.restore();}
});

test("an unknown queued packet kind with bounded string data remains fail-closed",async()=>{
  const f=await fixture();f.stalled.conn.transport.writable=false;
  try {
    f.stalled.conn.sendPacket("unknown-control","bounded");
    expect(f.stalled.conn.writeBuffer.length).toBe(1);
    expect(f.stalled.conn.writeBuffer[0]!.type).toBe("unknown-control");
    expect(f.stalled.conn.transport.socket.bufferedAmount).toBe(0);
    const healthyDelivery=nextChat(f.healthy.client);await f.save();await receiveHealthy(healthyDelivery);
    expect(f.stalled.conn.readyState).not.toBe("open");expect(f.outcomes).toContain("SLOW_CONNECTION");
    expect(f.healthy.conn.readyState).toBe("open");
  } finally {f.restore();}
});
