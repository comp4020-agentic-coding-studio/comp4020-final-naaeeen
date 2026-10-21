import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HouseStore } from "../src/house-store.ts";

// Frozen native v1 schema, before lighting/origin existed. Do not create through HouseStore.
const V1_SCHEMA = `
        CREATE TABLE identities (id TEXT PRIMARY KEY, name TEXT NOT NULL, colour TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE sessions (token_digest TEXT PRIMARY KEY, identity_id TEXT NOT NULL REFERENCES identities(id), expires_at INTEGER NOT NULL);
        CREATE TABLE recovery (proof_digest TEXT PRIMARY KEY, identity_id TEXT NOT NULL UNIQUE REFERENCES identities(id));
        CREATE TABLE houses (id TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 6), owner_id TEXT NOT NULL REFERENCES identities(id), code TEXT UNIQUE, status TEXT NOT NULL CHECK(status IN ('active','archived')));
        CREATE TABLE members (house_id TEXT NOT NULL REFERENCES houses(id), identity_id TEXT NOT NULL REFERENCES identities(id), slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 5), bedroom_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','left','removed')), PRIMARY KEY(house_id,identity_id));
        CREATE UNIQUE INDEX members_one_home ON members(identity_id) WHERE status='active';
        CREATE UNIQUE INDEX members_one_slot ON members(house_id,slot) WHERE status='active';
        CREATE TABLE bedrooms (id TEXT PRIMARY KEY, house_id TEXT NOT NULL REFERENCES houses(id), owner_id TEXT NOT NULL REFERENCES identities(id), slot INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 0, open INTEGER NOT NULL DEFAULT 0 CHECK(open IN (0,1)), palette TEXT NOT NULL, placements TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)));
        CREATE UNIQUE INDEX bedrooms_one_active ON bedrooms(house_id,owner_id) WHERE archived=0;
        CREATE TABLE removed_guards (house_id TEXT NOT NULL REFERENCES houses(id), identity_id TEXT NOT NULL REFERENCES identities(id), PRIMARY KEY(house_id,identity_id));
        CREATE TABLE streams (id TEXT PRIMARY KEY, sequence INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE chat (id TEXT PRIMARY KEY, zone_id TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES identities(id), name TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL, sequence INTEGER NOT NULL);
        CREATE INDEX chat_zone_sequence ON chat(zone_id,sequence);
        CREATE TABLE cards (id TEXT PRIMARY KEY, house_id TEXT NOT NULL REFERENCES houses(id), author_id TEXT NOT NULL REFERENCES identities(id), small_goal TEXT NOT NULL, question TEXT NOT NULL, resource_url TEXT NOT NULL, next_step TEXT NOT NULL, help_requested INTEGER NOT NULL CHECK(help_requested IN (0,1)), state TEXT NOT NULL CHECK(state IN ('active','closed','ownerLeft')), revision INTEGER NOT NULL, inactive_sequence INTEGER);
        CREATE UNIQUE INDEX cards_one_active ON cards(house_id,author_id) WHERE state='active';
        CREATE INDEX cards_inactive ON cards(house_id,state,inactive_sequence,id);
        CREATE TABLE archives (id TEXT PRIMARY KEY, identity_id TEXT NOT NULL REFERENCES identities(id), house_id TEXT NOT NULL REFERENCES houses(id), room TEXT NOT NULL, cards TEXT NOT NULL, at INTEGER NOT NULL);
        CREATE TABLE receipts (actor_id TEXT NOT NULL REFERENCES identities(id), command_id TEXT NOT NULL, command_hash TEXT NOT NULL, response TEXT NOT NULL, room_id TEXT, PRIMARY KEY(actor_id,command_id));
        PRAGMA user_version=1;
      `;
