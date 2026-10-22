import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const packageRoot=dirname(fileURLToPath(import.meta.url)),manifest=JSON.parse(await readFile(resolve(packageRoot,'manifest.json')));
const hash=data=>createHash('sha256').update(data).digest('hex');
const index=process.argv.indexOf('--label'),label=index<0?null:process.argv[index+1];assert.match(label||'',/^[a-z0-9-]{1,24}$/,'Use a fresh local replay label');
const repository=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const replayRoot=resolve(repository,'.local/picture-layout-v5-replay-'+label);
assert.ok(replayRoot.startsWith(resolve(repository,'.local')+sep));
const collected=[];
for(const entry of manifest.entries){
  assert.ok(!entry.destination.split('/').includes('..'));const target=resolve(replayRoot,entry.destination);assert.ok(target.startsWith(replayRoot+sep));
  let data;
  if(entry.gitRef){assert.match(entry.gitRef,/^[a-f0-9]{40}$/);assert.ok(entry.gitPath.startsWith('public/')&&!entry.gitPath.split('/').includes('..'));data=execFileSync('git',['show',entry.gitRef+':'+entry.gitPath],{cwd:repository});}
  else{const source=resolve(packageRoot,entry.packageFile);assert.ok(source.startsWith(packageRoot+sep));data=await readFile(source);}
  assert.equal(hash(data),entry.sha256,'Frozen replay input mismatch: '+entry.destination);collected.push({target,data});
}
await mkdir(resolve(repository,'.local'),{recursive:true});await mkdir(replayRoot,{recursive:false});
for(const {target,data} of collected){await mkdir(dirname(target),{recursive:true});await writeFile(target,data,{flag:'wx'});}
const binding=JSON.parse(await readFile(resolve(replayRoot,'docs/spatial-redesign/evidence/picture-layout-preflight-v5/source-binding.json'))),actual={};
for(const [path,expected]of Object.entries(binding.files)){actual[path]=hash(await readFile(resolve(replayRoot,path)));assert.equal(actual[path],expected);}
assert.equal(hash(JSON.stringify(actual)),manifest.sourceManifestSHA256);
const command='mise exec -- node .local/picture-layout-preflight-v5/runner.mjs --run --label replay-'+label+' --protocol '+manifest.protocolSHA256+' --freeze '+manifest.sourceManifestSHA256+' --runner '+manifest.runnerSHA256;
const report={status:'MATERIALIZED_ONLY_NO_BROWSER_OR_SERVICE',scope:manifest.scope,replayRoot,inputsVerified:collected.length,boundFilesVerified:Object.keys(actual).length,sourceManifestSHA256:manifest.sourceManifestSHA256,sourceCommits:manifest.sourceCommits,cwdForOptionalFutureReplay:replayRoot,optionalFutureCommand:command};
await writeFile(resolve(replayRoot,'MATERIALIZATION.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
