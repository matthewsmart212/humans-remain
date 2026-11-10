import assert from 'node:assert/strict';
import {build} from 'esbuild';

const compiled = await build({entryPoints: ['src/opening-music.ts'], bundle: true, write: false, format: 'esm', platform: 'node'});
const {createOpeningMusic} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const flush = () => new Promise(resolve => setImmediate(resolve));

class Media extends EventTarget {
  paused = true;
  currentTime = 0;
  attempts = [];
  loads = 0;
  error = null;
  play() {
    this.paused = false;
    return new Promise((resolve, reject) => this.attempts.push({resolve, reject}));
  }
  pause() { this.paused = true; }
  load() { this.loads++; this.error = null; }
}

const audio = new Media();
const prompts = [];
const session = {type: 'auto'};
const music = createOpeningMusic(audio, visible => prompts.push(visible), session);
music.start();
assert.equal(audio.attempts.length, 1, 'tap requests streaming playback before media has loaded');
assert.equal(session.type, 'playback');
music.start();
assert.equal(audio.attempts.length, 1, 'a buffering request stays pending');
audio.attempts[0].resolve();
await flush();

audio.currentTime = 4;
music.start();
assert.equal(audio.attempts.length, 1, 'starting narration leaves the music playing');
assert.equal(audio.currentTime, 4);
audio.paused = true;
audio.dispatchEvent(new Event('pause'));
assert.equal(prompts.at(-1), true, 'an unexpected interruption offers recovery');
music.pause();
music.start();
assert.equal(audio.currentTime, 4, 'unmute/foreground resumes at the same point');
audio.paused = true;
audio.attempts[1].reject(new Error('NotAllowedError'));
await flush();
assert.equal(prompts.at(-1), true, 'a blocked play offers a retry');

audio.error = new Error('network failure');
music.start();
assert.equal(audio.loads, 0, 'rerender/visibility events do not reload the stream');
music.start(true);
assert.equal(audio.loads, 1, 'a deliberate retry reloads a failed stream');
audio.attempts[2].resolve();
await flush();
assert.equal(prompts.at(-1), false);
music.pause();
music.start();
music.dispose();
audio.attempts[3].reject(new Error('AbortError'));
await flush();
assert.equal(prompts.at(-1), false, 'a cancelled play cannot show a stale prompt');
assert.equal(session.type, 'auto');
assert.equal(audio.paused, true);
music.start();
assert.equal(audio.attempts.length, 4, 'a released player stays stopped');

const legacy = new Media();
const withoutSession = createOpeningMusic(legacy, () => {});
withoutSession.start();
assert.equal(legacy.attempts.length, 1, 'streaming works without the optional audio-session API');
withoutSession.dispose();
console.log('PASS: tap-to-stream, uninterrupted handoff, mute/resume, blocked playback recovery and cleanup.');
