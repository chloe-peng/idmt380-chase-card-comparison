/* Step 4: Compare. All 3 shortlisted cards side by side; the user removes cards
   until one is left. "Better for you" badges are recalculated among the cards still in. */
(function () {
  "use strict";
  var CM = window.CM;
  var esc = CM.esc;
  var answers = CM.S.loadAnswers();
  var result = CM.S.score(answers);
  var top = result.top3.map(function (m) { return m.card; });
  var ids = top.map(function (c) { return c.id; });
  var removed = CM.loadPick(ids).removed;
  var short = function (c) { return c.name.replace(/^Chase /, ""); };

  // Pairwise rows from the engine: pair[a][b] = S.compare(a, b)
  var pair = {};
  ids.forEach(function (x) {
    pair[x] = {};
    ids.forEach(function (y) { if (x !== y) pair[x][y] = CM.S.compare(x, y, answers); });
  });
  var base = pair[ids[0]][ids[1]];
  var CAT = { dining: "dining", groceries: "groceries", travel: "travel" };
  var rows = base.map(function (r, i) {
    var title = r.title;
    if (r.row === "topCategory") title = CAT[r.category] ? "Rewards on " + CAT[r.category] : null; // skipped/"a bit of everything" = same as next row
    return { i: i, key: r.row, title: title };
  }).filter(function (r) { return r.title; });
  var HELP = {
    apr: "The yearly interest rate if you carry a balance.",
    foreignTxFee: "A fee on purchases made in another currency, e.g. when traveling abroad.",
    annualFee: "What the card costs per year just to have it."
  };

  function value(id, rowIndex) {
    var other = ids.find(function (y) { return y !== id; });
    return pair[id][other][rowIndex];
  }
  // A card is "better for you" on a row if it beats or ties every other card still in,
  // and beats at least one of them.
  function best(id, rowIndex, active) {
    if (active.length < 2 || active.indexOf(id) === -1) return false;
    var beatOne = false;
    for (var k = 0; k < active.length; k++) {
      var y = active[k];
      if (y === id) continue;
      var w = pair[id][y][rowIndex].winner;
      if (w === "b") return false;
      if (w === "a") beatOne = true;
    }
    return beatOne;
  }

  // ---- render the table (row-major grid; columns styled as cards) ----
  var table = document.getElementById("compare");
  var html = '<div class="cmp-row cmp-row--head" role="row"><div class="cmp-label" role="columnheader"><span class="sr-only">Feature</span></div>' +
    top.map(function (c, k) {
      return '<div class="cmp-cell cmp-head" role="columnheader" data-col="' + c.id + '" style="--k:' + k + '">' +
        '<span class="match__stamp" aria-hidden="true">Removed</span>' +
        '<span class="cmp-head__rank">0' + (k + 1) + '</span>' +
        CM.cardArt(c, "cmp-head__art") +
        '<span class="cmp-head__text"><span class="cmp-head__name">' + esc(c.name) + '</span>' +
        '<span class="cmp-head__wins" data-wins></span></span>' +
        '</div>';
    }).join("") + '</div>';
  rows.forEach(function (r) {
    html += '<div class="cmp-row" role="row"><div class="cmp-label" role="rowheader">' + esc(r.title) +
      (HELP[r.key] ? '<span class="cmp-help" tabindex="0" aria-label="' + esc(HELP[r.key]) + '" data-tip="' + esc(HELP[r.key]) + '">?</span>' : "") + '</div>' +
      top.map(function (c) {
        var v = value(c.id, r.i);
        var unconfirmed = v.unconfirmed && v.unconfirmed.a;
        return '<div class="cmp-cell" role="cell" data-col="' + c.id + '" data-row="' + r.i + '">' +
          '<span class="cmp-value"><span class="better" aria-hidden="true" title="Better for you"><svg viewBox="0 0 16 16" width="10" height="10"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
            '<span>' + esc(v.a) + (unconfirmed ? '<span class="cmp-unconfirmed" title="Couldn’t confirm this on chase.com">unconfirmed</span>' : "") + '</span></span>' +
          '<span class="sr-only" data-sr-better></span>' +
          '</div>';
      }).join("") + '</div>';
  });
  html += '<div class="cmp-row cmp-row--foot" role="row"><div class="cmp-label" role="cell"></div>' +
    top.map(function (c) {
      return '<div class="cmp-cell cmp-foot" role="cell" data-col="' + c.id + '">' +
        '<button type="button" class="remove-btn" data-remove="' + c.id + '" aria-pressed="false">' +
          '<svg class="remove-btn__x" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '<svg class="remove-btn__undo" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3L2 6l3 3M2.5 6H10a4 4 0 010 8H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<svg class="remove-btn__star" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="currentColor"/></svg>' +
          '<span class="remove-btn__label">Remove this one</span><span class="sr-only"> (' + esc(c.name) + ')</span>' +
        '</button></div>';
    }).join("") + '</div>';
  table.innerHTML = html;

  // ---- state ----
  var pill = document.getElementById("pick-pill");
  function render() {
    var active = ids.filter(function (id) { return removed.indexOf(id) === -1; });
    var done = active.length === 1;

    ids.forEach(function (id) {
      var out = removed.indexOf(id) !== -1;
      var winner = done && !out;
      table.querySelectorAll('[data-col="' + id + '"]').forEach(function (el) {
        el.classList.toggle("is-removed", out);
        el.classList.toggle("is-pick", winner);
      });
      // badges among the cards still in
      var wins = 0;
      rows.forEach(function (r) {
        var cell = table.querySelector('[data-col="' + id + '"][data-row="' + r.i + '"]');
        var b = !out && best(id, r.i, active);
        if (b) wins++;
        cell.classList.toggle("is-better", b);
        cell.querySelector("[data-sr-better]").textContent = b ? " (better for you)" : "";
      });
      var winsEl = table.querySelector('[data-col="' + id + '"] [data-wins]');
      winsEl.textContent = out ? "Removed" : winner ? "Your best fit" : wins ? "Better in " + wins + " of " + rows.length : "Not ahead on any row";
      winsEl.classList.toggle("is-strong", !out && !winner && wins >= Math.ceil(rows.length / 2));

      var btn = table.querySelector('[data-remove="' + id + '"]');
      btn.setAttribute("aria-pressed", String(out));
      btn.disabled = winner;
      btn.classList.toggle("is-winner", winner);
      btn.querySelector(".remove-btn__label").textContent = out ? "Bring it back" : winner ? "Your pick" : "Remove this one";
    });

    if (removed.length === 0) pill.innerHTML = "Remove <strong>2 cards</strong> to find your best fit";
    else if (!done) pill.innerHTML = "<strong>1 more</strong> to go. Remove one of the last two.";
    else pill.innerHTML = "Your best fit: <strong>" + esc(short(top[ids.indexOf(active[0])])) + "</strong>. Hit Continue to confirm.";
    pill.classList.toggle("is-ready", done);

    CM.setContinueEnabled(done);
    var cont = document.querySelector("[data-continue]");
    cont.classList.toggle("is-ready", done);
  }

  table.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn || btn.disabled) return;
    var id = btn.dataset.remove;
    var at = removed.indexOf(id);
    if (at !== -1) removed.splice(at, 1);          // bring it back
    else if (removed.length < ids.length - 1) removed.push(id);
    CM.savePick(ids, removed);
    render();
  });

  CM.onContinue(function () { return CM.finalPick(ids) ? undefined : false; });
  render();
})();
