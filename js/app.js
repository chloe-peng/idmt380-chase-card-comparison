/*
 * Card Match shell: shared by every page.
 * - Each step is its own HTML page (data-step on <body>).
 * - Answers live in sessionStorage (via scoring.js), so Back and refresh keep them.
 * - Guards: opening a page you haven't reached yet (or without a finished Step 1)
 *   redirects to the furthest valid page instead of erroring.
 */
(function () {
  "use strict";

  var PAGES = ["index.html", "status.html", "priorities.html", "shortlist.html", "compare.html", "best-fit.html"];
  var STEPS = ["Status", "Priorities", "Shortlist", "Compare", "Best Fit"];
  var PROGRESS_KEY = "cardmatch:progress:v1";
  var PICK_KEY = "cardmatch:compare:v1"; // { top3: [ids], removed: [ids] } from Step 4

  var data = window.CM_DATA;
  var S = CardMatchScoring.create(data.cards, data.scoring);
  var step = Number(document.body.dataset.step || 0);

  // ---- progress (furthest step reached) ----
  function readProgress() {
    try { return JSON.parse(sessionStorage.getItem(PROGRESS_KEY)) || { reached: 0 }; }
    catch (e) { return { reached: 0 }; }
  }
  function writeProgress(p) {
    try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* private mode: in-page only */ }
  }
  function reach(n) {
    var p = readProgress();
    if (n > p.reached) { p.reached = n; writeProgress(p); }
  }
  function startOver() {
    S.clearAnswers();
    try { sessionStorage.removeItem(PROGRESS_KEY); sessionStorage.removeItem(PICK_KEY); } catch (e) { /* ignore */ }
    location.href = PAGES[0];
  }

  // ---- guard ----
  (function guard() {
    var reached = readProgress().reached;
    var answers = S.loadAnswers();
    var target = step;
    if (step > reached) target = reached;
    if (target >= 2 && !S.step1Complete(answers)) target = Math.min(target, 1);
    if (target !== step) location.replace(PAGES[target]);
  })();

  // Browser Back can restore a page from cache with stale state: re-render it.
  window.addEventListener("pageshow", function (e) { if (e.persisted) location.reload(); });

  // ---- stepper ----
  var CHECK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function renderStepper() {
    var el = document.getElementById("stepper");
    if (!el) return;
    el.innerHTML = STEPS.map(function (name, i) {
      var n = i + 1;
      var state = n < step ? "done" : n === step ? "current" : "upcoming";
      var dot = state === "done" ? CHECK : ("0" + n);
      return '<li class="stepper__item is-' + state + '"' + (state === "current" ? ' aria-current="step"' : "") + '>' +
        '<span class="stepper__dot">' + dot + '</span>' +
        '<span class="stepper__label">' + name + '</span></li>';
    }).join("");
  }

  // ---- back + continue ----
  function wireBack() {
    var back = document.querySelector("[data-back]");
    if (back) back.setAttribute("href", PAGES[Math.max(0, step - 1)]);
  }

  var continueHandler = null;
  function onContinue(fn) { continueHandler = fn; }
  function setContinueEnabled(on) {
    var btn = document.querySelector("[data-continue]");
    if (btn) btn.disabled = !on;
  }
  function goNext() {
    reach(step + 1);
    location.href = PAGES[step + 1];
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-continue]");
    if (btn && !btn.disabled) {
      if (continueHandler && continueHandler() === false) return;
      goNext();
    }
    if (e.target.closest("[data-start-over]")) { e.preventDefault(); startOver(); }
  });

  // ---- Step 4 choice: which of the top 3 the user removed (the one left is their pick) ----
  // Only valid while the shortlist is the same; changed answers = a new shortlist = start fresh.
  var pickMemory = null;
  function loadPick(top3Ids) {
    var p = pickMemory;
    try { p = JSON.parse(sessionStorage.getItem(PICK_KEY)) || pickMemory; } catch (e) { /* use memory */ }
    if (!p || !Array.isArray(p.top3) || p.top3.join() !== top3Ids.join() || !Array.isArray(p.removed)) return { top3: top3Ids, removed: [] };
    var removed = p.removed.filter(function (id) { return top3Ids.indexOf(id) !== -1; }).slice(0, top3Ids.length - 1);
    return { top3: top3Ids, removed: removed };
  }
  function savePick(top3Ids, removedIds) {
    pickMemory = { top3: top3Ids, removed: removedIds.slice() };
    try { sessionStorage.setItem(PICK_KEY, JSON.stringify(pickMemory)); } catch (e) { /* in-page only */ }
  }
  // The card left after removing all but one (null until then). Best Fit reads this.
  function finalPick(top3Ids) {
    var p = loadPick(top3Ids);
    var left = top3Ids.filter(function (id) { return p.removed.indexOf(id) === -1; });
    return left.length === 1 ? left[0] : null;
  }

  // ---- card art (shared by Shortlist, Compare, Best Fit) ----
  // Uses card.image from cards.json if set (e.g. "img/cards/slate.png"); otherwise a
  // CSS-generated card in the card's art colors. A broken image falls back to the CSS card.
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function cardArt(card, extraClass) {
    var style = "--art-base:" + card.art.base + ";--art-accent:" + card.art.accent;
    var img = card.image
      ? '<img class="card-art__img" src="' + esc(card.image) + '" alt="" onerror="this.parentNode.classList.remove(\'has-image\');this.remove()">'
      : "";
    return '<span class="card-art ' + (card.image ? "has-image " : "") + (extraClass || "") + '" style="' + style + '" role="img" aria-label="' + esc(card.name) + ' card art">' +
      '<span class="card-art__chip"></span><span class="card-art__family">' + esc(card.family) + '</span>' + img + '</span>';
  }

  renderStepper();
  wireBack();

  window.CM = {
    S: S, cards: data.cards, config: data.scoring, step: step, pages: PAGES,
    reach: reach, goNext: goNext, cardArt: cardArt, esc: esc, loadPick: loadPick, savePick: savePick, finalPick: finalPick, onContinue: onContinue, setContinueEnabled: setContinueEnabled, startOver: startOver
  };
})();
