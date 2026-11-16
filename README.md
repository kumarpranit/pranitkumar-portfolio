# pranitkumar.net — portfolio site

Live at https://www.pranitkumar.net (Netlify site "kumarpranit").

- `index.html` — the full site, single self-contained file (photo inlined)
- `netlify/functions/visit-notify.js` — visitor-location email alert function (needs RESEND_API_KEY env var in Netlify)
- `content-brief.md` — verified content source of truth
- `netlify.toml` — publish root + functions directory so Git deploys register the function
