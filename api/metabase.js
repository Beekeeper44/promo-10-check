// Proxies Metabase question 42340 (Promo Check) so the API key never reaches the browser.
// Env: METABASE_HOST, METABASE_API_KEY, optional METABASE_CARD_ID
//
// 1) POST /api/card/:id/query  with ignore_cache  (fresh, but Metabase caps it at 2,000 rows)
// 2) If that result is capped/truncated, POST /api/card/:id/query/json (no row cap)
// Never silently returns a truncated list.
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

async function fetchRows(host, key) {
  const q = await mb(host, key, `/api/card/${CARD_ID}/query`, { ignore_cache: true, parameters: [] });
  if (q.status && q.status !== 'completed') throw new Error(q.error || `Query ${q.status}`);
  const cols = ((q.data && q.data.cols) || []).map(c => c.name);
  const raw = (q.data && q.data.rows) || [];
  const truncated = !!(q.data && q.data.rows_truncated) || raw.length >= 2000;
  if (!truncated) {
    return { source: 'query', rows: raw.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]]))) };
  }
  const all = await mb(host, key, `/api/card/${CARD_ID}/query/json`, { parameters: [] });
  if (!Array.isArray(all)) throw new Error('Result over 2,000 rows and the full export failed: ' + ((all && (all.error || all.message)) || 'unknown'));
  return { source: 'query/json', rows: all };
}

module.exports = async (req, res) => {
  const host = (process.env.METABASE_HOST || '').replace(/\/+$/, '');
  const key = process.env.METABASE_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (!host || !key) return res.status(500).json({ error: 'METABASE_HOST or METABASE_API_KEY is not set' });
  try {
    const { source, rows } = await fetchRows(host, key);

    // Debug: /api/metabase?debug=20396710 → is that order in what Metabase sent us?
    const dbg = req.query && req.query.debug;
    if (dbg) {
      const get = (o, k) => { const f = Object.keys(o).find(x => x.toUpperCase() === k); return f ? o[f] : null; };
      const hits = rows.filter(r => String(get(r, 'ORDER_NUMBER') || '').includes(String(dbg)));
      return res.status(200).json({
        card: CARD_ID, source, total_rows: rows.length,
        columns: rows[0] ? Object.keys(rows[0]) : [],
        order: String(dbg), matching_rows: hits.length,
        sample: hits.slice(0, 3)
      });
    }
    return res.status(200).json({ card: CARD_ID, source, count: rows.length, fetched_at: new Date().toISOString(), rows });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
