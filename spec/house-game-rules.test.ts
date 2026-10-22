import { describe, expect, it } from "vitest";
import {
  GAME_COLUMNS, GAME_ROWS, WAITING_MS, READY_MS, RECOVERY_MS, INACTIVITY_MS,
  MAX_GAME_ID_LENGTH, emptyGameTable, advanceGameTime, applyGameAction,
  applyGameEvent, projectGame,
} from "../public/house-game-rules.js";
import type { GameAction, GameAuthority, GameTable } from "../public/house-game-rules.js";

const P0 = "player-zero", P1 = "player-one", WATCHER = "watcher";
function authority(actorId = P0, overrides: Partial<GameAuthority> = {}): GameAuthority {
  return { actorId, isMember:true, isController:true, inLounge:true, controlledInLounge:[P0,P1], ...overrides };
}
function action(state:GameTable, value:GameAction, actorId=P0, now=0) {
  const result=applyGameAction(frozen(state),value,authority(actorId),now);
  expect(result,JSON.stringify(value)).toMatchObject({ok:true,changed:true});
  return result.state;
}
function join(state:GameTable, actorId=P0, roundId="round-one", now=0) {
  return action(state,{type:"join",roundId,expectedRevision:state.revision},actorId,now);
}
function waiting() { return join(join(emptyGameTable()),P1); }
function active(now=0) {
  let state=waiting(); const rosterRevision=state.rosterRevision;
  state=action(state,{type:"ready",roundId:"round-one",rosterRevision},P0,now);
  return action(state,{type:"ready",roundId:"round-one",rosterRevision},P1,now);
}
function move(state:GameTable,column:number,now=0) {
  const round=state.current!;
  return action(state,{type:"move",roundId:round.roundId,expectedRevision:state.revision,column},round.players[round.turn]!,now);
}
function play(columns:number[]) { let state=active(); for(const column of columns) state=move(state,column); return state; }
function frozen<T>(value:T):T { if(value&&typeof value==='object') { Object.freeze(value); for(const nested of Object.values(value)) frozen(nested); } return value; }
function denied(state:GameTable,value:GameAction,code:string,actor=authority(),now=0) {
  const before=structuredClone(state); const result=applyGameAction(frozen(state),value,actor,now);
  expect(result).toMatchObject({ok:false,code,changed:false}); expect(result.state).toBe(state); expect(state).toEqual(before);
}

