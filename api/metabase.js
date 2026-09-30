// Proxies Metabase question 42340 (Promo Check) so the API key never reaches the browser.
// Env: METABASE_HOST (e.g. https://arena-club.metabaseapp.com), METABASE_API_KEY
const CARD_ID = process.env.METABASE_CARD_ID || '42340';

module.exports = async (req, res) => {
  const host = (process.env.METABASE_HOST || '').replace(/\/+$/, '');
  const key = process.env.METABASE_API_KEY;
  if (!host || !key) {
    return res.status(500).json({ error: 'METABASE_HOST or METABASE_API_KEY is not set' });
  }
  try {
    const r = await fetch(`${host}/api/card/${CARD_ID}/query/json`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: [] })
    });
    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: `Metabase ${r.status}: ${text.slice(0, 300)}` });
    }
    let rows;
    try { rows = JSON.parse(text); } catch { return res.status(502).json({ error: 'Metabase returned non-JSON' }); }
    if (!Array.isArray(rows)) {
      return res.status(502).json({ error: (rows && (rows.error || rows.message)) || 'Unexpected Metabase response' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ card: CARD_ID, count: rows.length, rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
