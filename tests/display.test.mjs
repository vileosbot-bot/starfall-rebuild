import test from 'node:test';
import assert from 'node:assert/strict';
import {enterLandscape} from '../dist/display.js';

test('mobile entry requests fullscreen before locking landscape', async () => {
  const calls = [];
  const root = {ownerDocument:{}, async requestFullscreen() { calls.push('fullscreen'); }};
  const orientation = {async lock(mode) { calls.push(mode); }};
  assert.equal(await enterLandscape(root,orientation,true),true);
  assert.deepEqual(calls,['fullscreen','landscape']);
  calls.length = 0;
  assert.equal(await enterLandscape(root,orientation,false),true);
  assert.deepEqual(calls,['fullscreen']);
});

test('unsupported or denied display APIs select the rotation fallback', async () => {
  const root = {ownerDocument:{}};
  assert.equal(await enterLandscape(root,undefined,true),false);
  let locked = false;
  const orientation = {lock() { locked = true; }};
  root.requestFullscreen = async () => { throw Error('denied'); };
  assert.equal(await enterLandscape(root,orientation,true),false);
  assert.equal(locked,false);
  root.requestFullscreen = async () => {};
  assert.equal(await enterLandscape(root,undefined,true),false);
  assert.equal(await enterLandscape(root,{lock:async () => { throw Error('unsupported'); }},true),false);
});