describe("voluntary waiting and consent",()=>{
  it("has two logical slots and a fixed waiting deadline",()=>{
    const first=join(emptyGameTable()); expect(first.current).toMatchObject({status:"waiting",players:[P0,null],waitingDeadlineAt:WAITING_MS});
    const second=join(first,P1,"round-one",10_000); expect(second.current!.players).toEqual([P0,P1]);
    expect(second.current!.waitingDeadlineAt).toBe(WAITING_MS);
    denied(second,{type:"join",roundId:"round-one",expectedRevision:second.revision},"table_full",authority(WATCHER));
  });
  it("serializes joins but not two independently submitted readies",()=>{
    const first=join(emptyGameTable());
    denied(first,{type:"join",roundId:"round-one",expectedRevision:0},"stale_revision",authority(P1));
    const start=waiting(), rosterRevision=start.rosterRevision;
    const a=action(start,{type:"ready",roundId:"round-one",rosterRevision},P0);
    const ab=action(a,{type:"ready",roundId:"round-one",rosterRevision},P1);
    const b=action(start,{type:"ready",roundId:"round-one",rosterRevision},P1);
    const ba=action(b,{type:"ready",roundId:"round-one",rosterRevision},P0);
    expect(ab).toEqual(ba); expect(ab.current!.status).toBe("active"); expect(ab.current!.startedAt).toBe(0);
  });
  it("requires an opponent and clears consent on every roster change",()=>{
    const first=join(emptyGameTable());
    denied(first,{type:"ready",roundId:"round-one",rosterRevision:first.rosterRevision},"opponent_required");
    let state=waiting(), oldRoster=state.rosterRevision;
    state=action(state,{type:"ready",roundId:"round-one",rosterRevision:oldRoster});
    state=action(state,{type:"leave",roundId:"round-one"},P1);
    expect(state.current!.ready).toEqual([null,null]); expect(state.rosterRevision).toBe(oldRoster+1);
    state=join(state,P1); denied(state,{type:"ready",roundId:"round-one",rosterRevision:oldRoster},"stale_roster");
  });
  it("permits actor-bound waiting withdrawal after a racing ready",()=>{
    let state=waiting(); state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},P1);
    state=action(state,{type:"leave",roundId:"round-one"},P0);
    expect(state.current!.players).toEqual([null,P1]);
    state=action(state,{type:"leave",roundId:"round-one"},P1);
    expect(state.current).toBeNull(); expect(state.latestResult).toBeNull();
  });
  it("expires readiness at60s and caps late consent at the original waiting deadline",()=>{
    let state=waiting(); state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},P0);
    expect(state.current!.ready[0]!.expiresAt).toBe(READY_MS);
    const before=advanceGameTime(state,READY_MS-1); expect(before.changed).toBe(false);
    const expired=advanceGameTime(state,READY_MS); expect(expired.changed).toBe(true); state=expired.state;
    expect(state.current!.ready).toEqual([null,null]);
    state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},P1,70_000);
    expect(state.current!.ready[1]!.expiresAt).toBe(WAITING_MS);
  });
  it("never renews waiting through join/leave churn or readiness",()=>{
    let state=waiting(); state=action(state,{type:"leave",roundId:"round-one"},P1,50_000);
    state=join(state,P1,"round-one",80_000);
    state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},P0,89_000);
    expect(state.current!.waitingDeadlineAt).toBe(90_000);
    expect(advanceGameTime(state,90_000).state.current).toBeNull();
  });
  it.each([{isMember:false,code:"member_required"},{isController:false,code:"controller_required"},{inLounge:false,code:"lounge_required"}])("rejects untrusted authority $code",({code,...overrides})=>{
    denied(emptyGameTable(),{type:"join",roundId:"round-one",expectedRevision:0},code,authority(P0,overrides));
  });
  it("requires current controlling lounge presence at atomic start",()=>{
    let state=waiting(); state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision});
    denied(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},"players_unavailable",authority(P1,{controlledInLounge:[P1]}));
  });
});

