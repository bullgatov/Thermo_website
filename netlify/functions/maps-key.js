/**
 * Returns GOOGLE_MAPS_API_KEY for client-side Maps JavaScript API (referrer-restricted in Google Cloud).
 * Set GOOGLE_MAPS_API_KEY in Netlify Environment variables (and in .env for netlify dev).
 */

exports.handler = async function handler() {
  var key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: false, error: "Maps key not configured" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ ok: true, apiKey: key }),
  };
};