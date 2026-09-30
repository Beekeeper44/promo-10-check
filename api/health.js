// Diagnostics: shows which env var NAMES this deployment can see (never the values).
module.exports = async (req, res) => {
  const env = process.env;
  const dbNames = Object.keys(env).filter(k => /(DATABASE|POSTGRES|NEON|PG)/i.test(k)).sort();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    vercel_env: env.VERCEL_ENV || null,
    deployment_url: env.VERCEL_URL || null,
    metabase_host_set: !!env.METABASE_HOST,
    metabase_key_set: !!env.METABASE_API_KEY,
    database_vars_found: dbNames
  });
};
