const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const dbPath = require.resolve('../config/db');
const aiPath = require.resolve('../utils/aiService');
const calls = [];
let aiResult;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { execute: async (...args) => { calls.push(args); return [[]]; } } };
require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: {
    generateText: async () => { if(aiResult instanceof Error) throw aiResult; return aiResult; },
    summarizeReport: async () => { if(aiResult instanceof Error) throw aiResult; return aiResult; }
} };
const doctor = require('../controllers/doctorController');
const patient = require('../controllers/patientController');
function response() { return { status(n) { this.code=n; return this; }, json(body) { this.body=body; return this; } }; }
beforeEach(() => { calls.length=0; aiResult={text:'SAFE',provider:'groq'}; });

test('Groq screening result maintains existing API shape', async () => {
    const res=response();await doctor.checkInteraction({body:{newMedicine:'sample',currentMedicines:[]}},res);
    assert.equal(res.code,200);assert.equal(res.body.status,'safe');assert.equal(res.body.provider,'groq');
});
test('UNSAFE is never accidentally classified as SAFE', async () => {
    aiResult={text:'UNSAFE',provider:'groq'};
    const res=response();await doctor.checkInteraction({body:{newMedicine:'sample'}},res);
    assert.equal(res.body.status,'warning');
});
test('direct allergy conflict is retained without provider call', async () => {
    aiResult=new Error('Providers unavailable');
    const res=response();await doctor.checkInteraction({body:{newMedicine:'Amoxicillin 500mg',allergies:'Amoxicillin'}},res);
    assert.equal(res.code,200);assert.equal(res.body.status,'warning');assert.match(res.body.message,/documented allergy/);
});
test('both providers failing returns unavailable rather than safe', async () => {
    aiResult=new Error('Providers unavailable');
    const res=response();await doctor.checkInteraction({body:{newMedicine:'sample'}},res);
    assert.equal(res.code,503);assert.equal(res.body.status,'unavailable');
});
test('chatbot returns Groq reply and handles both-provider failure', async () => {
    aiResult={text:'A general informational reply.',provider:'groq'};
    const res=response();await patient.askAIAssistant({body:{question:'Storage?'}},res);
    assert.equal(res.code,200);assert.equal(res.body.provider,'groq');assert.equal(res.body.reply,aiResult.text);
    aiResult=new Error('Providers unavailable');
    const failed=response();await patient.askAIAssistant({body:{question:'Storage?'}},failed);
    assert.equal(failed.code,503);
});
test('failed report summary still saves the upload with a clear message', async () => {
    aiResult=new Error('Providers unavailable');
    const fs=require('fs');const old=fs.readFileSync;fs.readFileSync=()=>Buffer.from('sample document');
    try {
        const res=response();await patient.uploadLabReport({user:{userId:1},file:{originalname:'sample.pdf',filename:'sample.pdf',path:'sample.pdf',mimetype:'application/pdf'}},res);
        assert.equal(res.code,201);assert.match(res.body.summary,/unavailable/);
        assert.equal(calls.length,1);assert.match(calls[0][0],/INSERT INTO lab_reports/);
    } finally {fs.readFileSync=old;}
});
