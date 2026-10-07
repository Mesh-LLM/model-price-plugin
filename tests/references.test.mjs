import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usd,reference,freshness,feedLabel} from '../bundle/references.js';
const feed = data => ({state:'fresh',retrieved_at:Date.now()/1000,data});
test('USD conversion preserves native denominator, zero and invalid distinctions',()=>{
 const fx=feed({btc_usd:50000});
 assert.equal(usd(500,fx),'$0.00025'); assert.equal(usd(1500,fx),'$0.00075');
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

test('local clock ages fresh references and expires both cells and status',()=>{
 const original=Date.now; let now=1000000; Date.now=()=>now*1000;
 try {
  const f=feed({btc_usd:50000,'a/b':{input_usd_million:1,output_usd_million:2}});
  now+=300; assert.equal(freshness(f),'stale'); assert.match(usd(1000000,f),/stale/); assert.match(reference('a/b',f),/stale/); assert.match(feedLabel('FX',f),/stale/);
  now+=3301; assert.equal(usd(1000000,f),'Unavailable'); assert.equal(reference('a/b',f),'Reference unavailable'); assert.equal(feedLabel('FX',f),'FX: unavailable');
 } finally {Date.now=original;}
});
