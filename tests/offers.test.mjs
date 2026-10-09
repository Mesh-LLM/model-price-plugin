import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelOffers } from '../bundle/model-offers.js';
test('missing, empty and malformed economics are unknown, not free', () => {
  for (const payment of [undefined, {}, {offers: []}, {offers: [null]}]) {
    assert.equal(modelOffers({data: [{id: 'm', payment}]})[0].status, 'Unknown');
  }
  assert.throws(() => modelOffers({}), /Invalid/);
  assert.deepEqual(modelOffers({data: []}), []);
});
test('mixed providers preserve explicit free and paid with units', () => {
  const rows = modelOffers({data: [{id: 'm', payment: {offers: [
    {provider_id: 'a', paid: false},
    {provider_id: 'b', paid: true, rate_unit: 'msat_per_million_tokens', pricing: {input_msat_per_million: 0, output_msat_per_million: 2000}, peer_last_seen_seconds_ago: 7}
  ]}}]});
  assert.equal(rows[0].status, 'Free');
  assert.equal(rows[1].status, 'Paid');
  assert.equal(rows[1].input, '0 msat / million tokens');
  assert.equal(rows[1].output, '2,000 msat / million tokens');
  assert.equal('minimum' in rows[1], false);
  assert.equal('minimumMsat' in rows[1], false);
  assert.equal(rows[1].age, '7 s');
});
test('invalid amounts and units are not coerced', () => {
  for (const value of [-1, '2', null, 1.5, Infinity, 2**54]) {
    const [row] = modelOffers({data: [{payment: {offers: [{paid: true, rate_unit: 'msat_per_million_tokens', pricing: {input_msat_per_million: value}}]}}]});
    assert.equal(row.input, 'Unknown msat / million tokens');
  }
  assert.equal(modelOffers({data: [{payment:{offers:[{paid:true, rate_unit:'sats'}]}}]})[0].input, 'Unknown unit');
});

test('hide only the virtual mesh router, preserving real mesh-named models',()=>{
 const rows=modelOffers({data:[{id:'mesh',virtual_model:{plugin:'mesh-moa'}},{id:'mesh',owned_by:'plugin:mesh-moa'},{id:'mesh'},{id:'org/mesh-model'},{id:'other-router',virtual_model:{plugin:'other'}}]});
 assert.deepEqual(rows.map(row=>row.model),['mesh','org/mesh-model','other-router']);
});
