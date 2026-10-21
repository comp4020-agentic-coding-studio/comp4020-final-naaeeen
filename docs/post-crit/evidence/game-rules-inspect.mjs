/** Reproduce the pure-lane byte/check source record. No app/server/network work. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { emptyGameTable, applyGameAction, projectGame, MAX_GAME_ID_LENGTH } from '../../../public/house-game-rules.js';
const root = new URL('../../../', import.meta.url);
const digest = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
const one = '\u0001'.repeat(MAX_GAME_ID_LENGTH), two = '\u0002'.repeat(MAX_GAME_ID_LENGTH);
const authority = actorId => ({actorId,isMember:true,isController:true,inLounge:true,controlledInLounge:[one,two]});
let state = emptyGameTable();
function accept(action, actorId, now) {
  const result = applyGameAction(state, action, authority(actorId), now);
  if (!result.ok) throw new Error(result.code);
  state = result.state;
}
const first = '\u0003'.repeat(MAX_GAME_ID_LENGTH), second = '\u0004'.repeat(MAX_GAME_ID_LENGTH);
for (const actorId of [one,two]) accept({type:'join',roundId:first,expectedRevision:state.revision},actorId,0);
for (const actorId of [one,two]) accept({type:'ready',roundId:first,rosterRevision:state.rosterRevision},actorId,0);
accept({type:'leave',roundId:first},one,1);
for (const actorId of [one,two]) accept({type:'join',roundId:second,expectedRevision:state.revision},actorId,2);
const projection = projectGame(state);
const priorBindings = [
  {path:'public/house-game-rules.js',sha256:'f1c1f5be55fab0e8c6d2174e1f502cd86a91f2d49e40ab0977a8d3cbe371f890'},
  {path:'public/house-game-rules.d.ts',sha256:'d4d524b8e458a3bb792c1b805de32b3bc3fc97ea0d802339786afe257c566dcb'},
  {path:'spec/house-game-rules.test.ts',sha256:'9b73613b07da191ad7cad4d99a9e7cae174f835bf35fb7882525473bae26d33a'},
];
const normalization = priorBindings.map(({path,sha256}) => {
  const current=readFileSync(new URL(path,root),'utf8');
  const former=path.startsWith('spec/')
    ? current.trimEnd().replace('});\n\ndescribe("boundary','});\r\n\ndescribe("boundary').replace('});\n\nit("conservatively','});\r\n\nit("conservatively')+'\r\n'
    : current.trimEnd()+'\r\n\r\n';
  const matchesPriorHash=createHash('sha256').update(former).digest('hex')===sha256;
  const normalizedMatchesCurrent=former.replace(/\r\n/g,'\n').trimEnd()+'\n'===current;
  if(!matchesPriorHash||!normalizedMatchesCurrent)throw new Error(`Normalization attribution mismatch: ${path}`);
  return {path,testedOrReviewedSha256:sha256,currentSha256:digest(path),matchesPriorHash,normalizedMatchesCurrent};
});
const paths = ['public/house-game-rules.js','public/house-game-rules.d.ts','spec/house-game-rules.test.ts','docs/post-crit/evidence/game-rules-protocol.md','docs/post-crit/evidence/game-rules-inspect.mjs','docs/post-crit/evidence/game-rules-checks.md','docs/post-crit/evidence/game-rules-review.md'];
const reports = ['red','green-initial','recovery-red','green'].map(label => {
  const path = `docs/post-crit/evidence/game-rules-${label}.json`, report = JSON.parse(readFileSync(new URL(path,root),'utf8'));
  return {path,sha256:digest(path),total:report.numTotalTests,passed:report.numPassedTests,failed:report.numFailedTests,pending:report.numPendingTests};
});
const manifest = {
  recordedAt:new Date().toISOString(), head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),
  node:process.version, pnpm:execFileSync('pnpm',['--version'],{cwd:root,encoding:'utf8'}).trim(),
  scope:'Pure immutable domain only; store, SQLite, receipts, transport, UI, browser, physical and human acceptance not established.',
  sources:paths.map(path=>({path,sha256:digest(path)})),normalization,reports,
  projection:{bytes:Buffer.byteLength(JSON.stringify(projection)),limitBytes:8192,currentCells:projection.current.cells.length,latestResultCells:projection.latestResult.cells.length,idLength:MAX_GAME_ID_LENGTH,idCase:'JSON-escaped control characters, both full rosters'},
};
if(manifest.projection.bytes>8192)throw new Error('Projection exceeds byte budget');
writeFileSync(new URL('docs/post-crit/evidence/game-rules-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({sources:manifest.sources,reports:reports.map(({path,total,passed,failed,pending})=>({path,total,passed,failed,pending})),projection:manifest.projection},null,2));
