# Fiscal Frontier

Global Markets dashboard has been removed for now (per request) — the site
is back to the static, no-backend version. Nothing lost: if you want it
back later, ask and it can be reinstated.

## Your profile photo isn't showing because it was never actually uploaded

`index.html` and `style.css` reference `images/profile.png` in three
places (nav avatar, hero card, About section), but only `index.html`,
`style.css` and `README.md` have ever been shared in this chat — no
`images` folder or photo file. That's the entire cause; the code itself
is correct.

To fix it:
1. Send the actual photo file (jpg/png).
2. It'll be placed at `images/profile.png` to match what the HTML already
   expects — or the HTML can be updated if you'd rather use a different
   filename/format.
3. When you deploy, make sure the `images` folder is uploaded to the
   server/GitHub repo alongside `index.html` and `style.css` — it has to
   physically exist at that path on the live site, not just locally.

## Second nav tab for specific research pieces

Set up as soon as you share the research write-ups you want featured
(the actual reports/notes — e.g. your Glenmark, Cipla, or backtesting
work) — pasted in, or as files. A tab of empty placeholder cards won't be
useful, so it's easiest to build once the real content is in hand.

## Earlier notes

- Founder photo at the top-right and About section
- Public email placeholders
- Public full-article sections linked from the Insights cards
- Public research pages for Equity Research, Portfolio Strategy and Quant/Backtesting
- Substack link (nav, homepage callout, footer): https://substack.com/@fiscalfrontier

Upload the `images` folder together with `index.html` and `style.css`.
