const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const dbPath = require.resolve('../config/db');
let records = [];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { execute: async (sql, args) => {
 assert.match(sql, /p\.patient_id = \?/); assert.deepEqual(args, ['9', 3]); return [records];
} } };
const { download } = require('../controllers/prescriptionDownloadController');
test('foreign or missing prescription gets no PDF', async () => {
 let status; const res = {status(code){ status=code;return this;},json(body){assert.match(body.message,/not found/);} };
 await download({ user:{userId:3},params:{id:'9'} },res); assert.equal(status,404);
});
test('own prescription downloads as a valid PDF', async () => {
 records = [{ id:9, patient_name:'Test Patient',patient_unique_id:'PT-123',doctor_name:'Test Doctor',medicine_name:'Example medicine',dosage:'As prescribed',duration_days:5,created_at:new Date(),status:'Active' }];
 const res = new PassThrough(); const headers={};res.setHeader=(k,v)=>headers[k]=v;
 const chunks=[];res.on('data',chunk=>chunks.push(chunk));const complete=new Promise(resolve=>res.on('finish',resolve));
 await download({user:{userId:3},params:{id:'9'}},res);await complete;
 const buffer=Buffer.concat(chunks); assert.equal(buffer.subarray(0,5).toString(),'%PDF-');assert.equal(headers['Content-Type'],'application/pdf');
 const { PDFParse }=require('pdf-parse');const parser=new PDFParse({data:buffer});const parsed=await parser.getText();await parser.destroy(); assert.match(parsed.text,/Test Patient/);assert.match(parsed.text,/Example medicine/);
});
