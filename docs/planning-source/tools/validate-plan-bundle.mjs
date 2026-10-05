import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures=[];
const counts={markdown:0,json:0,jsonExamples:0,localLinks:0,sourceHashes:0,assetHashes:0,screenshots:0};
const screenshotDimensions=[];
function imageDimensions(bytes,extension){
  if(extension==='.png'){
    if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG extension/magic mismatch');
    return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  }
  if(bytes[0]!==255||bytes[1]!==216)throw Error('JPEG extension/magic mismatch');
  let index=2;
  while(index<bytes.length){
    if(bytes[index++]!==255)throw Error('Invalid JPEG marker');
    while(bytes[index]===255)index++;
    const marker=bytes[index++];
    if(marker===0xd9||marker===0xda)break;
    if(marker===1||(marker>=0xd0&&marker<=0xd7))continue;
    const size=bytes.readUInt16BE(index);
    if(size<2||index+size>bytes.length)throw Error('Invalid JPEG segment');
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:bytes.readUInt16BE(index+5),height:bytes.readUInt16BE(index+3)};
    index+=size;
  }
  throw Error('No JPEG dimensions');
}
async function exists(target){try{await stat(target);return true;}catch{return false;}}
async function walk(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(['node_modules','.cache','data'].includes(entry.name))continue;
    const file=path.join(dir,entry.name);
    if(file===path.join(root,'reference','a2'))continue;
    if(entry.isDirectory()){await walk(file);continue;}
    const relative=path.relative(root,file);
    if(entry.name.endsWith('.md')){
      counts.markdown++;
      const source=await readFile(file,'utf8');
      if(source.includes('\uFFFD'))failures.push({file:relative,error:'Replacement character'});
      if((source.match(/^```/gm)?.length??0)%2)failures.push({file:relative,error:'Unbalanced fenced block'});
      for(const match of source.matchAll(/```json\s*\n([\s\S]*?)\n```/g)){
        counts.jsonExamples++;
        try{JSON.parse(match[1]);}catch(e){failures.push({file:relative,error:'JSON example: '+e.message});}
      }
      for(const match of source.matchAll(/\]\(([^\n)]+)\)/g)){
        const ref=match[1].trim().replace(/^<|>$/g,'').split(/\s+"/)[0];
        if(/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(ref))continue;
        const name=decodeURIComponent(ref.split(/[?#]/)[0]);
        counts.localLinks++;
        if(!await exists(path.resolve(path.dirname(file),name)))failures.push({file:relative,error:'Missing local link',target:ref});
      }
    }
    if(entry.name.endsWith('.json')||entry.name.endsWith('.gltf')){
      counts.json++;
      try{JSON.parse(await readFile(file,'utf8'));}catch(e){failures.push({file:relative,error:'JSON parse: '+e.message});}
    }
    if(/\.(png|jpg|jpeg)$/i.test(entry.name)&&file.startsWith(path.join(root,'evaluation','screenshots')+path.sep)){
      counts.screenshots++;
      const bytes=await readFile(file);
      try{const dimensions=imageDimensions(bytes,path.extname(file));if(!dimensions.width||!dimensions.height)throw Error('Empty image');screenshotDimensions.push({file:relative,...dimensions,bytes:bytes.length});}catch(e){failures.push({file:relative,error:e.message});}
    }
  }
}
await walk(root);
for(const [manifest,base,countKey] of [
  ['reference/a2/SOURCE-MANIFEST.json','reference/a2','sourceHashes'],
  ['prototypes/visual-comparison/assets/kaykit/ASSET-MANIFEST.json','prototypes/visual-comparison/assets/kaykit','assetHashes']
]){
  const record=JSON.parse(await readFile(path.join(root,manifest),'utf8'));
  for(const item of record.records){
    const name=item.destination??item.name;
    try{
      const bytes=await readFile(path.join(root,base,name));
      const digest=createHash('sha256').update(bytes).digest('hex');
      if(digest!==item.sha256||(item.bytes!==undefined&&bytes.length!==item.bytes))failures.push({file:base+'/'+name,error:'Source byte/hash mismatch'});
      counts[countKey]++;
    }catch(e){failures.push({file:base+'/'+name,error:e.message});}
  }
}
const result={checkedOn:'2026-10-06',scope:'Active local links, syntax, example JSON, actual image format/dimensions and imported byte hashes; not semantic truth, image framing, external URL reachability or application acceptance',historicalReferenceLinks:'Excluded: byte-preserved A2 references describe their original layout',counts,screenshotDimensions,failures,passed:failures.length===0};
await writeFile(path.join(root,'evaluation','document-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({counts,failures,passed:result.passed},null,2));
if(failures.length)process.exitCode=1;