describe("bounded public board and legal play",()=>{
  it("uses a42cell row-major board with gravity and preserves its input",()=>{
    const initial=frozen(active()); const result=move(initial,2,1);
    expect(initial.current!.cells.every(cell=>cell===null)).toBe(true);
    expect(result.current!.cells).toHaveLength(GAME_ROWS*GAME_COLUMNS);
    expect(result.current!.cells[5*7+2]).toBe(0); expect(result.current!.lastMove).toEqual({row:5,column:2,slot:0});
    expect(result.current!.turn).toBe(1); expect(result.current!.lastMoveAt).toBe(1);
    (projectGame(result).current!.cells as (number|null)[])[0]=1; expect(result.current!.cells[0]).toBeNull();
  });
  it.each([-1,7,1.5,NaN,Infinity])("rejects invalid column %s",column=>{
    const state=active(); denied(state,{type:"move",roundId:"round-one",expectedRevision:state.revision,column},"invalid_column");
  });
  it("rejects watcher, wrong turn, wrong round and stale position",()=>{
    const state=active(); const value:GameAction={type:"move",roundId:"round-one",expectedRevision:state.revision,column:0};
    denied(state,value,"not_seated",authority(WATCHER)); denied(state,value,"not_your_turn",authority(P1));
    denied(state,{...value,roundId:"old-round"},"wrong_round"); denied(state,{...value,expectedRevision:state.revision-1},"stale_revision");
  });
  it("rejects a full column without incrementing revision or changing the idle anchor",()=>{
    const state=play([0,0,0,0,0,0]); denied(state,{type:"move",roundId:"round-one",expectedRevision:state.revision,column:0},"column_full",authority(),25_000);
    expect(state.current!.lastMoveAt).toBe(0);
  });
  it.each([
    ["horizontal",[0,6,1,6,2,5,3]],
    ["vertical",[0,1,0,1,0,2,0]],
    ["diagonal up-right",[0,1,1,2,4,2,2,3,4,3,5,3,3]],
    ["diagonal up-left",[6,5,5,4,2,4,4,3,2,3,1,3,3]],
  ])("ends a legal %s win and releases both slots",(_label,columns)=>{
    const state=play(columns as number[]); expect(state.current).toBeNull();
    expect(state.latestResult).toMatchObject({reason:"win",winner:0,players:[P0,P1]});
    expect(state.latestResult!.cells).toHaveLength(42);
  });
  it("does not wrap adjacent rows into a horizontal win",()=>{
    const state=move(play([0,6,6,3,1,4]),2); expect(state.current).not.toBeNull();
  });
  it("finishes a42move draw with no winner",()=>{
    // Independent target: pairs alternate across each row, inverted in the next.
    const target=Array.from({length:42},(_,i)=>(Math.floor(i/7)+Math.floor((i%7)/2))%2);
    const heights=Array(7).fill(0), dead=new Set<string>();
    function find(turn:number):number[]|null {
      if(heights.every(value=>value===6))return [];
      const key=heights.join(',');if(dead.has(key))return null;
      for(let c=0;c<7;c++){if(heights[c]===6||target[(5-heights[c])*7+c]!==turn)continue;heights[c]++;const tail=find(1-turn);heights[c]--;if(tail)return[c,...tail];}
      dead.add(key);return null;
    }
    const columns=find(0);expect(columns).not.toBeNull(); expect(columns).toHaveLength(42);
    const state=play(columns!); expect(state.current).toBeNull(); expect(state.latestResult).toMatchObject({reason:"draw",winner:null,cells:target});
  });
});

