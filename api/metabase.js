// Proxies Metabase question 42340 (Promo Check) so the API key never reaches the browser.
// Env: METABASE_HOST (e.g. https://arena-club.metabaseapp.com), METABASE_API_KEY
// Uses /query with ignore_cache so Refresh always pulls fresh results; falls back to
// /query/json when the result is larger than the 2,000-row /query limit.
const CARD_ID = process.env.METABASE_CARD_ID || '42340';

async function mb(host, key, path, body) {
  const r = await fetch(`${host}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(`Metabase ${r.status}: ${text.slice(0, 300)}`), { status: r.status });
  try { return JSON.parse(text); } catch { throw new Error('Metabase returned non-JSON'); }
}

module.exports = async (req, res) => {
  const host = (process.env.METABASE_HOST || '').replace(/\/+$/, '');
  const key = process.env.METABASE_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (!host || !key) return res.status(500).json({ error: 'METABASE_HOST or METABASE_API_KEY is not set' });

  try {
    const q = await mb(host, key, `/api/card/${CARD_ID}/query`, { ignore_cache: true, parameters: [] });
    if (q.status && q.status !== 'completed') throw new Error(q.error || `Query ${q.status}`);
    const cols = (q.data && q.data.cols || []).map(c => c.name);
    const raw = (q.data && q.data.rows) || [];
    let rows = raw.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));

    if (raw.length >= 2000) {
      const all = await mb(host, key, `/api/card/${CARD_ID}/query/json`, { parameters: [] });
      if (Array.isArray(all)) rows = all;
    }
    return res.status(200).json({ card: CARD_ID, count: rows.length, fetched_at: new Date().toISOString(), rows });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
