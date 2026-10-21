import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Record consistency only. Semantic grading remains an explicit parent/reviewer task.
const bytes = readFileSync(new URL('./harness-claim-table.protocol.json', import.meta.url));
const protocol = JSON.parse(bytes);
const digest = createHash('sha256').update(bytes).digest('hex');
const result = JSON.parse(readFileSync(new URL('./harness-claim-table.results.json', import.meta.url)));
function check(record) {
  assert.equal(record.protocolId, protocol.id);
  assert.equal(record.protocolSHA256, digest);
  const ids = Object.keys(protocol.mapping);
  assert.equal(record.attempts.length, ids.length);
  assert.deepEqual(record.attempts.map(a => a.id).sort(), ids.sort());
  assert.equal(new Set(record.attempts.map(a => a.id)).size, ids.length);
  const cells = new Set();
  for (const a of record.attempts) {
    assert.equal(a.arm, protocol.mapping[a.id]);
    assert.equal(a.model, protocol.model);
    assert.equal(a.effort, protocol.effort);
    assert.equal(a.forkTurns, 'none');
    assert(protocol.fixtures.some(t => t.id === a.task));
    const cell = `${a.task}:${a.arm}`;
    assert(!cells.has(cell)); cells.add(cell);
    assert(['COMPLETED', 'INFRASTRUCTURE_FAILURE', 'INVALID_OUTPUT'].includes(a.status));
    assert(Number.isInteger(a.observedToolCalls) && a.observedToolCalls >= 0);
    if (a.status === 'COMPLETED') {
      assert(['ACCEPT', 'OPEN'].includes(a.output.localAcceptance));
      assert(['ALLOWED', 'NOT_AUTHORIZED'].includes(a.output.publication));
      assert(Array.isArray(a.output.claims) && a.output.claims.length > 0);
      for (const c of a.output.claims) {
        assert(['SUPPORTED', 'UNSUPPORTED', 'INCONCLUSIVE'].includes(c.status));
        for (const field of ['topic', 'evidence', 'reason']) assert(typeof c[field] === 'string' && c[field].length > 0);
      }
      assert(typeof a.output.nextAction === 'string' && a.output.nextAction.length > 0);
      assert(JSON.stringify(a.output).split(/\s+/).length <= 450);
    }
  }
  assert.equal(record.metrics.planned, ids.length);
  assert.equal(record.metrics.completed, record.attempts.filter(a => a.status === 'COMPLETED').length);
  assert.equal(record.metrics.infrastructureFailures, record.attempts.filter(a => a.status === 'INFRASTRUCTURE_FAILURE').length);
  assert.equal(record.metrics.candidateToolCalls, record.attempts.reduce((n, a) => n + a.observedToolCalls, 0));
  return true;
}
assert(check(result));
const controls = [
  r => { r.attempts.pop(); },
  r => { r.attempts[1].id = r.attempts[0].id; },
  r => { r.protocolSHA256 = '0'.repeat(64); },
  r => { r.attempts[0].output.localAcceptance = 'DONE'; },
  r => { r.metrics.completed = 5; },
];
for (const corrupt of controls) {
  const candidate = structuredClone(result); corrupt(candidate);
  assert.throws(() => check(candidate));
}
// An honest infrastructure failure must stay in the denominator and remain valid.
const interrupted = structuredClone(result);
interrupted.attempts[0].status = 'INFRASTRUCTURE_FAILURE';
interrupted.attempts[0].output = null;
interrupted.metrics.completed--; interrupted.metrics.infrastructureFailures++;
assert(check(interrupted));
console.log(JSON.stringify({recordConsistency: 'PASS', actualAttempts: result.attempts.length,
  validControls: 2, invalidControls: controls.length, semanticGrading: 'NOT_AUTOMATED',
  protocolSHA256: digest}));