describe("voluntary departure and recovery",()=>{
  it("ends active play neutrally for Leave, controller departure and member removal",()=>{
    const initial=move(active(),0);
    const left=action(initial,{type:"leave",roundId:"round-one"},P0);
    expect(left.current).toBeNull(); expect(left.latestResult).toMatchObject({reason:"player_left",winner:null});
    for(const reason of ["left_lounge","member_removed","seat_lost"] as const) {
      const result=applyGameEvent(initial,{type:"depart",actorId:P1,reason},1);
      expect(result.state.current).toBeNull(); expect(result.state.latestResult).toMatchObject({reason,winner:null});
      expect(applyGameEvent(result.state,{type:"depart",actorId:P1,reason},1).changed).toBe(false);
    }
  });
  it("does not treat observer authority or an unrelated watcher as departure",()=>{
    const state=active(); denied(state,{type:"leave",roundId:"round-one"},"controller_required",authority(P0,{isController:false}));
    const unrelated=applyGameEvent(state,{type:"depart",actorId:WATCHER,reason:"left_lounge"},1);
    expect(unrelated.changed).toBe(false); expect(unrelated.state).toBe(state);
  });
  it("releases waiting disconnects with roster invalidation but no result",()=>{
    let state=waiting(); state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision});
    const next=applyGameEvent(state,{type:"disconnect",actorId:P1},1).state;
    expect(next.current!.players).toEqual([P0,null]); expect(next.current!.ready).toEqual([null,null]); expect(next.latestResult).toBeNull();
    expect(next.current!.waitingDeadlineAt).toBe(WAITING_MS);
  });
  it("reserves original identities on disconnect and requires explicit joint resume",()=>{
    const start=move(active(),2,10_000); let state=applyGameEvent(start,{type:"disconnect",actorId:P0},20_000).state;
    expect(state.current).toMatchObject({status:"paused",players:[P0,P1],recoveryDeadlineAt:20_000+RECOVERY_MS});
    denied(state,{type:"join",roundId:"round-one",expectedRevision:state.revision},"not_waiting",authority(WATCHER),20_000);
    denied(state,{type:"move",roundId:"round-one",expectedRevision:state.revision,column:0},"not_active",authority(P1),20_000);
    const resumeRevision=state.current!.resumeRevision;
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision},P0,21_000); expect(state.current!.status).toBe("paused");
    denied(state,{type:"resume",roundId:"round-one",resumeRevision},"players_unavailable",authority(P1,{controlledInLounge:[P1]}),22_000);
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision},P1,22_000);
    expect(state.current!.status).toBe("active"); expect(state.current!.lastMoveAt).toBe(10_000); expect(state.current!.recoveryDeadlineAt).toBeNull();
  });
  it("composes resume consents in either order and invalidates them after another disconnect",()=>{
    const paused=applyGameEvent(active(),{type:"disconnect",actorId:P0},1).state, resumeRevision=paused.current!.resumeRevision;
    const consent={type:"resume",roundId:"round-one",resumeRevision} as const;
    const ab=action(action(paused,consent,P0,2),consent,P1,2),ba=action(action(paused,consent,P1,2),consent,P0,2); expect(ab).toEqual(ba);
    let state=action(paused,consent,P0,2); state=applyGameEvent(state,{type:"disconnect",actorId:P1},3).state;
    expect(state.current!.resume).toEqual([false,false]); expect(state.current!.recoveryDeadlineAt).toBe(90_001);
    denied(state,consent,"stale_resume",authority(P0),4);
  });
  it("lets either paused participant end immediately and prevents old-round leave on a new round",()=>{
    let state=applyGameEvent(active(),{type:"disconnect",actorId:P0},1).state;
    state=action(state,{type:"leave",roundId:"round-one"},P1,2); expect(state.latestResult!.reason).toBe("player_left");
    state=join(state,P0,"round-two",3);
    denied(state,{type:"leave",roundId:"round-one"},"wrong_round",authority(P0),4);
    expect(state.current!.roundId).toBe("round-two"); expect(state.current!.ready).toEqual([null,null]);
  });
});

