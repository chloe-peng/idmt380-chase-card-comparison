# Card Match: Build Spec

A working hi-fi prototype of a gamified version of Chase's "compare credit cards" page, built for **IDMT380 (UX Gamification)**. It's optimized for laptop screens (1440 × 1024 frames) and will be launched online as a website.

- **Figma file:** `8s1lsG5ifIzrQirx5wyU7j` (IDMT380 | Gamification)
- **Data:** `data/cards.json` (6 cards, researched 2026-11-23) and `data/scoring.json` (weights and guardrails)
- **Stack:** plain HTML + CSS + JavaScript, no framework. **Each step is its own page** (see section 2b). Hosted free (Netlify Drop or GitHub Pages).

---

## 1. Course context and gamification goals

This is for a gamification course, so the prototype has to visibly **turn a dull comparison task into a game with a clear win state**, not just restyle a table. Every screen should map to at least one gamification element and have at least one purposeful microinteraction.

| Game element | Where it lives | What it does for the user |
|---|---|---|
| Clear goal / win state | Start screen ("leave with one pick"), Best Fit | Gives the session a finish line |
| Progress and levels | 5-step stepper | Shows progress; each completed step "levels up" with a check |
| Meaningful choices with feedback | Status, Priorities | Every selection gets instant visual feedback |
| Visible consequences | "Cards in play" counter (6 → n) | Hard filters visibly knock cards out as the user answers |
| Reveal / reward | Shortlist | Top 3 revealed one at a time, with "Matched on" tags as earned reasons |
| Head-to-head challenge | Compare (VS, Round 1 of 2 → 2 of 2) | Bracket format; the user decides who advances |
| Achievement | Best Fit "Decision made" badge | Marks completion |
| Celebration | "Save my pick" | Confetti/burst microinteraction (no data saved) |

### Microinteractions (build in the polish phase)

