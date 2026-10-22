import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(String(value ?? '')).digest('hex');
const staleReasons = new Set(['old-socket', 'stale-access', 'stale-generation', 'stale-durable', 'stale-roster']);
export const rejectionDisposition = reason => staleReasons.has(reason) ? 'ignore-stale' : 'reject-forbidden';

export function assertFrameLedger(entries) {
  assert.ok(Array.isArray(entries));
  assert.deepEqual(entries.filter(entry => entry.disposition !== 'ignore-stale' || !staleReasons.has(entry.reason)), [],
    'A forbidden current frame cannot be erased by later valid frames');
}

const finite = values => values.every(Number.isFinite);
function contained(rect, width, height) {
  return finite([rect.left, rect.top, rect.right, rect.bottom]) && rect.right > rect.left && rect.bottom > rect.top
    && rect.left >= 0 && rect.top >= 0 && rect.right <= width + .5 && rect.bottom <= height + .5;
}
function exactIds(entries, expected, key) {
  assert.equal(entries.length, expected.length);
  assert.deepEqual(entries.map(entry => entry[key]).sort(), [...expected].sort());
}

export function assertWorldPresence(observed, expectedIds) {
  assert.equal(expectedIds.length, 6);
  assert.equal(new Set(expectedIds).size, 6);
  assert.ok(observed && finite([observed.width, observed.height]) && observed.width > 0 && observed.height > 0);
  exactIds(observed.targets, Array.from({ length: 6 }, (_, index) => 'game-seat-' + (index + 1)), 'seatId');
  for (const target of observed.targets) {
    assert.equal(target.visible, true, 'Each rendered chair must be inside the actual camera frustum');
    assert.ok(finite([target.x, target.y]) && target.x >= 0 && target.y >= 0
      && target.x <= observed.width && target.y <= observed.height, 'Each chair point must be in canvas bounds');
    assert.equal(target.inViewport, true);
    assert.equal(target.exposed, true, 'A HUD cannot cover a chair evidence point');
  }
  exactIds(observed.labels, expectedIds, 'id');
  for (const label of observed.labels) {
    assert.equal(label.visible, true, 'All six authenticated avatar labels must actually be shown');
    assert.equal(label.exposed, true);
    assert.equal(label.clipped, false);
    assert.ok(contained(label, observed.width, observed.height), 'Avatar label must fit the actual canvas');
  }
  exactIds(observed.meshes, expectedIds, 'id');
  for (const mesh of observed.meshes) {
    assert.ok(contained(mesh, observed.width, observed.height), 'Each authenticated posed mesh needs positive in-bounds geometry');
  }
}

export function assertCleanup(report) {
  assert.ok(report?.attempted, 'Cleanup must actually run');
  assert.deepEqual(report.errors, [], 'A cleanup failure invalidates automated acceptance');
  assert.equal(report.contexts.length, report.expectedContextCount);
  assert.equal(new Set(report.contexts.map(context => context.client)).size, report.contexts.length);
  for (const context of report.contexts) {
    assert.ok(Number.isInteger(context.client) && context.client >= 0 && context.client < 6);
    assert.equal(context.closeResolved, true);
    assert.equal(context.closeEvent, true, 'The owned context must emit its actual close event');
    assert.equal(context.stillPresent, false);
  }
  assert.equal(report.browserDisconnected, true);
  assert.equal(report.remainingContexts, 0);
}

export function assertCodeFreeView(view) {
  assert.equal(view?.inviteKnown, true);
  assert.equal(view.titleHidden, true);
  assert.equal(view.lobbyHidden, true);
  assert.equal(view.housePanelHidden, true);
  assert.equal(view.codeDisplayVisible, false);
  assert.equal(view.inviteTextVisible, false);
  assert.equal(view.inviteInputVisible, false);
}

export function finalDecision({ taskPassed, frameRejections, world, expectedIds, cleanup, bindingValid }) {
  if (!bindingValid) return 'INVALID_SOURCE_CHANGED';
  try { assertFrameLedger(frameRejections); } catch { return 'FAIL_FORBIDDEN_FRAME'; }
  try {
    assertCleanup(cleanup);
    if (taskPassed) assert.equal(cleanup.expectedContextCount, expectedIds.length);
  } catch { return 'FAIL_CLEANUP'; }
  if (!taskPassed) return 'FAIL';
  try { assertWorldPresence(world, expectedIds); } catch { return 'FAIL_WORLD_EVIDENCE'; }
  // Metadata and DOM/posed-geometry checks do not count pixels. A person/agent
  // must inspect the original native PNG before copying approved bytes to docs.
  return 'PASS_VISUAL_REVIEW_PENDING';
}

