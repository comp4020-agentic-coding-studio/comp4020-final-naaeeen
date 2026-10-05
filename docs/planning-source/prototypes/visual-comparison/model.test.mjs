import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState, applyCommand, PALETTE, DomainError} from './model.mjs';

const move = (overrides={})=>({commandId:'move-1',actor:'alice',type:'move',targetId:'chair-a',expectedRevision:0,payload:{x:-1.5,z:1},...overrides});

test('owned placement changes only its entity and produces the next event',()=> {
  const original=createInitialState();
  const out=applyCommand(original,move());
  assert.equal(out.state.furniture.find(x=>x.id==='chair-a').x,-1.5);
  assert.equal(out.state.furniture.find(x=>x.id==='chair-b').x,2);
  assert.equal(original.furniture.find(x=>x.id==='chair-a').x,-2);
  assert.equal(out.event.seq,1);
  assert.equal(out.result.revision,1);
});

test('another resident cannot change an owned placement',()=> {
  const state=createInitialState();
  assert.throws(()=>applyCommand(state,move({actor:'bob'})),err=>err instanceof DomainError && err.code==='FORBIDDEN');
  assert.equal(state.revision,0);
});

test('stale placement revision is rejected without losing a previous edit',()=> {
  const first=applyCommand(createInitialState(),move()).state;
  assert.throws(()=>applyCommand(first,move({commandId:'move-2',payload:{x:-0.5,z:1}})),err=>err.code==='REVISION_CONFLICT');
  assert.equal(first.furniture.find(x=>x.id==='chair-a').x,-1.5);
});

test('outside room, nonfinite and non-grid placement values are rejected',()=> {
  for(const x of [20,NaN,Infinity,-1.13]) {
    assert.throws(()=>applyCommand(createInitialState(),move({payload:{x,z:1}})),err=>err.code==='INVALID_INPUT');
  }
});

test('overlapping a different placed object is rejected',()=> {
  assert.throws(()=>applyCommand(createInitialState(),move({payload:{x:0,z:0}})),err=>err.code==='COLLISION');
});

test('fixed dressing and walls reserve space in the same placement contract',()=> {
  for(const payload of [{x:-2.5,z:-2},{x:2.5,z:-3}]) {
    assert.throws(()=>applyCommand(createInitialState(),move({targetId:'plant-a',payload})),err=>err.code==='COLLISION');
  }
  assert.throws(()=>applyCommand(createInitialState(),move({payload:{x:-3,z:0}})),err=>err.code==='COLLISION');
});

test('every initial editable object fits the full room contract',()=> {
  for(const item of createInitialState().furniture) {
    assert.doesNotThrow(()=>applyCommand(createInitialState(),{commandId:'validate-'+item.id,actor:item.owner,type:'rotate',targetId:item.id,expectedRevision:0,payload:{yaw:item.yaw}}));
  }
});

test('the same command retry is idempotent even when object keys are reordered',()=> {
  const command=move();
  const first=applyCommand(createInitialState(),command);
  const again=applyCommand(first.state,{payload:{z:1,x:-1.5},expectedRevision:0,targetId:'chair-a',type:'move',actor:'alice',commandId:'move-1'});
  assert.equal(again.changed,false);
  assert.equal(again.state.revision,1);
  assert.deepEqual(again.result,first.result);
});

test('reusing a command ID with another payload is rejected',()=> {
  const first=applyCommand(createInitialState(),move()).state;
  assert.throws(()=>applyCommand(first,move({payload:{x:-2,z:1}})),err=>err.code==='COMMAND_ID_REUSED');
});

test('two residents contribute independently to the same shared lantern',()=> {
  let state=createInitialState();
  state=applyCommand(state,{commandId:'pane-a',actor:'alice',type:'contribute',targetId:'lantern',expectedRevision:0,payload:{colour:PALETTE[2]}}).state;
  state=applyCommand(state,{commandId:'pane-b',actor:'bob',type:'contribute',targetId:'lantern',expectedRevision:0,payload:{colour:PALETTE[3]}}).state;
  assert.equal(state.lantern.parts.alice.colour,PALETTE[2]);
  assert.equal(state.lantern.parts.bob.colour,PALETTE[3]);
  assert.equal(state.events.at(-1).seq,2);
});

test('a catalogue palette limits stored colour values',()=> {
  assert.throws(()=>applyCommand(createInitialState(),{commandId:'bad-colour',actor:'alice',type:'contribute',targetId:'lantern',expectedRevision:0,payload:{colour:'url(secret)'}}),err=>err.code==='INVALID_INPUT');
});

test('JSON persistence preserves accepted placements and retry receipts',()=> {
  const first=applyCommand(createInitialState(),move());
  const restored=JSON.parse(JSON.stringify(first.state));
  assert.equal(restored.furniture.find(x=>x.id==='chair-a').x,-1.5);
  assert.equal(applyCommand(restored,move()).changed,false);
});

test('rotation uses bounded quarter turns',()=> {
  const out=applyCommand(createInitialState(),{commandId:'turn',actor:'alice',type:'rotate',targetId:'chair-a',expectedRevision:0,payload:{yaw:180}});
  assert.equal(out.state.furniture.find(x=>x.id==='chair-a').yaw,180);
  assert.throws(()=>applyCommand(createInitialState(),{commandId:'bad-turn',actor:'alice',type:'rotate',targetId:'chair-a',expectedRevision:0,payload:{yaw:13}}),err=>err.code==='INVALID_INPUT');
});

test('a shared plain-text note preserves literal text and rejects a stale overwrite',()=> {
  const command={commandId:'note-1',actor:'alice',type:'note',targetId:'note',expectedRevision:0,payload:{text:'<b>our courtyard</b>'}};
  const first=applyCommand(createInitialState(),command);
  assert.equal(first.state.message,'<b>our courtyard</b>');
  assert.equal(first.state.messageRevision,1);
  assert.equal(first.event.targetId,'note');
  assert.equal(applyCommand(first.state,command).changed,false);
  assert.throws(()=>applyCommand(first.state,{...command,commandId:'note-2',actor:'bob',payload:{text:'replace'}}),err=>err.code==='REVISION_CONFLICT');
  assert.equal(first.state.message,'<b>our courtyard</b>');
});

test('oversized or non-text notes and unknown note targets do not mutate saved state',()=> {
  for(const [targetId,text] of [['note','x'.repeat(141)],['note',null],['other','ok']]){
    const state=createInitialState();
    assert.throws(()=>applyCommand(state,{commandId:'invalid-note',actor:'alice',type:'note',targetId,expectedRevision:0,payload:{text}}),err=>err.code==='INVALID_INPUT');
    assert.equal(state.revision,0);
    assert.equal(state.messageRevision,0);
  }
});