const cleanups: (() => void)[] = [];
afterEach(() => { vi.restoreAllMocks(); cleanups.splice(0).reverse().forEach(fn => fn()); });
const canonical = (value: any): string => value && typeof value === "object" ? "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}" : JSON.stringify(value);
function legacy(version = 1) {
  const root = mkdtempSync(join(tmpdir(), "house-v1-")), path = join(root, "house.sqlite"), db = new DatabaseSync(path);
  db.exec(V1_SCHEMA);
  const owner = randomUUID(), emptyOwner = randomUUID(), former = randomUUID(), house = randomUUID();
  const custom = randomUUID(), empty = randomUUID(), archived = randomUUID();
  const placement = [{id: randomUUID(), kind: "plant", x: -4, z: -2, rotation: 0, colour: "rose"}];
  for (const id of [owner,emptyOwner,former]) db.prepare("INSERT INTO identities VALUES (?,?,?,?)").run(id,"Legacy","sage",8);
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run("old-session",owner,Date.now()+1000000);
  db.prepare("INSERT INTO houses VALUES (?,?,?,?,?)").run(house,2,owner,"ABCD1234","active");
  for (const [id,room,slot,status] of [[owner,custom,0,"active"],[emptyOwner,empty,1,"active"],[former,archived,5,"left"]] as const) {
    db.prepare("INSERT INTO members VALUES (?,?,?,?,?)").run(house,id,slot,room,status);
    db.prepare("INSERT INTO bedrooms VALUES (?,?,?,?,?,?,?,?,?)").run(room,house,id,slot,7,1,"peach",room===empty?"[]":JSON.stringify(placement),room===archived?1:0);
    db.prepare("INSERT INTO streams VALUES (?,?)").run("bedroom:"+room,11);
  }
  db.prepare("INSERT INTO streams VALUES (?,?)").run("lounge:"+house,19);
  const cardIds = [randomUUID(),randomUUID(),randomUUID()];
  for (const [n,state] of ["active","closed","ownerLeft"].entries()) db.prepare("INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(cardIds[n],house,owner,"Legacy "+state,"","","Next",0,state,2,state==="active"?null:17);
  const archivedJSON = '{ "id": "'+archived+'", "placements": [], "palette":"rose", "open":false }';
  db.prepare("INSERT INTO archives VALUES (?,?,?,?,?,?)").run(randomUUID(),former,house,archivedJSON,'[{"legacy":true}]',1234);
  const command = {commandId:randomUUID(),type:"profile.set",expectedRevision:7,payload:{name:"Legacy",colour:"sage"}};
  const response = JSON.stringify({ok:true,commandId:command.commandId,streamId:"lounge:"+house,sequence:19,entityRevision:8});
  db.prepare("INSERT INTO receipts VALUES (?,?,?,?,NULL)").run(owner,command.commandId,createHash("sha256").update(owner+"\n"+canonical(command)).digest("hex"),response);
  db.exec("PRAGMA user_version="+version); db.close();
  cleanups.push(() => rmSync(root,{recursive:true,force:true}));
  return {path,owner,emptyOwner,former,house,custom,empty,archived,placement,archivedJSON,command,response,cardIds};
}
function open(path: string) { const store = new HouseStore(path); cleanups.push(() => store.close()); return store; }

describe("native v1 room migration", () => {
  it("preserves custom, intentionally empty, archived, card and receipt data across repeated startup", () => {
    const f = legacy();
    for (let run=0; run<3; run++) {
      const store=open(f.path);
      expect(store.db.prepare("PRAGMA user_version").get()).toEqual({user_version:4});
      expect(store.snapshot(f.owner,f.custom).room).toMatchObject({placements:f.placement,palette:"peach",open:true,revision:7,light:"standard",originPresetId:null,originPresetVersion:null});
      expect(store.snapshot(f.emptyOwner,f.empty).room).toMatchObject({placements:[],light:"standard",originPresetId:null,originPresetVersion:null});
      expect(store.db.prepare("SELECT room FROM archives").get()).toEqual({room:f.archivedJSON});
      expect(store.db.prepare("SELECT response FROM receipts").get()).toEqual({response:f.response});
      expect(store.execute(f.owner,f.command)).toEqual(JSON.parse(f.response));
      expect((store.exportOwn(f.former) as any).archives[0].room).toEqual(JSON.parse(f.archivedJSON));
      expect(store.snapshot(f.owner).cards.map(c=>c.id).sort()).toEqual([...f.cardIds].sort());
      expect((store.snapshot(f.owner,f.custom) as any).ownWork).toMatchObject({streamId:"lounge:"+f.house,sequence:19,card:{id:f.cardIds[0]}});
      expect(store.session("old-session")).toEqual({id:f.owner});
      expect(store.db.prepare("SELECT light,origin_preset_id,origin_preset_version FROM bedrooms WHERE id=?").get(f.archived)).toEqual({light:"standard",origin_preset_id:null,origin_preset_version:null});
      store.close();
    }
  });

  it("rolls back failed additive DDL and then migrates the original v1 database normally", () => {
    const f=legacy(), original=DatabaseSync.prototype.exec; let injected=false;
    const spy=vi.spyOn(DatabaseSync.prototype,"exec").mockImplementation(function(this: DatabaseSync,sql:string) {
      original.call(this,sql);
      if (!injected && /ALTER TABLE bedrooms/i.test(sql)) {injected=true; throw new Error("Injected migration failure");}
    });
    expect(()=>new HouseStore(f.path)).toThrowError(expect.objectContaining({code:"STORAGE_UNAVAILABLE"}));
    expect(injected).toBe(true); spy.mockRestore();
    const db=new DatabaseSync(f.path);
    expect(db.prepare("PRAGMA user_version").get()).toEqual({user_version:1});
    expect((db.prepare("PRAGMA table_info(bedrooms)").all() as any[]).map(c=>c.name)).not.toContain("light");
    expect(db.prepare("SELECT placements FROM bedrooms WHERE id=?").get(f.custom)).toEqual({placements:JSON.stringify(f.placement)});
    db.close();
    expect((open(f.path).snapshot(f.owner,f.custom).room as any).light).toBe("standard");
  });

  it("rejects a future version while leaving logical contents and version intact", () => {
    const f=legacy(17);
    expect(()=>new HouseStore(f.path)).toThrowError(expect.objectContaining({code:"STORAGE_UNAVAILABLE"}));
    const db=new DatabaseSync(f.path);
    expect(db.prepare("PRAGMA user_version").get()).toEqual({user_version:17});
    expect(db.prepare("SELECT placements FROM bedrooms WHERE id=?").get(f.custom)).toEqual({placements:JSON.stringify(f.placement)});
    db.close();
  });
});
