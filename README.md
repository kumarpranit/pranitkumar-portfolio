# pranitkumar.net — portfolio site

Live at https://www.pranitkumar.net (Netlify site "kumarpranit"). Plain static HTML, no build step.

- `index.html` — home page (hero, selected work, experience, skills, education, writing, contact)
- `work/` — case-study pages (Fyxt AI products and four projects)
- `css/site.css` — shared styles for every page
- `js/site.js` — shared script (visitor notification beacon)
- `assets/pranit.jpg` — portrait, also used for link previews
- `netlify/functions/visit-notify.js` — visitor-location email alert function (needs RESEND_API_KEY env var in Netlify)
- `content-brief.md` — verified content source of truth
- `netlify.toml` — publish root + functions directory so Git deploys register the function