1. **Selection cards and radio options:** a small scale-up on hover; on select, a border color change, a check pop-in (scale 0 → 1.1 → 1) and a light press-down on click.
2. **Stepper:** the connecting line fills left to right when a step completes, and the number morphs into a check.
3. **Cards in play counter:** when a hard filter removes cards, the number ticks down and the removed card chips fade or slide out.
4. **Dropdown reveal (Step 1):** selecting "Yes, I do" slides the dropdown in (height and opacity), and focus moves to it.
5. **Continue button:** disabled (muted) until the screen's required input is done, then it activates with a subtle pulse.
6. **Shortlist reveal:** the three cards enter in sequence (#1, #2, #3) with a short stagger; the "Matched on" tags pop in after each card.
7. **Compare:** "Better for you" badges pop in row by row. On "Keep this one", the losing card slides out or fades and the winner moves to Card A for the next round. The round chip updates.
8. **Best Fit:** the "Decision made" badge stamps in; the card art gets a light tilt/shine on hover.
9. **Save my pick:** confetti burst and the button label changes to "Saved! 🎉" for about 2 seconds. Nothing is stored.
10. **Respect `prefers-reduced-motion`:** replace motion with simple fades.

---

## 2. Layout rules (apply to every step screen)

The Figma frames aren't perfectly aligned. The build normalizes them (tokens in `css/styles.css` `:root`):

- **Header:** "Card Match · a student concept" on the left, with a bottom rule. It's the same on every screen.
- **Stepper:** the same y-position on every screen.
- **Gap from stepper to the subheading row:** identical on every screen (`--gap-stepper-subhead`, 48px).
- **Subheading row:** the **Back button sits top-left on the same line as the "Step N: Name" subheading.** The subheading stays centered.
  - On Step 1, Back returns to the Start screen. On Steps 2–5, it goes to the previous step with answers preserved.
  - In Compare Round 2, Back returns to Round 1.
- **H1 → body text gap and body → content gap:** fixed tokens, the same on every screen.
- **Continue button:** in the **same fixed position at the bottom** on every screen. It's centered, in a fixed footer area (with the disclaimer under it) so the content never pushes it around; content scrolls behind a white fade.
  - On Compare screens, the "Keep this one" buttons do the job of Continue and the Continue slot stays empty.
  - On Best Fit, the slot holds "Save my pick" and "Apply now".
- **Content width:** 980px max, centered.

## 2b. Pages, state and refresh

Each step is its own HTML page, so the browser's Back/Forward and refresh work with no errors:

| Page | Step |
|---|---|
| `index.html` | Start |
| `status.html` | 1 Status |
| `priorities.html` | 2 Priorities |
| `shortlist.html` | 3 Shortlist |
| `compare.html` | 4 Compare (both rounds; round kept in storage) |
| `best-fit.html` | 5 Best Fit |

- **Answers** persist in `sessionStorage` (`cardmatch:answers:v1`, via `js/scoring.js`), saved on every click.
- **Progress** (furthest step reached) persists in `sessionStorage` (`cardmatch:progress:v1`, via `js/app.js`).
- **Guard:** every page checks on load. Opening a step you haven't reached (e.g. a deep link in a new tab) or Step 2+ without a finished Step 1 redirects with `location.replace` to the furthest valid page. Pages restored from the browser's back-forward cache reload so they never show stale state.
- **Start over** clears both keys and returns to `index.html`.
- **Data loading:** pages read `js/data.js`, generated from `data/*.json` by `node tools/build-data.js`, so the site also works when opened straight from the folder (no local server needed). Re-run it after editing the JSON.
- Shared shell: `css/styles.css` + `js/app.js` (stepper, Back, Continue, guard). Per-page logic: `js/pages/<page>.js`.

---

## 3. Screens and states

0. **Start:** eyebrow text, H1, body text, and a Start button. ✅ Built
1. **Step 1, Status:** ✅ Built. "Do you already have a Chase card?" with two option cards: "No, I don't" and "Yes, I do".
   - When "Yes, I do" is selected, a **"What card do you have?" dropdown slides in under the Yes card** (Figma node 29:722). It lists **only the 6 project cards** from `cards.json` (with a mini card-art swatch); "Another Chase card" is kept in `ownedCardOptions` for the scoring engine/tests but is not shown.
   - Option cards: hover lifts the card (shadow + slight scale, icon tilts); pressing presses down; selected = primary-blue ring, light tint and a check that pops in; the unchosen card recedes slightly.
   - Continue is enabled when "No" is selected, or when "Yes" is selected and a card is chosen. Focus moves to the dropdown when it appears; full keyboard support (arrows, Home/End, Enter, Esc, type-ahead). The list opens downward, or upward on short screens (1280 × 800, where the cards also compact).
   - ✅ Built 2026-11-23 (`status.html`, `js/pages/status.js`, Step 1 block in `css/styles.css`).
2. **Step 2, Priorities:** four single-choice questions from `scoring.json` (step 2), numbered 01–04. Any can be skipped; clicking a selected answer again clears it. A "cards in play" chip counts down live as the fee filter removes cards (hover shows which and why). ✅ Built
3. **Step 3, Shortlist:** "Your top 3 matches", **at a glance only** (no choices on this screen). ✅ Built 2026-11-23 (`shortlist.html`, `js/pages/shortlist.js`).
   - Lede: "Here are your top 3 at a glance, matched against each card's features."
   - Runs `S.score(answers)`; shows notices in a blue banner, then deals the 3 cards in with a stagger, tags popping in after each. #1 gets a "Best match" ribbon.
   - **"Up next" bar** under the cards (3 → 1 icon): "compare these head-to-head and narrow them down to your best fit. Hit Continue when you're ready." It fades in when the reveal ends; at the same time Continue unlocks with a short pulse, so users aren't left wondering what to do.
   - **"Why these aren't a match"** section lists the other 3 cards with mini art and a plain reason: the fee filter ("Has a $795 annual fee, and you'd rather not pay one"), the owned card, or a scored reason (no rewards for a rewards goal, needs good–excellent credit when building credit, a fee with Q4 skipped, a starter card when you already have Chase, else "Matched fewer of your answers").
   - The annual fee shows only when a card has one. On short screens (≤ 860px tall) the art sits beside the name and the tagline hides.
4. **Step 4, Compare:** ✅ Built 2026-11-23 with **all 3 shortlisted cards side by side** (approved by Chloe 2026-11-23) (`compare.html`, `js/pages/compare.js`). The two-round bracket stays a fallback if 1280-wide screens matter.
   - Layout: a comparison table, with row labels on the left (148px) and one column per card styled as a card. The header holds the card image beside the name and a live "Better in N of 5" count. Rows:
     - Annual fee
     - Rewards on [your top category], hidden when Q2 is skipped or "A bit of everything", since it would repeat the next row
     - Rewards on everything else
     - APR, or Intro APR in intro mode
     - Foreign transaction fee, with an "unconfirmed" tag for `needsCheck`

     `?` tooltips explain annual fee, APR and foreign transaction fee.
   - **Better for you:** a green check plus a light green cell tint, with one legend above the table. Recalculated among the cards still in, using the engine's pairwise `compare()`: a card wins a row if it beats or ties every other remaining card and beats at least one.
   - **Narrowing down:** "Remove this one" under each column. A removed column greys out with a red "Removed" stamp and its button becomes "Bring it back". With 2 removed, the last card gets a blue outline and a "★ Your pick" button, and Continue unlocks with a pulse. The status pill reads "Remove 2 cards to find your best fit", then "1 more to go", then "Your best fit: X. Hit Continue to confirm."
   - Storage: `cardmatch:compare:v1` = `{ top3, removed: [ids] }` via `CM.loadPick` / `CM.savePick`; `CM.finalPick(top3Ids)` returns the card left (Best Fit reads it). Reset if the shortlist changes; Start over clears it.
   - Fit: at 1440×1024 everything, including the remove buttons, sits above Continue. At 1280×800 the buttons need a short scroll.
5. **Step 5, Best Fit:** ✅ Built 2026-11-23 (`best-fit.html`, `js/pages/best-fit.js`). Shows the card left on Compare (`CM.finalPick`). Opening it without a pick (deep link, or changed answers) redirects to Compare.
   - Stepper shows all 5 steps checked. A green **"Decision made"** badge stamps in under the lede, with a **welcome confetti burst** from the badge plus two side cannons (skipped for `prefers-reduced-motion`; fires on each visit to the page). For "No Chase card" users, the lede adds "A great place to start."
   - **Panel:** the left side has "Your match" and the large card image (light 3D tilt + shine on hover), with "You picked it over X and Y." The right side has the card family, name, tagline, then three key facts:
     - Annual fee
     - Rewards on your top category (or Rewards)
     - Intro APR or APR

     Below the facts sit the "Matched on" checklist and **Good to know**: the engine's cautions for this card, plus a standard line ("Variable APR applies after any intro period… approval isn't guaranteed").
   - **Footer slot** (where Continue sits on other steps):
     - **Save my pick** (outline): a confetti burst, and the label changes to "Saved! 🎉" for 2s. Nothing is stored.
     - **Apply now** (primary): opens the card's `productUrl` on chase.com in a new tab.
     - **Start over** link: clears all state and returns to Start.
   - Fit: everything sits above the footer at 1440×1024. At 1280×800 "Good to know" needs a short scroll.

---

## 4. Logic

### Hard filters (from Q4, annual fee)

- **"No fee, please"** removes Sapphire Preferred and Sapphire Reserve. This leaves 4 cards, so a top 3 is still possible.
- **"Small fee is fine, if it's worth it"** removes Sapphire Reserve.
- **"Higher fee is fine for premium perks"** removes nothing.
- **Owned card:** the card the user already has (from Step 1) is removed, since they want "something new".

### Weighted scoring

**Source of truth: `data/scoring.json`** (weights, filters, tags, guardrails), read by the generic engine `js/scoring.js`. Change weights there, then run `node tests/scoring.test.js`.

Each answer adds points to the cards that fit it. Positive points carry a **tag** that becomes a "Matched on" chip. Skipped questions add nothing. Negative points (guardrails) never create a tag.

| Question | Answer | Points (tag) |
|---|---|---|
| Q1 Main goal | Build credit | Rise +4 ("Build credit"), Freedom Unlimited +1 ("Simple flat cash back") |
| | Cash back | Freedom Unlimited +3, Freedom Flex +3, Rise +2 ("Cash back") |
| | Travel rewards | Sapphire Preferred +4, Sapphire Reserve +4 ("Travel rewards"); Freedom Unlimited +1, Freedom Flex +1 ("5% on Chase Travel") |
| | Paying off a big purchase | Slate +4, Freedom Unlimited +2, Freedom Flex +2 ("0% intro APR for N months") |
| Q2 Spend most | Dining | Freedom Unlimited, Freedom Flex, Sapphire Preferred, Sapphire Reserve +2 each ("Dining rewards") |
| | Groceries | Sapphire Preferred +2, Freedom Flex +1, Freedom Unlimited +1 ("Grocery rewards") |
| | Travel | Sapphire Reserve +3, Sapphire Preferred +2 ("Travel rewards") |
| | A bit of everything | Freedom Unlimited +2, Rise +2, Freedom Flex +1 ("Everyday spend") |
| Q3 Pay in full | Always | Sapphire Preferred, Sapphire Reserve, Freedom Flex +1 each ("Great if you pay in full") |
| | Sometimes | Freedom Unlimited +1, Slate +1 ("0% intro APR") |
| | Rarely / not sure | Slate +3, Freedom Unlimited +1, Freedom Flex +1 ("0% intro APR"); Sapphire Preferred −1, Sapphire Reserve −3 |
| Q4 Annual fee | Small fee | Sapphire Preferred +1 ("Fee fits your budget") |
| | Higher fee | Sapphire Reserve +2 ("Premium perks"), Sapphire Preferred +1 ("Fee fits your budget") |
| Owned card (Step 1) | Rise | Freedom Unlimited +2 ("Next step up from Rise") |
| | Freedom Unlimited / Flex / Rise | Sapphire Preferred +2 ("Pairs with your Freedom card") |
| | Sapphire Preferred / Reserve | Freedom Unlimited +2, Freedom Flex +2 ("Pairs with your Sapphire card") |
| | Another Chase card | Nothing removed, no points |

Also on the score:
- **No Chase card:** tailors the copy only (beginner-friendly wording); scores are unchanged.
- **Fixed-fact tags** (display only, no points): "No annual fee" (fee = $0) and "No foreign transaction fees" (only if not in `needsCheck`). They fill leftover chip slots, and rank higher when relevant: "No annual fee" when Q4 = No fee, "No foreign transaction fees" when Q1 or Q2 = Travel.

### Guardrails

- **Penalties:** Build credit → Sapphire Preferred −3, Sapphire Reserve −4 (need good–excellent credit). Q4 skipped → Sapphire Reserve −2.
- **Can't be #1** (still allowed on the shortlist): Sapphire Reserve unless Q4 = Higher fee; Sapphire Reserve when Q3 = Rarely; any Sapphire when Q1 = Build credit.
- **Must be on the shortlist** (if still in play): Rise for Build credit; Slate for Big purchase; at least one Sapphire for Travel goal; at least one 0% intro APR card for Rarely. The required card replaces the lowest non-anchored card.
- **Pool floor:** filters can remove at most 3 cards, so 3 always remain; the engine also refuses to drop below 3 if the data changes.
- **Bad or stale input:** unknown answer ids are treated as skipped; "No" clears any owned card; "Yes" without a card counts as Step 1 incomplete; stored answers from another `schemaVersion` are discarded.
- **Notices** (shortlist banner): Travel + No fee, Travel spend + No fee, Build credit + a fee, and all skipped.
- **Cautions** (per card, for "Good to know"): carrying a balance on a card with no intro APR, Sapphire approval odds when building credit, the $795 fee, Sapphire Preferred's 3x being online grocery only, Freedom Flex's quarterly activation, and unconfirmed (`needsCheck`) fields.

### Answer storage

Answers are saved to `sessionStorage` (key `cardmatch:answers:v1`, in-memory fallback) on every selection, so Back and refresh keep them. "Start over" clears them. "Save my pick" still stores nothing.

### Test results (2026-11-23)

`tests/scoring.test.js` walks all **3,200 paths** (8 Step 1 states × 5 × 5 × 4 × 4) and checks every guardrail plus 9 personas and edge cases. All pass. #1 counts (all paths / no Chase card): Freedom Unlimited 1462/142, Sapphire Preferred 604/61, Rise 420/72, Freedom Flex 318/33, Slate 295/65, Sapphire Reserve 101/27. **Every card can win.**

### Ranking

- **Tie-breaks:** lower annual fee first, then this fixed order: Freedom Unlimited, Sapphire Preferred, Freedom Flex, Rise, Slate, Sapphire Reserve.
- **All questions skipped:** the fee tie-break is skipped, so the default top 3 is Freedom Unlimited, Sapphire Preferred, Freedom Flex, with the filters still applied.
- Show at most 3 tags per card, highest-weight first.

### "Better for you" badges (Compare)

- **Annual fee:** lower wins.
- **Top category:** which earn rate shows depends on the user's Q2 answer; if Q2 was skipped, it uses `everything`. Higher `value` wins, counting points at the base 1¢ each (Points Boost is not counted). A `null` value (Slate, no rewards) always loses.
- **Everything else:** higher `everything.value` wins.
- **APR:** if Q1 is "Paying off a big purchase" or Q3 is "Rarely", the longer intro APR wins and the row shows the intro label. Otherwise the lower `apr.min` wins.
- **Foreign transaction fee:** lower wins. Freedom Unlimited, Freedom Flex and Slate are 3% (confirmed by Chloe 2026-11-23), so no "unconfirmed" marker shows. The marker still appears automatically for any field left in a card's `needsCheck`.
- **Ties:** no badge on either card.
- Implemented as `compare(idA, idB, answers)` in `js/scoring.js`.

---

## 5. Copy fixes from the wireframes

- Step 2 question numbers should be 01, 02, 03, 04.
- Step 2 body text: "Pick one answer for each question. Not sure? Skip it, or click your answer again to clear it."
- Step 3 subtitle: "We matched your answers against each card's features."
- The second Compare screen should read "Round 2 of 2".

## 6. Branding and disclaimer (live site)

- Header: the text mark **"Card Match · a student concept"** on the left and the **Chase logo** on the right (`img/chase-logo.webp`, 24px tall, a bit shorter than the wordmark; added by Chloe 2026-11-23). The footer disclaimer still states the site isn't affiliated with Chase.
- Footer line (under Continue, every page): "Student project for IDMT380. Not affiliated with or endorsed by JPMorgan Chase. Card details as of Nov 2026."
- Card art: **real card images** (added by Chloe 2026-11-23, her call for the class project; the footer disclaimer covers non-affiliation). Each card's `image` field in `data/cards.json` points to a PNG in `img/cards/`. If an image is missing or fails to load, the shared helper `CM.cardArt(card)` (`js/app.js`) falls back to a CSS-generated card from `art.base` / `art.accent`.
- To swap an image: replace the file in `img/cards/` (or change the `image` path), then re-run `node tools/build-data.js`.
- Selected options use the Figma primary blue (border + light blue tint), applied consistently.

## 7. Build phases

| # | Phase | Status |
|---|---|---|
| 1 | Card research → `data/cards.json` | ✅ Done 2026-11-23 |
| 2 | `data/scoring.json` + `js/scoring.js`, plus `tests/scoring.test.js` (every card can win) | ✅ Done 2026-11-23 |
| 3 | Shell: header, stepper, subheading/Back row, fixed Continue, spacing tokens, per-page guard | ✅ Done 2026-11-23 (built with Start + Step 2) |
| 4 | Screens: Start ✅ → Status ✅ → Priorities ✅ → Shortlist ✅ → Compare ✅ (3-up) → Best Fit ✅ | ✅ Done 2026-11-23 |
| 5 | Microinteractions (section 1) | Mostly in: option hover/press/check pop, dropdown slide-in, shortlist deal-in + tag pops, Continue ready pulse, Compare check pops + removed stamp, Decision made stamp, card tilt/shine, Save confetti. ☐ Left: stepper number-to-check morph |
| 6 | QA in browser at 1440 and 1280 widths, then deploy | QA ✅ 2026-11-23: full click-through (No and Yes paths) at 1440×1024 and 1280×800 over a local web server, with refresh, browser Back/Forward, Back links, Start over and deep-link guards; all card images load, no console or HTTP errors (added an inline tab icon to fix the favicon 404). Not built for phones: Compare overflows at 390px wide. ☐ Deploy |

**To save credits:** start a new chat for each phase. Point the new chat at this spec, and send one Figma frame link per screen.