export function sanitizedResult(value) {
  const pick = (object, keys) => Object.fromEntries(keys.filter(key => object?.[key] !== undefined).map(key => [key, object[key]]));
  const event = item => ({ ...pick(item, ['client', 'event', 'socketGeneration', 'documentGeneration', 'expectedReason', 'at']),
    ...(item.message ? { errorSHA256: digest(item.message) } : {}) });
  const world = value.physicalTable?.observation;
  return {
    ...pick(value, ['label', 'origin', 'status', 'scope', 'startedAt', 'finishedAt', 'taskDeadlineMs', 'taskDurationMs', 'deadlineExceeded',
      'protocolSHA256', 'runnerSHA256', 'sourceManifestSHA256', 'sourceSHA256', 'sourceAfterSHA256', 'runnerAfterSHA256',
      'protocolAfterSHA256', 'historicalRunnerSHA256', 'runtime', 'checksPassed', 'bindingValid', 'rawDirectory']),
    privacy: { rawBodiesErrorsAndPNGsExcluded: true, nativePixelReview: 'NOT_RUN', approvedPNGBytesCopied: false },
    clients: (value.clients || []).map(item => pick(item, ['index', 'name', 'viewport', 'hasTouch', 'selfId', 'houseId'])),
    steps: (value.steps || []).map(item => pick(item, ['name', 'status', 'startedAt', 'finishedAt', 'durationMs'])),
    checks: (value.checks || []).map(item => pick(item, ['name', 'at', 'client', 'pieceId', 'destination', 'count'])),
    frameRejections: (value.frameRejections || []).map(item => pick(item, ['client', 'reason', 'disposition', 'socketGeneration', 'at'])),
    navigationEvents: (value.navigationEvents || []).map(event),
    socketEvents: (value.socketEvents || []).map(event),
    authorityObservations: (value.authorityObservations || []).map(item => ({
      ...pick(item, ['name', 'client', 'at', 'socketGeneration', 'selfId', 'houseId', 'zoneId', 'serverEpoch', 'controller',
        'generation', 'accessGeneration', 'puzzleRevision', 'progress', 'uiProjectionVisible']),
      roster: pick(item.roster, ['serverEpoch', 'houseId', 'roundId', 'revision', 'memberIds', 'selfParticipationId']),
    })),
    seatObservations: (value.seatObservations || []).map(item => pick(item, ['name', 'client', 'at', 'id', 'connected', 'zoneId', 'seatId', 'seatGeneration', 'animation'])),
    placements: (value.placements || []).map(item => pick(item, ['client', 'input', 'pieceId', 'destination', 'actorId', 'count', 'roundId', 'at'])),
    final: value.final ? { roundId: value.final.roundId, completed: value.final.completed, actorCounts: value.final.actorCounts,
      placements: value.final.placements.map(item => pick(item, ['pieceId', 'destination', 'actorId'])) } : undefined,
    physicalTable: world ? { claims: value.physicalTable.claims.map(item => pick(item, ['id', 'connected', 'zoneId', 'seatId', 'seatGeneration', 'animation'])), observation: {
      width: world.width, height: world.height,
      targets: world.targets.map(item => pick(item, ['seatId', 'x', 'y', 'visible', 'inViewport', 'exposed'])),
      labels: world.labels.map(item => pick(item, ['id', 'left', 'top', 'right', 'bottom', 'visible', 'exposed', 'clipped'])),
      meshes: world.meshes.map(item => pick(item, ['id', 'left', 'top', 'right', 'bottom'])),
    }, nativePixelReview: 'NOT_RUN' } : null,
    screenshots: (value.screenshots || []).map(item => ({ ...pick(item, ['client', 'file', 'sha256', 'width', 'height', 'nonOpaquePixels', 'crcCheckedChunks', 'codeFreeBefore', 'codeFreeAfter']), published: false })),
    errorCounts: { page: value.pageErrors?.length || 0, console: value.consoleErrors?.length || 0 },
    failure: value.failure ? { stage: value.failure.stage, client: value.failure.client, errorSHA256: digest(value.failure.message) } : null,
    cleanup: value.cleanup ? { ...pick(value.cleanup, ['attempted', 'expectedContextCount', 'contexts', 'browserDisconnected', 'remainingContexts']),
      errors: (value.cleanup.errors || []).map(item => ({ ...pick(item, ['kind', 'client']), errorSHA256: digest(item.message) })) } : null,
    sourceBindingErrorSHA256: value.sourceBindingError ? digest(value.sourceBindingError) : undefined,
  };
}
