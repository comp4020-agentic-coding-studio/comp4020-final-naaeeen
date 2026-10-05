import http from 'node:http';
import path from 'node:path';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,createReadStream,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createInitialState,applyCommand,DomainError} from './model.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const dataRoot=path.join(root,'data');
mkdirSync(dataRoot,{recursive:true});
const stateFile=path.join(dataRoot,'state.json');
let state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):createInitialState();
if(state.schemaVersion!==1)throw new Error('Unsupported prototype state schema.');
const subscribers=new Set();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.gltf':'model/gltf+json','.bin':'application/octet-stream','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const publicState=()=>{const {receipts,...snapshot}=state;return snapshot;};
function sendJSON(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function save(next){const temporary=stateFile+'.tmp';writeFileSync(temporary,JSON.stringify(next));renameSync(temporary,stateFile);state=next;}
function push(){const payload=`id: ${state.revision}\nevent: state\ndata: ${JSON.stringify(publicState())}\n\n`;for(const res of subscribers)res.write(payload);}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/state'){sendJSON(res,200,publicState());return;}
  if(req.method==='GET'&&url.pathname==='/api/events'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    subscribers.add(res);res.write(`id: ${state.revision}\nevent: state\ndata: ${JSON.stringify(publicState())}\n\n`);
    const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);
    req.on('close',()=>{subscribers.delete(res);clearInterval(heartbeat);});return;
  }
  if(req.method==='POST'&&url.pathname==='/api/command'){
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>16384)throw new DomainError('INVALID_INPUT','Command is too large.');chunks.push(chunk);}
      let command;try{command=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new DomainError('INVALID_INPUT','Expected a JSON command.');}
      const out=applyCommand(state,command);
      if(out.changed){save(out.state);push();}
      sendJSON(res,200,out.result);
    }catch(error){
      if(error instanceof DomainError)sendJSON(res,error.code==='FORBIDDEN'?403:error.code==='REVISION_CONFLICT'?409:400,{ok:false,code:error.code,message:error.message});
      else{console.error('prototype-command-failed',error.message);sendJSON(res,500,{ok:false,code:'SAVE_FAILED',message:'This change was not confirmed. Keep your draft and try again.'});}
    }
    return;
  }
  if(req.method!=='GET'){sendJSON(res,405,{error:'Method not allowed'});return;}
  const base=url.pathname.startsWith('/vendor/')?path.join(root,'node_modules','three'):root;
  const relative=url.pathname.startsWith('/vendor/')?url.pathname.slice('/vendor/'.length):url.pathname==='/'?'index.html':url.pathname.slice(1);
  let decoded;try{decoded=decodeURIComponent(relative);}catch{sendJSON(res,400,{error:'Invalid path'});return;}
  const file=path.resolve(base,decoded);
  const allowedRoot=file.startsWith(base+path.sep);
  const allowedPath=url.pathname==='/'||url.pathname.startsWith('/vendor/')||url.pathname.startsWith('/assets/')||['index.html','style.css','app.mjs','render-three.mjs','render-iso.mjs'].includes(decoded);
  if(!allowedRoot||!allowedPath||!existsSync(file)||!statSync(file).isFile()){sendJSON(res,404,{error:'Not found'});return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});
  createReadStream(file).pipe(res);
});
const port=Number(process.env.PORT??4260);
server.listen(port,'127.0.0.1',()=>console.log(`Night Neighbourhood comparison: http://127.0.0.1:${port}`));
function close(){for(const res of subscribers)res.end();server.close(()=>process.exit(0));}
process.on('SIGINT',close);process.on('SIGTERM',close);
