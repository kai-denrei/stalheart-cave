import test from 'node:test';
import assert from 'node:assert/strict';
import { endingAction, parseMode, postOutcome } from '../src/handoff.js';

test('stalheart mode: the ending returns its outcome to the parent, a lost descent tries again', () => {
  assert.deepEqual(endingAction('rescued', true), { label: 'RETURN TO THE SURFACE', action: 'return' });
  assert.deepEqual(endingAction('sacrifice', true), { label: 'RETURN TO THE SURFACE', action: 'return' });
  assert.deepEqual(endingAction('lost', true), { label: 'TRY AGAIN', action: 'restart' });
  assert.deepEqual(endingAction('rescued', false), { label: 'PLAY AGAIN', action: 'restart' });
  assert.equal(parseMode('?stalheart=1'), true); assert.equal(parseMode('?test'), false); assert.equal(parseMode(''), false);
});

test('postOutcome posts { below } to the parent window', () => {
  const posted = [];
  globalThis.parent = { postMessage: (m, origin) => posted.push([m, origin]) };
  assert.equal(postOutcome('rescued'), true);
  assert.deepEqual(posted, [[{ below: 'rescued' }, '*']]);
  delete globalThis.parent;
});
