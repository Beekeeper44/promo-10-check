# Promo Check

Pending-assembly / pending-release 10s from Metabase question 42340, with shared DONE (email sent) and COMP tracking.

## Structure
- `public/index.html` - the app
- `api/metabase.js` - proxies Metabase question 42340 (`POST /api/card/42340/query/json`)
- `api/track.js` - GET/POST DONE + COMP per AC number, stored in Neon (`promo_check_tracking`, auto-created)

## Environment variables (Vercel > Settings > Environment Variables)
| Name | Value |
|---|---|
| METABASE_HOST | https://arena-club.metabaseapp.com |
| METABASE_API_KEY | Metabase API key with access to question 42340 |
| DATABASE_URL | Neon connection string |
| METABASE_CARD_ID | optional, defaults to 42340 |

## Deploy
1. Push this folder to a GitHub repo and import it in Vercel (Framework preset: Other), or run `vercel` from this folder.
2. Add the env vars above, then redeploy.
3. Open the app. The table fills from Metabase; DONE/COMP sync across users every 15 seconds.

## Question 42340 columns expected
CARD_URL, ORDER_NUMBER, FRONT_SLAB_PICTURE_URL, BACK_SLAB_PICTURE_URL, USERNAME, USER_EMAIL, CARD_STATUS,
VALIDATION, RC_DONE, RC_DONE_AT, CERT_NUMBER, AC_NUMBER, GRADE, CENTERING, CORNERS, EDGES, SURFACE,
EXPECTED_OVERALL, SPORT, SET_NAME, PLAYER_NAME, SET_NUMBER, INSERT, PARALLEL_NAME, PARALLEL_TOTAL.
Column matching is case-insensitive. Only pending_assembly and pending_release cards are shown.
