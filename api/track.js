// Shared DONE / COMP tracking per AC number, stored in Neon Postgres.
// Env: DATABASE_URL (Neon connection string)
const { neon } = require('@neondatabase/serverless');

let ready = false;
async function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql = neon(process.env.DATABASE_URL);
  if (!ready) {
    await sql`CREATE TABLE IF NOT EXISTS promo_check_tracking (
      ac_number  TEXT PRIMARY KEY,
      done       BOOLEAN NOT NULL DEFAULT FALSE,
      done_at    TIMESTAMPTZ,
      comp       TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    ready = true;
  }
  return sql;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sql = await db();

    if (req.method === 'GET') {
      const rows = await sql`SELECT ac_number AS ac, done, done_at, comp, updated_at FROM promo_check_tracking`;
      return res.status(200).json({ rows });
    }

    if (req.method === 'POST') {
      const b = await readBody(req);
      const ac = String(b.ac || '').trim();
      if (!/^[A-Za-z0-9-]{1,40}$/.test(ac)) return res.status(400).json({ error: 'Invalid AC number' });
      const done = !!b.done;
      const comp = String(b.comp == null ? '' : b.comp).trim().slice(0, 50);

      // COMP is locked while DONE is checked: keep the stored comp unless this request unchecks DONE.
      const [existing] = await sql`SELECT done, comp FROM promo_check_tracking WHERE ac_number = ${ac}`;
      const finalComp = existing && existing.done && done ? existing.comp : comp;

      const [row] = await sql`
        INSERT INTO promo_check_tracking (ac_number, done, done_at, comp, updated_at)
        VALUES (${ac}, ${done}, ${done ? new Date().toISOString() : null}, ${finalComp}, NOW())
        ON CONFLICT (ac_number) DO UPDATE SET
          done       = EXCLUDED.done,
          done_at    = CASE WHEN EXCLUDED.done AND promo_check_tracking.done THEN promo_check_tracking.done_at
                            WHEN EXCLUDED.done THEN NOW() ELSE NULL END,
          comp       = EXCLUDED.comp,
          updated_at = NOW()
        RETURNING ac_number AS ac, done, done_at, comp, updated_at`;
      return res.status(200).json({ row });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
