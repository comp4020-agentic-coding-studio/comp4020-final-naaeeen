const qs=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
const palette=['#ffc47b','#f391a8','#a0d8b3','#99c8e6','#c7a3ec'];
let actor=qs.get('resident')==='bob'?'bob':'alice';
let candidate=['camera-fixed','camera-orbit','flat-iso'].includes(qs.get('view'))?qs.get('view'):'camera-fixed';
let state=null,selected='chair-a',renderer=null,renderGeneration=0,metrics={},firstPageSceneReadyMs=null;
$('resident').value=actor;$('candidate').value=candidate;
function displayMetrics(next){metrics={...metrics,...next,view:candidate,stateRevision:state?.revision,viewport:{width:innerWidth,height:innerHeight},visibility:document.visibilityState};$('metrics').textContent=JSON.stringify(metrics,null,2);}
function choose(id){selected=id;$('object').value=id;renderer?.setSelection(id);updateControls();}
function updateControls(){
  if(!state)return;
  const item=state.furniture.find(x=>x.id===selected);
  const owned=item?.owner===actor;
  $('ownership').textContent=selected==='lantern'?'Each neighbour owns one pane. Your colour becomes part of the same lamp.':item?`${item.owner}'s ${item.asset} · position ${item.x}, ${item.z} · revision ${item.revision}`:'';
  for(const id of ['north','south','west','east','rotate'])$(id).disabled=!owned;
  $('save-note').disabled=false;
  for(const button of $('palette').children){button.disabled=false;button.setAttribute('aria-pressed',String(button.dataset.colour===state.lantern.parts[actor].colour));}
}
function applyState(next){
  if(state&&next.revision<state.revision)return;
  state=next;renderer?.setState(state);
  $('note-display').textContent=state.message;$('revision').textContent=`Saved courtyard revision ${state.revision}`;
  $('object').replaceChildren(...[...state.furniture.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=`${item.owner}'s ${item.asset}`;return option;}),Object.assign(document.createElement('option'),{value:'lantern',textContent:'Shared lantern'})]);
  $('object').value=selected;
  $('events').replaceChildren(...state.events.slice(-5).reverse().map(event=>{const li=document.createElement('li');li.textContent=`${event.actor} · ${event.type} · ${event.targetId} · #${event.seq}`;return li;}));
  updateControls();displayMetrics({});
}
async function send(type,targetId,payload){
  if(!state)return;
  const item=state.furniture.find(x=>x.id===targetId);
  const expectedRevision=type==='contribute'?state.lantern.parts[actor].revision:type==='note'?state.messageRevision:item.revision;
  $('action-status').textContent='Saving your change…';
  try{
    const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commandId:crypto.randomUUID(),actor,type,targetId,expectedRevision,payload})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.message??'Change was not confirmed.');
    $('action-status').textContent=`Saved. Courtyard revision ${result.revision}.`;
  }catch(error){$('action-status').textContent=error.message;}
}
function move(dx,dz){const item=state?.furniture.find(x=>x.id===selected);if(item)send('move',selected,{x:item.x+dx,z:item.z+dz});}
for(const [id,dx,dz] of [['north',0,-.5],['south',0,.5],['west',-.5,0],['east',.5,0]])$(id).addEventListener('click',()=>move(dx,dz));
$('rotate').addEventListener('click',()=>{const item=state?.furniture.find(x=>x.id===selected);if(item)send('rotate',selected,{yaw:(item.yaw+90)%360});});
$('object').addEventListener('change',()=>choose($('object').value));
$('resident').addEventListener('change',()=>{actor=$('resident').value;updateControls();});
for(const [index,colour] of palette.entries()){const button=document.createElement('button');button.disabled=true;button.style.background=colour;button.dataset.colour=colour;button.setAttribute('aria-label',`Choose lantern colour ${['amber','rose','mint','sky','violet'][index]}`);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>send('contribute','lantern',{colour}));$('palette').append(button);}
$('save-note').addEventListener('click',()=>send('note','note',{text:$('note').value}));
async function changeView(){
  const generation=++renderGeneration;renderer?.destroy();renderer=null;$('world').replaceChildren();$('render-status').textContent='Preparing scene';
  candidate=$('candidate').value;metrics={};
  try{
    const module=await import(candidate==='flat-iso'?'/render-iso.mjs':'/render-three.mjs');
    const result=await module.createRenderer($('world'),{mode:candidate,pixelScale:Number($('pixels').value),onSelect:choose,onMetrics:data=>{if(generation===renderGeneration)displayMetrics(data);},onReady:()=>{if(generation!==renderGeneration)return;firstPageSceneReadyMs??=performance.now();$('render-status').textContent='Scene ready';displayMetrics({firstPageSceneReadyMs});}});
    if(generation!==renderGeneration){result.destroy();return;}
    renderer=result;if(state)renderer.setState(state);renderer.setSelection(selected);
  }catch(error){
    if(generation!==renderGeneration)return;
    const text=document.createElement('p');text.className='render-error';text.textContent=`Scene unavailable: ${error.message}. Courtyard actions remain available below; you can choose the isometric sketch.`;$('world').replaceChildren(text);$('render-status').textContent='Scene unavailable';displayMetrics({renderError:error.message});
  }
}
$('candidate').addEventListener('change',changeView);
$('pixels').addEventListener('change',()=>renderer?.setPixelScale(Number($('pixels').value)));
const stream=new EventSource('/api/events');
stream.addEventListener('open',()=>{$('connection').textContent='Connected';});
stream.addEventListener('state',event=>applyState(JSON.parse(event.data)));
stream.addEventListener('error',()=>{$('connection').textContent='Reconnecting';});
fetch('/api/state').then(response=>{if(!response.ok)throw new Error('State unavailable');return response.json();}).then(applyState).catch(error=>{$('action-status').textContent=error.message;});
changeView();
