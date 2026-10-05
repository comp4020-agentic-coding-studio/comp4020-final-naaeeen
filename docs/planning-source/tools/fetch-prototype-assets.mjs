import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const commit = '96d5930a8dbdb363409bbc2d3341718b00e17c9c';
const sourceRoot = `https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0/${commit}`;
const sourceAssets = `${sourceRoot}/addons/kaykit_furniture_bits/Assets/gltf`;
const destination = fileURLToPath(new URL('../prototypes/visual-comparison/assets/kaykit/', import.meta.url));
const models = ['chair_A', 'table_medium', 'lamp_standing'];
const files = new Map();

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset request failed: ${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Representative asset exceeds the declared download budget.');
  return bytes;
}

const licence = await download(`${sourceRoot}/LICENSE.txt`);
if (!licence.toString('utf8').includes('Creative Commons Zero, CC0')) {
  throw new Error('The pinned pack licence did not contain the verified CC0 declaration.');
}
files.set('LICENSE.txt', {bytes:licence, url:`${sourceRoot}/LICENSE.txt`});
const modelFacts = [];
for (const name of models) {
  const url = `${sourceAssets}/${name}.gltf`;
  const bytes = await download(url);
  const json = JSON.parse(bytes.toString('utf8'));
  if (json.asset.version !== '2.0') throw new Error('Expected glTF 2.0.');
  files.set(`${name}.gltf`, {bytes, url});
  for (const entry of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(entry.uri)) throw new Error('Expected a same-directory asset dependency.');
    if (!files.has(entry.uri)) {
      const dependencyUrl = `${sourceAssets}/${entry.uri}`;
      files.set(entry.uri, {bytes:await download(dependencyUrl), url:dependencyUrl});
    }
    if (entry.byteLength !== undefined && files.get(entry.uri).bytes.length !== entry.byteLength) {
      throw new Error(`Buffer length mismatch for ${entry.uri}`);
    }
  }
  const triangles = (json.meshes ?? []).flatMap(mesh=>mesh.primitives).reduce((sum,primitive)=> {
    if ((primitive.mode ?? 4) !== 4) return sum;
    return sum + (json.accessors[primitive.indices]?.count ?? json.accessors[primitive.attributes.POSITION].count) / 3;
  }, 0);
  modelFacts.push({name, triangles, materials:json.materials?.length ?? 0, source:url});
}

await mkdir(destination, {recursive:true});
const records = [];
for (const [name, {bytes,url}] of files) {
  await writeFile(path.join(destination, name), bytes);
  records.push({name, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'), source:url});
}
await writeFile(path.join(destination,'ASSET-MANIFEST.json'), JSON.stringify({author:'Kay Lousberg', pack:'KayKit Furniture Bits 1.0', licence:'CC0', commit, accessedOn:'2026-10-06', records, modelFacts, rendered:false},null,2)+'\n');
console.log(JSON.stringify({files:records.length,bytes:records.reduce((n,x)=>n+x.bytes,0),modelFacts},null,2));
