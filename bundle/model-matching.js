// Strip packaging, never model sizes, generations, or semantic variants.
export function baseModel(id) {
  if (typeof id !== 'string' || !/^[^/]+\/[^/]+$/.test(id)) return null;
  return id.split('/')[1].replace(/@[^:]+(?=:|$)/, '')
    .replace(/:(?:UD-)?(?:I?Q|MXFP|BF|F)\d[\w-]*$/i, '')
    .replace(/[-_](?:UD-)?(?:I?Q|MXFP|BF|F)\d[\w-]*$/i, '')
    .replace(/-GGUF$/i, '').toLowerCase();
}
// Catalog-observed nearby variants, NOT equivalences. No generic fuzzy fallback.
const nearby = {
  'qwen3.8-flash-next': ['qwen/qwen3.8-flash', 'Flash rather than Flash-Next'],
  'mimo-v2.6-flash-rl': ['xiaomi/mimo-v2.6-flash', 'Flash rather than Flash-RL'],
};
export function matchModel(id, data) {
  if (Object.hasOwn(data, id)) return data[id] ? {id, kind:'exact ID'} : {error:'Ambiguous catalog ID'};
  const base = baseModel(id);
  if (!base) return {error:'No comparable listing'};
  const matches = Object.keys(data).filter(key => baseModel(key) === base);
  if (matches.length > 1 || (matches.length === 1 && !data[matches[0]])) return {error:'Ambiguous base-model references'};
  if (matches.length === 1) return {id:matches[0], kind:'base-model reference; quantization/provider may differ'};
  const candidate = nearby[base];
  if (candidate && data[candidate[0]]) return {id:candidate[0], kind:`different variant—not equivalent: ${candidate[1]}`};
  return {error:'No comparable listing (model size/variant not in catalog)'};
}
