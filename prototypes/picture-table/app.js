// Original, local-only prototype. No network, durable storage or real peer claims.
export const pieces = [
 {id:'ivy-bell',description:'Ivy leaves beside a little brass bell'},
 {id:'crescent-arch',description:'Gold crescent in the window arch'},
 {id:'paper-star',description:'Paper star with the window curve'},
 {id:'bird-string',description:'Red bird hanging from a string'},
 {id:'shelf-leaves',description:'Trailing leaves above the small shelf'},
 {id:'honey-cap',description:'Honey lamp cap with wall stitches'},
 {id:'fern-rain',description:'Fern fronds beside the rainy glass'},
 {id:'rain-roof',description:'Rain streaks over a tiny blue roof'},
 {id:'star-curtain',description:'Rainy glass beside the folded curtain'},
 {id:'book-spines',description:'Sage and ochre book spines on a shelf'},
 {id:'red-teapot',description:'Round red teapot and its curved spout'},
 {id:'lamp-shade',description:'Amber lampshade with a scalloped edge'},
 {id:'teal-cup',description:'Teal cup and saucer on the desk'},
 {id:'cat-tail',description:'Striped cat tail curling over the desk'},
 {id:'cat-book',description:'Sleeping cat face against a blue book'},
 {id:'notebook',description:'Green notebook with a red pencil'},
 {id:'biscuits',description:'Three biscuits on a cream plate'},
 {id:'lamp-base',description:'Brass lamp base at the desk end'},
 {id:'rug-leaf',description:'Pale leaf on the indigo rug border'},
 {id:'chair-leg',description:'Angled chair leg across the woven rug'},
 {id:'desk-leg',description:'Wooden desk leg with a gold rug stripe'},
 {id:'slippers',description:'Pair of red slippers below the desk'},
 {id:'yarn-coil',description:'Ochre yarn coil and its loose thread'},
 {id:'woven-basket',description:'Woven basket beside the rug corner'}
].map((piece,index)=>({...piece,index}));
export const shuffled = [15,2,21,8,12,5,19,0,17,10,23,6,14,4,18,11,3,22,9,16,1,20,7,13].map(index=>pieces[index]);
const mode=new URLSearchParams(location.search).get('tray')==='pages'?'pages':'scroll';
const $=id=>document.getElementById(id),placed=new Set();
let selected=null,joined=false,page=0,chatCount=1;
let boardFocus=0,trayFocus=shuffled[0].id;
const status=text=>$('feedback').textContent=text;
const crop=(node,index)=>{node.classList.add('crop');node.style.backgroundPosition=`${(index%6)*20}% ${Math.floor(index/6)*100/3}%`;};
const names=['top row','second row','third row','bottom row'];
const positions=['left edge','second spot','third spot','fourth spot','fifth spot','right edge'];
for(let index=0;index<24;index++){
 const cell=document.createElement('button');cell.className='cell';cell.id='cell-'+index;cell.dataset.destination=index;
 cell.setAttribute('aria-label',`Empty picture place, ${names[Math.floor(index/6)]}, ${positions[index%6]}`);
 cell.addEventListener('click',()=>place(index));cell.addEventListener('focus',()=>{boardFocus=index;syncRoving();});$('board').append(cell);
}
for(const piece of shuffled){
 const button=document.createElement('button');button.className='piece';button.id='piece-'+piece.id;
 button.dataset.piece=piece.id;button.title=piece.description;button.setAttribute('aria-label',piece.description);
 button.setAttribute('aria-pressed','false');crop(button,piece.index);
 button.addEventListener('click',()=>select(piece.id));button.addEventListener('focus',()=>{trayFocus=piece.id;syncRoving();});$('tray').append(button);
}
$('tray-mode').textContent=mode==='pages'?'12 per page':'All 24 · scroll';
if(mode==='pages'){
 for(const [id,label,direction]of[['previous','Previous',-1],['next','Next',1]]){
  const button=document.createElement('button');button.id=id;button.textContent=label;
  button.addEventListener('click',()=>{if(page+direction<0||page+direction>1)return;page+=direction;render();});
  $('tray-browse').append(button);
 }
 const count=document.createElement('span');count.id='page-count';$('tray-browse').insertBefore(count,$('next'));
}else{$('tray-browse').textContent='Scroll inside the tray to find every piece.';}
function select(id){
 if(!joined){status('Join the local demo before choosing a piece.');return;}
 if(placed.has(id)){status('That piece is already placed. Choose another loose piece.');return;}
 selected=id;render();status('Selected: '+pieces.find(p=>p.id===id).description+'. Choose a picture place.');
}
function place(index){
 if(!joined){status('Join the local demo before placing a piece.');return;}
 if(!selected){status('Choose a loose piece first.');return;}
 const piece=pieces.find(p=>p.id===selected);
 if(placed.has(piece.id)){selected=null;render();status('That piece has been placed. Choose another.');return;}
 if(piece.index!==index){status('That place does not match. Your piece is still selected; try another place.');return;}
 commit(piece,'You');
}
function commit(piece,actor){
 const wasSelected=selected===piece.id;placed.add(piece.id);if(wasSelected)selected=null;
 const cell=$('cell-'+piece.index);cell.classList.add('placed');
 cell.setAttribute('aria-label',`${piece.description}, placed by ${actor}, ${names[Math.floor(piece.index/6)]}, ${positions[piece.index%6]}`);
 render();status(placed.size===24?'The picture is complete. Stay and chat, or return to your room.':
 actor==='You'?`Placed. ${placed.size} of 24 together.`:wasSelected?`${actor} (local mock) placed the piece you had selected. Focus stays here; choose another piece.`:`${actor} (local mock) placed a piece. ${placed.size} of 24 together.`);
}
function syncRoving(){
 for(const cell of $('board').children)cell.tabIndex=Number(cell.dataset.destination)===boardFocus?0:-1;
 const exposed=shuffled.filter(piece=>!$('piece-'+piece.id).hidden);
 if(!exposed.some(piece=>piece.id===trayFocus))trayFocus=exposed[0]?.id;
 for(const piece of shuffled)$('piece-'+piece.id).tabIndex=piece.id===trayFocus?0:-1;
}
for(const group of ['board','tray'])$(group).addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const buttons=[...$(group).children].filter(button=>!button.hidden),index=buttons.indexOf(document.activeElement);if(index<0)return;
 event.preventDefault();const columns=group==='board'?6:Number(getComputedStyle($('tray')).gridTemplateColumns.split(' ').length);
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:index+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key]);
 buttons[Math.max(0,Math.min(buttons.length-1,next))].focus();
});
function render(){
 $('progress').textContent=`${placed.size} / 24 placed`;
 $('join').textContent=joined?'Leave participation':'Join local demo';
 $('people').textContent=joined?'You joined · Finch and Moss are local mocks':'You are watching · Finch and Moss are local mocks';
 for(const piece of shuffled){
  const button=$('piece-'+piece.id),isPlaced=placed.has(piece.id);
  button.hidden=mode==='pages'&&Math.floor(shuffled.indexOf(piece)/12)!==page;
  button.classList.toggle('placed',isPlaced);button.setAttribute('aria-disabled',String(isPlaced));
  button.setAttribute('aria-label',piece.description+(isPlaced?', already placed':''));button.setAttribute('aria-pressed',String(selected===piece.id));
 }
 if(mode==='pages'){$('page-count').textContent=`Page ${page+1} of 2`;$('previous').setAttribute('aria-disabled',String(page===0));$('next').setAttribute('aria-disabled',String(page===1));}
 const preview=$('selected-preview');preview.classList.remove('crop');preview.replaceChildren();
 if(selected){const piece=pieces.find(p=>p.id===selected);crop(preview,piece.index);$('selection-text').textContent=piece.description;}
 else $('selection-text').textContent='No piece selected.';
 const finished=placed.size===24;$('complete').hidden=!finished;preview.hidden=finished;$('selection-text').hidden=finished;$('tray-heading').textContent=finished?'All pieces placed':'Loose pieces';syncRoving();
}
$('join').addEventListener('click',()=>{joined=!joined;if(!joined)selected=null;render();status(joined?'You joined this local demonstration. Pick any loose piece.':'You left participation. The local picture stays here.');});
$('peer').addEventListener('click',()=>{const piece=selected?pieces.find(p=>p.id===selected):shuffled.find(p=>!placed.has(p.id));if(piece)commit(piece,'Finch');else status('The local picture is already complete.');});
function togglePanel(name,open){
 const panel=$(name+'-panel'),button=$(name+'-toggle');
 panel.hidden=!open;button.setAttribute('aria-expanded',String(open));
 if(open){const other=name==='chat'?'reference':'chat';togglePanel(other,false);$(name+'-close').focus();}
 else if(panel.contains(document.activeElement))button.focus();
}
for(const name of['reference','chat']){
 $(name+'-toggle').addEventListener('click',()=>togglePanel(name,$(name+'-panel').hidden));
 $(name+'-close').addEventListener('click',()=>togglePanel(name,false));
}
$('chat-form').addEventListener('submit',event=>{
 event.preventDefault();const value=$('message').value.trim();if(!value){$('message').focus();return;}
 const item=document.createElement('li'),author=document.createElement('b');author.textContent='You · local demo';item.append(author,document.createTextNode(value));$('messages').append(item);
 $('message').value='';$('chat-count').textContent=String(++chatCount);$('message').focus();
});
$('exit').addEventListener('click',()=>{joined=false;selected=null;render();togglePanel('chat',false);togglePanel('reference',false);$('table-shell').hidden=true;$('desk').hidden=false;$('return-progress').textContent=`${placed.size} of 24 pieces remain in this page's local memory.`;$('reopen').focus();});
$('reopen').addEventListener('click',()=>{$('desk').hidden=true;$('table-shell').hidden=false;status('Local picture retained. Join again to place a piece.');$('join').focus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!$('chat-panel').hidden)togglePanel('chat',false);else if(!$('reference-panel').hidden)togglePanel('reference',false);}});
render();
