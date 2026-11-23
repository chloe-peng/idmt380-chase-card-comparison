/* Step 3: Shortlist. Runs the scoring engine and reveals the top 3 "at a glance".
   Narrowing down (removing cards) happens on Compare. */
(function () {
  "use strict";
  var CM = window.CM;
  var esc = CM.esc;
  var result = CM.S.score(CM.S.loadAnswers());
  var a = result.answers;
  var byId = {};
  CM.cards.cards.forEach(function (c) { byId[c.id] = c; });
  var topIds = result.top3.map(function (m) { return m.id; });
  var short = function (c) { return c.name.replace(/^Chase /, ""); };

  // ---- notices (e.g. travel goal + no-fee filter) ----
  var notices = document.getElementById("notices");
  if (result.notices.length) {
    notices.hidden = false;
    notices.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5M10 6.2v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '<div>' + result.notices.map(function (n) { return "<p>" + esc(n) + "</p>"; }).join("") + "</div>";
  }

  // ---- the three cards ----
  var list = document.getElementById("shortlist");
  list.innerHTML = result.top3.map(function (m, i) {
    var c = m.card;
    return '<li class="match' + (i === 0 ? " match--top" : "") + '" data-id="' + c.id + '" style="--i:' + i + '">' +
      (i === 0 ? '<span class="match__ribbon">Best match</span>' : "") +
      '<span class="match__rank" aria-label="Rank ' + m.rank + '">0' + m.rank + '</span>' +
      '<div class="match__head">' +
        CM.cardArt(c, "match__art") +
        '<h2 class="match__name">' + esc(c.name) + '</h2>' +
        '<p class="match__tagline">' + esc(c.tagline) + '</p>' +
        (c.annualFee ? '<p class="match__fee">$' + c.annualFee + ' annual fee</p>' : '') +
      '</div>' +
      (m.tags.length
        ? '<p class="match__matched">Matched on</p><ul class="tags">' +
          m.tags.map(function (t, k) { return '<li class="tag" style="--k:' + k + '">' + esc(t.label) + '</li>'; }).join("") + '</ul>'
        : '<p class="match__matched">A solid all-round pick</p>') +
      '</li>';
  }).join("");

  // ---- why the other three aren't a match ----
  var feeWanted = { none: "you’d rather not pay one", small: "it’s more than the small fee you’re open to" };
  function filterReason(r) {
    var c = byId[r.id];
    if (r.reason === "You already have this card") return "You already have this card, and you’re looking for something new.";
    if (a.fee && feeWanted[a.fee]) return "Has a $" + c.annualFee + " annual fee, and " + feeWanted[a.fee] + ".";
    return r.reason + ".";
  }
  function lowerReason(id) {
    var c = byId[id];
    if (!c.rewardType && (a.goal === "cash-back" || a.goal === "travel")) return "Doesn’t earn rewards, and rewards are your main goal.";
    if (c.creditLevel === "good-excellent" && a.goal === "build-credit") return "Usually needs good to excellent credit, so it’s not a starter card.";
    if (c.annualFee > 0 && !a.fee) return "Has a $" + c.annualFee + " annual fee, which is hard to justify without knowing your budget.";
    if (c.creditLevel === "new" && a.hasCard === "yes") return "Built for people new to credit, and you already have a Chase card.";
    if (!a.goal && !a.spend && !a.payFull && !a.fee) return "A narrower pick. Answer a few questions in Step 2 to see if it suits you.";
    return "Matched fewer of your answers than your top 3.";
  }
  var whyItems = result.removed.map(function (r) { return { id: r.id, text: filterReason(r) }; });
  result.ranked.forEach(function (r) {
    if (topIds.indexOf(r.id) === -1 && !whyItems.some(function (w) { return w.id === r.id; })) whyItems.push({ id: r.id, text: lowerReason(r.id) });
  });
  if (whyItems.length) {
    document.getElementById("why-not").hidden = false;
    document.getElementById("why-not-list").innerHTML = whyItems.map(function (w) {
      var c = byId[w.id];
      return '<li class="why-not__item">' + CM.cardArt(c, "why-not__art") +
        '<span><strong>' + esc(short(c)) + '</strong><span class="why-not__text">' + esc(w.text) + '</span></span></li>';
    }).join("");
  }

  // Continue unlocks (with a pulse) once the last card has been dealt in.
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(function () {
    CM.setContinueEnabled(true);
    var btn = document.querySelector("[data-continue]");
    btn.classList.add("is-ready");
    document.getElementById("next-up").classList.add("is-in");
  }, reduce ? 0 : 1100);
})();
