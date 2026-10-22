import assert from 'node:assert/strict';

export function boxPass(box,target=false){
  return Boolean(box&&Number.isFinite(box.x)&&Number.isFinite(box.y)&&Number.isFinite(box.width)&&Number.isFinite(box.height)&&
    box.width>0&&box.height>0&&box.inViewport&&box.clips.length===0&&box.visible&&box.hitExposed&&
    (!target||(box.width>=43.99&&box.height>=43.99)));
}
export function layoutDecision(surface,primary='leave'){
  const failures=[];
  const check=(name,box,target=false)=>{if(!boxPass(box,target))failures.push(name);};
  check('board',surface.board);check('tray',surface.tray);
  if(surface.cells.length!==24)failures.push('cell-count');
  for(const cell of surface.cells)check('cell-'+cell.id,cell,true);
  if(surface.pieces.length!==12||new Set(surface.pieces.map(piece=>piece.id)).size!==12)failures.push('piece-count');
  for(const piece of surface.pieces)check('piece-'+piece.id,piece,true);
  for(const action of ['previous','next','reference','chat',primary])check('action-'+action,surface.actions[action],true);
  for(const id of ['panel-close','game-panel-stand','break-picture','break-four'])check('wrapper-'+id,surface.wrapper[id],true);
  if(surface.menuSummary)check('menu-summary',surface.menuSummary,true);
  if(surface.horizontalOverflow)failures.push('horizontal-overflow');
  return {pass:failures.length===0,failures};
}
export function assertCleanup(cleanup,expected){
  assert.equal(cleanup.contexts.length,expected);
  assert.deepEqual(cleanup.errors,[]);
  assert.ok(cleanup.contexts.every(c=>c.closed&&c.closeEvent&&!c.stillPresent));
  assert.equal(cleanup.browserDisconnected,true);assert.equal(cleanup.remainingContexts,0);
}
export function calibrate(){
  const positive={x:1,y:1,width:44,height:44,visible:true,inViewport:true,clips:[],hitExposed:true};
  assert.equal(boxPass(positive,true),true);
  let count=1;
  for(const mutation of [{x:NaN},{height:0},{width:43},{inViewport:false},{clips:['panel']},{visible:false},{hitExposed:false}]){
    assert.equal(boxPass({...positive,...mutation},true),false);count++;
  }
  const box=id=>({...positive,id});
  const fixture={board:box('board'),tray:box('tray'),cells:Array.from({length:24},(_,i)=>box(String(i))),
    pieces:Array.from({length:12},(_,i)=>box(String(i))),actions:Object.fromEntries(['previous','next','reference','chat','leave'].map(id=>[id,box(id)])),
    wrapper:Object.fromEntries(['panel-close','game-panel-stand','break-picture','break-four'].map(id=>[id,box(id)])),menuSummary:box('menu'),horizontalOverflow:false};
  assert.equal(layoutDecision(fixture).pass,true);count++;
  for(const path of ['board','tray','pieces','cells','actions','wrapper','menuSummary','horizontalOverflow']){
    const copy=structuredClone(fixture);
    if(path==='pieces'||path==='cells')copy[path][0].hitExposed=false;
    else if(path==='actions')delete copy.actions.next;
    else if(path==='wrapper')copy.wrapper['game-panel-stand'].inViewport=false;
    else if(path==='horizontalOverflow')copy.horizontalOverflow=true;
    else copy[path].clips=['panel'];
    assert.equal(layoutDecision(copy).pass,false);count++;
  }
  const cleanup={contexts:[{closed:true,closeEvent:true,stillPresent:false}],errors:[],browserDisconnected:true,remainingContexts:0};
  assertCleanup(cleanup,1);count++;
  for(const mutation of [{errors:['failed']},{browserDisconnected:false},{remainingContexts:1},{contexts:[{closed:true,closeEvent:false,stillPresent:false}]}]){
    assert.throws(()=>assertCleanup({...cleanup,...mutation},1));count++;
  }
  return count;
}
