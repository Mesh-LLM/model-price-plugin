import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchModel,baseModel,referenceUrl} from '../bundle/model-matching.js';
const data={'qwen/qwen3-8b':{},'qwen/qwen3.8-27b':{},'qwen/qwen3.8-flash':{},'xiaomi/mimo-v2.6-flash':{},'google/gemma-4-31b-it':{}};
test('packaging normalization keeps semantic model identity',()=>{
 assert.equal(baseModel('unsloth/Qwen3.8-27B-GGUF:UD-Q4_K_M'),'qwen3.8-27b');
 assert.equal(matchModel('unsloth/Qwen3-8B-GGUF@main:Q4_K_M',data).id,'qwen/qwen3-8b');
 assert.match(matchModel('unsloth/Qwen3.8-27B-GGUF:UD-Q4_K_M',data).kind,/base-model/);
 for(const id of ['a/Qwen3-9B-GGUF:Q4_K_M','a/Qwen3.5-27B','a/gemma-4-E2B-it-GGUF:Q4_K_M','mesh']) assert(matchModel(id,data).error);
});
test('nearby semantic variants are explicit, ambiguity never picks first',()=>{
 assert.match(matchModel('unsloth/Qwen3.8-Flash-Next-GGUF@abc:UD-Q4_K_XL',data).kind,/name reference/);
 assert.match(matchModel('ggml-org/MiMo-V2.6-Flash-RL-GGUF@abc:MXFP4',data).kind,/name reference/);
 assert.match(matchModel('a/Qwen3-8B-GGUF:Q4_K_M',{...data,'other/qwen3-8b':{}}).error,/Ambiguous/);
 assert.equal(matchModel('qwen/qwen3-8b',data).kind,'exact ID');
});
import {modelOffers} from '../bundle/model-offers.js';
test('zero input preserves paid output',()=>{
 const [r]=modelOffers({data:[{id:'a/b',payment:{offers:[{paid:true,rate_unit:'msat_per_million_tokens',pricing:{input_msat_per_million:0,output_msat_per_million:1500}}]}}]});
 assert.equal(r.inputMsat,0);assert.equal(r.outputMsat,1500);assert.equal(r.status,'Paid');
});

test('ranking rejects tied variants and unsafe links',()=>{
 assert.match(matchModel('a/Qwen3.8-Flash-Next-GGUF:Q4_K_M',{'qwen/qwen3.8-flash':{},'other/qwen3.8-flash':{}}).error,/Ambiguous/);
 assert(matchModel('a/Qwen3.8-Flash-Next',{'qwen/qwen3.5-flash':{}}).error);
 assert.equal(referenceUrl('qwen/qwen3.8-flash'),'https://openrouter.ai/qwen/qwen3.8-flash');
 for(const id of ['//evil.test','a/../b','a/b?x','a/b#x','a/<script>','https://evil.test']) assert.equal(referenceUrl(id),null);
});
