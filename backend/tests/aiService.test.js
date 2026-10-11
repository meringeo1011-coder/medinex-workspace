const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateAI } = require('../utils/aiService');
process.env.GEMINI_API_KEY = 'test-gemini'; process.env.GROQ_API_KEY = 'test-groq';
const response = data => ({ ok: true, json: async () => data });
test('Gemini succeeds without calling Groq', async () => {
 let calls = 0; global.fetch = async () => { calls++; return response({ candidates: [{ content: { parts: [{ text: 'Primary answer' }] } }] }); };
 assert.deepEqual(await generateAI('hello'), { text: 'Primary answer', provider: 'gemini' }); assert.equal(calls, 1);
});
for (const reason of ['HTTP 429', 'HTTP 500', 'network', 'empty', 'timeout']) test(`fallback on ${reason}`, async () => {
 let calls = 0; global.fetch = async (url, options) => {
  calls++; if (calls === 1) {
   if (reason === 'empty') return response({ candidates: [] });
   if (reason === 'timeout') throw new DOMException('timeout', 'TimeoutError');
   if (reason === 'network') throw new Error('network');
   return { ok: false, status: reason === 'HTTP 429' ? 429 : 500 };
  }
  assert.match(url, /api.groq.com/); assert.equal(options.headers.Authorization, 'Bearer test-groq');
  return response({ choices: [{ message: { content: 'Fallback answer' } }] });
 };
 assert.equal((await generateAI('hello')).provider, 'groq'); assert.equal(calls, 2);
});
test('image fallback uses a vision message', async () => {
 global.fetch = async (url, options) => {
  if (!url.includes('groq')) throw new Error('primary down');
  const body = JSON.parse(options.body); assert.equal(body.messages[0].content[1].image_url.url, 'data:image/png;base64,aGk=');
  return response({ choices: [{ message: { content: 'Image summary' } }] });
 };
 assert.equal((await generateAI('summarize', { buffer: Buffer.from('hi'), mimeType: 'image/png' })).text, 'Image summary');
});
test('both providers failing returns an explicit unavailable error', async () => {
 global.fetch = async () => { throw new Error('offline'); }; await assert.rejects(generateAI('hello'), /temporarily unavailable/);
});