describe("explicit housekeeping and restart",()=>{
  it("requires separately persisted maintenance without hidden mutation on rejected actions",()=>{
    const state=active(); const value:GameAction={type:"move",roundId:"round-one",expectedRevision:state.revision,column:0};
    denied(state,value,"maintenance_required",authority(),INACTIVITY_MS);
    const advanced=advanceGameTime(frozen(state),INACTIVITY_MS);expect(advanced).toMatchObject({ok:true,changed:true});
    expect(advanced.state.current).toBeNull(); expect(advanced.state.latestResult!.reason).toBe("inactive");
    denied(advanced.state,value,"wrong_round",authority(),INACTIVITY_MS); expect(advanceGameTime(advanced.state,INACTIVITY_MS+1).changed).toBe(false);
  });
  it("preserves latest completed result when an unstarted waiting table expires",()=>{
    let state=play([0,6,1,6,2,5,3]);const latest=structuredClone(state.latestResult);
    state=join(state,P0,"round-two",1);state=advanceGameTime(state,90_001).state;
    expect(state.current).toBeNull();expect(state.latestResult).toEqual(latest);
  });
  it("keeps recovery and idle bounds through repeated restart and failed actions",()=>{
    let state=move(active(),0,1_000);state=applyGameEvent(state,{type:"restart"},50_000).state;
    expect(state.current).toMatchObject({status:"paused",recoveryDeadlineAt:140_000,lastMoveAt:1_000});
    state=applyGameEvent(state,{type:"restart"},100_000).state;
    expect(state.current!.recoveryDeadlineAt).toBe(140_000);
    denied(state,{type:"move",roundId:"round-one",expectedRevision:state.revision,column:1},"not_active",authority(P1),110_000);
    expect(advanceGameTime(state,139_999).changed).toBe(false);
    const expired=advanceGameTime(state,140_000).state;expect(expired.latestResult).toMatchObject({reason:"recovery_expired",winner:null});
  });
  it("retains an earlier idle deadline when disconnect/restart happens near expiry",()=>{
    let state=active();state=applyGameEvent(state,{type:"disconnect",actorId:P0},290_000).state;
    expect(state.current!.recoveryDeadlineAt).toBe(380_000);
    state=applyGameEvent(state,{type:"restart"},299_000).state;
    const expired=advanceGameTime(state,300_000).state;expect(expired.latestResult!.reason).toBe("inactive");
  });
  it("does not renew inactivity with reconnect/resume or consent",()=>{
    let state=active();state=applyGameEvent(state,{type:"disconnect",actorId:P0},100_000).state;
    const resumeRevision=state.current!.resumeRevision;
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision},P0,101_000);
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision},P1,102_000);
    expect(state.current!.lastMoveAt).toBe(0);expect(advanceGameTime(state,300_000).state.latestResult!.reason).toBe("inactive");
  });
  it("clears waiting readiness on restart without extending the original reservation",()=>{
    let state=waiting();state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},P0);
    const previous=state.rosterRevision;state=applyGameEvent(state,{type:"restart"},10_000).state;
    expect(state.current!.ready).toEqual([null,null]);expect(state.rosterRevision).toBeGreaterThan(previous);
    expect(state.current!.waitingDeadlineAt).toBe(90_000);
  });
  it.each([-1,NaN,Infinity,0.5])("rejects an invalid server clock %s",now=>{
    expect(()=>advanceGameTime(emptyGameTable(),now)).toThrow(RangeError);
  });
  it("keeps bounded projections without retaining histories or receipt ledgers",()=>{
    let state=emptyGameTable();
    for(let i=0;i<25;i++) {
      const roundId=`round-${i}`;state=join(state,P0,roundId);state=join(state,P1,roundId);
      const rosterRevision=state.rosterRevision;state=action(state,{type:"ready",roundId,rosterRevision},P0);state=action(state,{type:"ready",roundId,rosterRevision},P1);
      state=action(state,{type:"leave",roundId},P0);
    }
    state=join(state,P0,"z".repeat(MAX_GAME_ID_LENGTH));const projection=projectGame(state);
    expect(Object.keys(projection).sort()).toEqual(["current","latestResult","revision","rosterRevision"]);
    expect(Buffer.byteLength(JSON.stringify(projection))).toBeLessThanOrEqual(8*1024);
    expect(projection.latestResult!.roundId).toBe("round-24");expect(projection.current!.cells).toHaveLength(42);
    expect(JSON.stringify(projection)).not.toMatch(/receipt|history|uuid/i);
  });
});

