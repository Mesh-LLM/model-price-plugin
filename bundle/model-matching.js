// Strip packaging, never model sizes, generations, or semantic variants.
export function baseModel(id) {
  if (typeof id !== 'string' || !/^[^/]+\/[^/]+$/.test(id)) return null;
  return id.split('/')[1].replace(/@[^:]+(?=:|$)/, '')
    .replace(/:(?:UD-)?(?:I?Q|MXFP|BF|F)\d[\w-]*$/i, '')
    .replace(/[-_](?:UD-)?(?:I?Q|MXFP|BF|F)\d[\w-]*$/i, '')
    .replace(/-GGUF$/i, '').toLowerCase();
}
export function referenceUrl(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.:-]+$/.test(id)
    ? `https://openrouter.ai/${id}` : null;
}
function identity(base) {
  const tokens = base.split('-');
  const family = tokens.shift();
  const generation = /^v?\d+(?:\.\d+)*$/.test(tokens[0]) ? tokens.shift() : '';
  const sizes = tokens.filter(t => /^(?:e|a)?\d+(?:\.\d+)?[bt]$/.test(t)).sort().join('-');
  return {key:`${family}/${generation}/${sizes}`, tokens:new Set(tokens)};
}
function rank(base, candidate) {
  const a=identity(base), b=identity(candidate);
  if(a.key !== b.key) return 0;
  const shared=[...a.tokens].filter(t=>b.tokens.has(t)).length;
  const union=new Set([...a.tokens,...b.tokens]).size;
  return shared && union ? shared/union : 0;
}
export function matchModel(id, data) {
  if (Object.hasOwn(data, id)) return data[id] ? {id, kind:'exact ID'} : {error:'Ambiguous catalog ID'};
  const base = baseModel(id);
  if (!base) return {error:'No comparable listing'};
  const matches = Object.keys(data).filter(key => baseModel(key) === base);
  if (matches.length > 1 || (matches.length === 1 && !data[matches[0]])) return {error:'Ambiguous base-model references'};
  if (matches.length === 1) return {id:matches[0], kind:'base-model reference; quantization/provider may differ'};
  const ranked = Object.keys(data).filter(key=>data[key] && referenceUrl(key) && baseModel(key))
    .map(key=>({id:key,score:rank(base,baseModel(key))})).filter(row=>row.score>=0.5)
    .sort((a,b)=>b.score-a.score);
  if (ranked.length && ranked[0].score === ranked[1]?.score) return {error:'Ambiguous model references'};
  if (ranked.length) return {id:ranked[0].id,kind:'name reference'};
  return {error:'No comparable listing (model size/variant not in catalog)'};
}
