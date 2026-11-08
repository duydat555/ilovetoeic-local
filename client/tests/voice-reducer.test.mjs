// Run: node --test client/tests/voice-reducer.test.mjs  (Node 22.18+ strips TypeScript types natively)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasConversation, initialVoiceState, voiceReducer } from '../src/hooks/voiceReducer.ts';

const run = (actions, start = initialVoiceState) => actions.reduce(voiceReducer, start);
const ev = (event) => ({ type: 'event', event });

test('connecting becomes live once the server answers', () => {
  const s = run([{ type: 'connect' }, ev({ type: 'server', label: 'Mac' }), ev({ type: 'state', value: 'listening' })]);
  assert.equal(s.phase, 'live');
  assert.equal(s.agent, 'listening');
  assert.equal(s.serverLabel, 'Mac');
});

test('sentences of one reply join into a single assistant bubble, in order', () => {
  const s = run([
    { type: 'connect' },
    ev({ type: 'transcript', final: true, text: 'Hello', lang: 'en', source: 'voice' }),
    ev({ type: 'assistant_delta', text: 'Hi there.' }),
    ev({ type: 'assistant_delta', text: 'How can I help?' }),
  ]);
  assert.deepEqual(s.entries.map((e) => [e.role, e.text]), [['user', 'Hello'], ['assistant', 'Hi there. How can I help?']]);
  assert.equal(hasConversation(s), true);
});

test('after an interruption the next reply starts a new bubble and the old one is marked', () => {
  const s = run([
    ev({ type: 'transcript', final: true, text: 'Tell me a story' }),
    ev({ type: 'assistant_delta', text: 'Once upon a time.' }),
    ev({ type: 'interrupted' }),
    ev({ type: 'transcript', final: true, text: 'Stop' }),
    ev({ type: 'assistant_delta', text: 'Okay.' }),
  ]);
  assert.equal(s.entries[1].interrupted, true);
  assert.equal(s.entries[3].text, 'Okay.');
  assert.equal(s.entries.length, 4);
});

test('partial transcripts are ignored; only final ones become bubbles', () => {
  const s = run([ev({ type: 'transcript', final: false, text: 'Hel' }), ev({ type: 'transcript', final: true, text: '' })]);
  assert.equal(s.entries.length, 0);
});

test('muting overrides the listening state and unmuting restores it', () => {
  let s = run([{ type: 'connect' }, ev({ type: 'state', value: 'listening' })]);
  s = voiceReducer(s, { type: 'mute', value: true });
  assert.equal(s.agent, 'muted');
  s = voiceReducer(s, ev({ type: 'state', value: 'listening' }));
  assert.equal(s.agent, 'muted', 'server saying listening must not undo a local mute');
  s = voiceReducer(s, { type: 'mute', value: false });
  assert.equal(s.agent, 'listening');
});

test('muting while the assistant talks keeps showing the assistant', () => {
  let s = run([ev({ type: 'state', value: 'ai-speaking' })]);
  s = voiceReducer(s, { type: 'mute', value: true });
  assert.equal(s.agent, 'ai-speaking');
});

test('fatal errors stop the session with a friendly Vietnamese message', () => {
  const s = run([{ type: 'connect' }, ev({ type: 'error', code: 'ai_unavailable', message: 'Ollama is not reachable' })]);
  assert.equal(s.phase, 'error');
  assert.match(s.error, /Trợ lý AI/);
  assert.doesNotMatch(s.error, /Ollama/, 'no technical wording reaches the learner');
});

test('recoverable errors only show a gentle notice', () => {
  const s = run([ev({ type: 'state', value: 'listening' }), ev({ type: 'error', code: 'stt_failed', message: 'boom' })]);
  assert.notEqual(s.phase, 'error');
  assert.match(s.notice, /nói lại/);
});

test('failover shows a notice that clears when the new server connects', () => {
  let s = run([ev({ type: 'server', label: 'Mac' }), ev({ type: 'failover' })]);
  assert.match(s.notice, /dự phòng/);
  s = voiceReducer(s, ev({ type: 'server', label: 'Laptop' }));
  assert.equal(s.notice, '');
  assert.equal(s.serverLabel, 'Laptop');
});

test('summary ends the conversation and keeps corrections', () => {
  const s = run([
    { type: 'connect' }, ev({ type: 'state', value: 'listening' }), { type: 'ending' },
    ev({ type: 'summary', duration_seconds: 95, turns: 3, mistakes: [{ original: 'I go', better: 'I went', note: 'Quá khứ' }],
      new_words: [{ word: 'invoice', meaning_vi: 'hóa đơn' }], tip: 'Tốt lắm', conversationId: 'c1' }),
  ]);
  assert.equal(s.phase, 'summary');
  assert.equal(s.summary.durationSeconds, 95);
  assert.equal(s.summary.mistakes[0].better, 'I went');
  assert.equal(s.summary.conversationId, 'c1');
});

test('an unexpected socket close is an error, but not after a summary', () => {
  assert.equal(run([{ type: 'connect' }, { type: 'socket_closed' }]).phase, 'error');
  const done = run([ev({ type: 'summary', turns: 1 }), { type: 'socket_closed' }]);
  assert.equal(done.phase, 'summary');
});

test('ending is ignored unless the session is live; reset clears everything', () => {
  assert.equal(voiceReducer(initialVoiceState, { type: 'ending' }).phase, 'idle');
  const s = run([{ type: 'connect' }, ev({ type: 'transcript', final: true, text: 'hi' }), { type: 'reset' }]);
  assert.deepEqual(s, initialVoiceState);
});
