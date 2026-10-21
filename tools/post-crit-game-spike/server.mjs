import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url), routes=new Map([['/','index.html'],...['app.mjs','engine.mjs','style.css'].map(f=>['/'+f,f])]);
const chess=new URL('../../.local/post-crit/game-spike/node_modules/chess.js/dist/esm/chess.js',import.meta.url);
const port=Number(process.env.GAME_SPIKE_PORT||4197);
createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,file=path==='/chess.js'?chess:routes.has(path)?new URL(routes.get(path),root):null;if(!file){res.writeHead(404).end();return;}const body=await readFile(file);res.writeHead(200,{'content-type':path==='/'?'text/html':path.endsWith('.css')?'text/css':'text/javascript','cache-control':'no-store'}).end(body);}catch{res.writeHead(500).end('Fixture unavailable');}}).listen(port,'127.0.0.1',()=>console.log(`game-spike http://127.0.0.1:${port}`));
