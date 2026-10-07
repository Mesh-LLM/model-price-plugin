const nonnegative = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function freshness(feed) {
  const age = Date.now() / 1000 - feed?.retrieved_at;
  if (!['fresh', 'stale'].includes(feed?.state) || !Number.isFinite(age) || age < -60 || age > 3600) return 'unavailable';
  return feed.state === 'stale' || age >= 300 ? 'stale' : 'fresh';
}
const usable = feed => freshness(feed) !== 'unavailable';
const dollars = n => nonnegative(n) ? `$${n.toLocaleString('en-US', { maximumSignificantDigits: 6 })}` : 'Unknown';
export function usd(msat, feed) {
  if (!Number.isSafeInteger(msat) || msat < 0 || !usable(feed) || !nonnegative(feed?.data?.btc_usd) || feed.data.btc_usd === 0) return 'Unavailable';
  return `${dollars(msat / 100_000_000_000 * feed.data.btc_usd)}${freshness(feed) === 'stale' ? ' (stale)' : ''}`;
}
export function reference(id, feed) {
  if (!usable(feed)) return 'Reference unavailable';
  // Exact complete OpenRouter ID only. Never strip quantization, suffixes or versions.
  const row = Object.hasOwn(feed.data ?? {}, id) ? feed.data[id] : null;
  if (!row) return 'No comparable listing (no unambiguous exact ID)';
  return `${dollars(row.input_usd_million)} · ${dollars(row.output_usd_million)} (exact ID reference only${freshness(feed) === 'stale' ? ', stale' : ''})`;
}
export function feedLabel(name, feed) {
  if (!usable(feed)) return `${name}: unavailable`;
  return `${name}: ${freshness(feed)}, retrieved ${new Date(feed.retrieved_at * 1000).toISOString()} · ${feed.source}`;
}
