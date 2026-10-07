// Unknown/malformed economics must never silently become a free offer.
const text = value => typeof value === 'string' && value.trim() ? value : 'Unknown';
const amount = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('en-US') : 'Unknown';
export function modelOffers(body) {
  if (!body || !Array.isArray(body.data)) throw new Error('Invalid /v1/models response');
  return body.data.flatMap(model => {
    const offers = model?.payment?.offers;
    if (!Array.isArray(offers) || !offers.length) return [{ model: text(model?.id), provider: 'Unknown', status: 'Unknown', input: 'Unknown', output: 'Unknown', minimum: 'Unknown', age: 'Unknown' }];
    return offers.map(offer => {
      const paid = offer?.paid;
      const knownUnit = offer?.rate_unit === 'msat_per_million_tokens';
      const rate = key => paid === false ? '—' : knownUnit ? `${amount(offer?.pricing?.[key])} msat / million tokens` : 'Unknown unit';
      return {
        model: text(model?.id), provider: text(offer?.provider_id),
        inputMsat: paid === false ? 0 : paid === true && knownUnit ? offer?.pricing?.input_msat_per_million : undefined,
        outputMsat: paid === false ? 0 : paid === true && knownUnit ? offer?.pricing?.output_msat_per_million : undefined,
        status: paid === true ? 'Paid' : paid === false ? 'Free' : 'Unknown',
        input: rate('input_msat_per_million'), output: rate('output_msat_per_million'),
        minimum: paid === false ? '—' : `${amount(offer?.pricing?.minimum_invoice_msat)} msat`,
        age: `${amount(offer?.peer_last_seen_seconds_ago)} s${offer?.local === true ? ' · local' : ''}`,
      };
    });
  });
}