describe("boundary and recovery refinements",()=>{
  it("invalidates joint recovery consent after any later trusted controlling disconnect",()=>{
    let state=applyGameEvent(active(),{type:"restart"},1).state;
    const resumeRevision=state.current!.resumeRevision;
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision},P0,2);
    // P1's newly controlled connection may disconnect before P1 presses Resume.
    state=applyGameEvent(state,{type:"disconnect",actorId:P1},3).state;
    expect(state.current!.resume).toEqual([false,false]);
    expect(state.current!.resumeRevision).toBeGreaterThan(resumeRevision);
    expect(state.current!.recoveryDeadlineAt).toBe(90_001);
  });
  it("does not silently replay a terminal round or auto-join a winner",()=>{
    const state=play([0,6,1,6,2,5,3]);
    denied(state,{type:"join",roundId:"round-one",expectedRevision:state.revision},"wrong_round");
    const next=join(state,P0,"round-two"); expect(next.current!.players).toEqual([P0,null]); expect(next.current!.cells.every(cell=>cell===null)).toBe(true);
  });
  it("allows a second player's legal win without treating departure as loss",()=>{
    const state=play([6,0,6,1,5,2,5,3]);
    expect(state.latestResult).toMatchObject({winner:1,reason:"win"});
  });
  it("rejects invalid IDs and unsupported actions and lifecycle events",()=>{
    const empty=emptyGameTable();
    denied(empty,{type:"join",roundId:"",expectedRevision:0},"invalid_round");
    denied(empty,{type:"join",roundId:"x".repeat(MAX_GAME_ID_LENGTH+1),expectedRevision:0},"invalid_round");
    denied(empty,{type:"join",roundId:"round-one",expectedRevision:0},"invalid_actor",authority(""));
    denied(empty,{type:"watch",roundId:"round-one"} as unknown as GameAction,"invalid_action");
    expect(applyGameEvent(empty,{type:"observer-zone"} as any,0)).toMatchObject({ok:false,changed:false,code:"invalid_event"});
    expect(applyGameEvent(empty,{type:"depart",actorId:P0,reason:"resigned"} as any,0)).toMatchObject({ok:false,changed:false,code:"invalid_event"});
  });
  it("avoids writes for duplicate consent and idle housekeeping",()=>{
    let state=waiting(); state=action(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision});
    const duplicate=applyGameAction(state,{type:"ready",roundId:"round-one",rosterRevision:state.rosterRevision},authority(),1);
    expect(duplicate).toMatchObject({ok:true,changed:false});expect(duplicate.state).toBe(state);
    state=applyGameEvent(active(),{type:"disconnect",actorId:P0},1).state;
    state=action(state,{type:"resume",roundId:"round-one",resumeRevision:state.current!.resumeRevision},P0,2);
    expect(applyGameAction(state,{type:"resume",roundId:"round-one",resumeRevision:state.current!.resumeRevision},authority(),3)).toMatchObject({ok:true,changed:false});
    expect(advanceGameTime(state,4).changed).toBe(false);
  });
  it("bounds worst-case allowed IDs with both result and a full waiting roster",()=>{
    const one="\u0001".repeat(MAX_GAME_ID_LENGTH),two="\u0002".repeat(MAX_GAME_ID_LENGTH),round="\u0003".repeat(MAX_GAME_ID_LENGTH);
    const ctx=(actorId:string)=>authority(actorId,{controlledInLounge:[one,two]});
    let state=emptyGameTable();
    for(const actorId of [one,two]) state=applyGameAction(state,{type:"join",roundId:round,expectedRevision:state.revision},ctx(actorId),0).state;
    for(const actorId of [one,two]) state=applyGameAction(state,{type:"ready",roundId:round,rosterRevision:state.rosterRevision},ctx(actorId),0).state;
    state=applyGameAction(state,{type:"leave",roundId:round},ctx(one),1).state;
    for(const actorId of [one,two]) state=applyGameAction(state,{type:"join",roundId:"\u0004".repeat(MAX_GAME_ID_LENGTH),expectedRevision:state.revision},ctx(actorId),2).state;
    expect(state.current!.players).toEqual([one,two]);expect(state.latestResult).not.toBeNull();
    expect(Buffer.byteLength(JSON.stringify(projectGame(state)))).toBeLessThanOrEqual(8*1024);
  });
});

it("conservatively invalidates repeated filtered disconnects without extending deadlines or the board",()=>{
  const initial=frozen(move(active(),3,1_000)), initialCopy=structuredClone(initial);
  const first=applyGameEvent(initial,{type:"disconnect",actorId:P0},2_000).state;
  const board=structuredClone(first.current!.cells), deadline=first.current!.recoveryDeadlineAt;
  const repeated=applyGameEvent(frozen(first),{type:"disconnect",actorId:P0},3_000).state;
  expect(repeated.current!.recoveryDeadlineAt).toBe(deadline);expect(repeated.current!.lastMoveAt).toBe(1_000);
  expect(repeated.current!.cells).toEqual(board);expect(repeated.current!.resume).toEqual([false,false]);
  expect(repeated.current!.resumeRevision).toBe(first.current!.resumeRevision+1);
  expect(initial).toEqual(initialCopy);expect(first.current!.resumeRevision).toBeLessThan(repeated.current!.resumeRevision);
});
