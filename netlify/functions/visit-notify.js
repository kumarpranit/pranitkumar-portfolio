/**
 * visit-notify.js — Netlify Function: email Pranit when someone visits the portfolio
 * ================================================================================
 *
 * What this does
 * --------------
 * Receives the POST sent by the invisible beacon in index.html (see
 * VISIT_NOTIFY_ENDPOINT in the page), formats a short email with the
 * visitor's IP-based location (city / region / country), and sends it
 * to kumarpranit@g.ucla.edu via the Resend transactional email API.
 *
 * One-time setup (do this once when deploying to Netlify)
 * --------------------------------------------------------
 * 1. Place this file at:  netlify/functions/visit-notify.js
 *    (Netlify auto-detects anything in netlify/functions/ on deploy.)
 *    Your site's beacon already posts to /.netlify/functions/visit-notify,
 *    which maps to this file — no other config is needed.
 *
 * 2. Create a free Resend account at https://resend.com and create an API key.
 *    Verify a sending domain or use Resend's onboarding sender for testing.
 *
 * 3. In Netlify: Site settings → Environment variables, add:
 *      RESEND_API_KEY   = re_...   (your Resend API key — never hardcode it here)
 *      VISIT_NOTIFY_FROM = (optional) e.g. "Portfolio <visits@yourdomain.com>"
 *                          Defaults to "Portfolio <onboarding@resend.dev>".
 *      VISIT_NOTIFY_TO   = (optional) defaults to kumarpranit@g.ucla.edu
 *
 * 4. Redeploy the site. The next visit will trigger one email per browser
 *    session (the page beacon de-dupes via sessionStorage).
 *
 * Privacy note
 * ------------
 * Location is IP-based geolocation only (city-level). No browser
 * Geolocation API is used and visitors are never shown a permission prompt.
 * The site footer discloses: "This site logs visit location (city-level)
 * for security."
 *
 * No keys or secrets are hardcoded in this file — everything sensitive
 * comes from environment variables.
 */

// Netlify Functions (Node) handler — also works with the modern
// `export default` style if you migrate; this CommonJS form is the
// classic, zero-dependency Netlify Functions format.
exports.handler = async function (event) {
  // Only accept POSTs from the beacon.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.VISIT_NOTIFY_TO || "kumarpranit@g.ucla.edu";
  const from = process.env.VISIT_NOTIFY_FROM || "Portfolio <onboarding@resend.dev>";

  if (!apiKey) {
    // Misconfigured deploy — log server-side, return 500 so it shows in
    // Netlify function logs, but the visitor's page is unaffected either way
    // (the beacon swallows all errors).
    console.error("visit-notify: RESEND_API_KEY env var is not set");
    return { statusCode: 500, body: "Email not configured" };
  }

  let visit = {};
  try {
    visit = JSON.parse(event.body || "{}");
  } catch (e) {
    visit = {};
  }

  // Fall back to Netlify's own headers if the client payload is sparse.
  const headers = event.headers || {};
  const clientIp =
    visit.ip ||
    headers["x-nf-client-connection-ip"] ||
    (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "";

  const city = visit.city || "Unknown city";
  const region = visit.region || "";
  const country = visit.country || "";
  const locationLabel = [city, region, country].filter(Boolean).join(", ");

  const subject = `New portfolio visit — ${locationLabel}`;

  const lines = [
    `New visit to your portfolio`,
    ``,
    `Location:  ${locationLabel}`,
    `IP:        ${clientIp || "—"}`,
    `Time:      ${visit.timestamp || new Date().toISOString()}`,
    `Page:      ${visit.pageUrl || "—"}`,
    `Referrer:  ${visit.referrer || "(direct / none)"}`,
    `Device:    ${visit.userAgent || "—"}`,
  ];
  const text = lines.join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#12161c">
      <h2 style="margin:0 0 12px">New portfolio visit</h2>
      <p style="margin:0 0 16px;font-size:18px"><strong>${escapeHtml(locationLabel)}</strong></p>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
        <tr><td style="color:#5d6673">IP</td><td>${escapeHtml(clientIp || "—")}</td></tr>
        <tr><td style="color:#5d6673">Time</td><td>${escapeHtml(visit.timestamp || "")}</td></tr>
        <tr><td style="color:#5d6673">Page</td><td>${escapeHtml(visit.pageUrl || "—")}</td></tr>
        <tr><td style="color:#5d6673">Referrer</td><td>${escapeHtml(visit.referrer || "(direct / none)")}</td></tr>
        <tr><td style="color:#5d6673">Device</td><td>${escapeHtml(visit.userAgent || "—")}</td></tr>
      </table>
    </div>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("visit-notify: Resend error", res.status, detail);
      return { statusCode: 502, body: "Email send failed" };
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("visit-notify: send failed", err);
    return { statusCode: 502, body: "Email send failed" };
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
