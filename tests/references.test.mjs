import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usd,reference} from '../bundle/references.js';
const feed = data => ({state:'fresh',retrieved_at:Date.now()/1000,data});
test('USD conversion preserves native denominator, zero and invalid distinctions',()=>{
 const fx=feed({btc_usd:50000});
 assert.equal(usd(1000000,fx),'$0.5'); assert.equal(usd(0,fx),'$0');
 for(const n of [null,-1,1.1,'1',Infinity,2**54]) assert.equal(usd(n,fx),'Unavailable');
 assert.equal(usd(1,feed({btc_usd:0})),'Unavailable');
 assert.equal(usd(1,{...fx,state:'stale'}),'$0.0000005 (stale)');
 assert.equal(usd(1,{...fx,retrieved_at:1}),'Unavailable');
});
test('reference is exact only, never normalizes variant/quantization or missing prices',()=>{
 const f=feed({'qwen/model':{input_usd_million:1,output_usd_million:null}});
 assert.match(reference('qwen/model',f), /\$1 · Unknown/);
 for(const id of ['Qwen/model','model','qwen/model-Q4_K_M','qwen/model:free','toString']) assert.match(reference(id,f),/No comparable listing/);
 assert.equal(reference('qwen/model',undefined),'Reference unavailable');
});
