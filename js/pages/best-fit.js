/* Step 5: Best Fit. Shows the card left standing on Compare, with why it matched,
   what to know, Save my pick (celebration only, nothing stored) and Apply now. */
(function () {
  "use strict";
  var CM = window.CM;
  var esc = CM.esc;
  var answers = CM.S.loadAnswers();
  var result = CM.S.score(answers);
  var ids = result.top3.map(function (m) { return m.id; });
  var pickId = CM.finalPick(ids);

  // Guard: no decision yet (deep link, or answers changed) -> back to Compare.
  if (!pickId) { location.replace(CM.pages[4]); return; }

  var match = result.top3.find(function (m) { return m.id === pickId; });
  var c = match.card;
  var others = result.top3.filter(function (m) { return m.id !== pickId; }).map(function (m) { return m.card.name.replace(/^Chase /, ""); });

  // The journey is complete: show Best Fit as done in the stepper too.
  var last = document.querySelector(".stepper__item:last-child");
  if (last) {
    last.classList.remove("is-current"); last.classList.add("is-done");
    last.querySelector(".stepper__dot").innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  var prev = document.querySelectorAll(".stepper__item")[3];
  if (prev) prev.classList.add("is-done");

  document.getElementById("bf-lede").textContent = answers.hasCard === "no"
    ? "Here’s the card that best matches what you told us. A great place to start."
    : "Here’s the card that best matches what you told us.";

  // ---- key facts ----
  var CAT = { dining: "dining", groceries: "groceries", travel: "travel" };
  var cat = CAT[answers.spend];
  var facts = [
    { k: "Annual fee", v: c.annualFee ? "$" + c.annualFee : "$0" },
    cat ? { k: "Rewards on " + cat, v: c.earn[cat].label } : { k: "Rewards", v: c.earn.everything.label },
    c.introApr ? { k: "Intro APR", v: c.introApr.label } : { k: "APR", v: c.apr.label }
  ];

  // ---- Good to know: card-specific cautions from the engine, then the standard line ----
  var notes = match.cautions.concat(["Variable APR applies after any intro period. Rewards terms and eligibility can change, and approval isn’t guaranteed."]);

  var CHECK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.getElementById("bestfit").innerHTML =
    '<div class="bf-visual">' +
      '<p class="bf-eyebrow">Your match</p>' +
      '<div class="bf-art-wrap" id="bf-art">' + CM.cardArt(c, "bf-art") + '</div>' +
      (others.length ? '<p class="bf-beat">You picked it over ' + esc(others.join(" and ")) + '.</p>' : '') +
    '</div>' +
    '<div class="bf-info">' +
      '<p class="bf-eyebrow">' + esc(c.family) + ' card</p>' +
      '<h2 class="bf-name">' + esc(c.name) + '</h2>' +
      '<p class="bf-tagline">' + esc(c.tagline) + '</p>' +
      '<dl class="bf-facts">' + facts.map(function (f) { return '<div><dt>' + esc(f.k) + '</dt><dd>' + esc(f.v) + '</dd></div>'; }).join("") + '</dl>' +
      (match.tags.length
        ? '<p class="bf-sub">Matched on</p><ul class="bf-matched">' + match.tags.map(function (t, k) {
            return '<li style="--k:' + k + '"><span class="bf-check">' + CHECK + '</span>' + esc(t.label) + '</li>';
          }).join("") + '</ul>'
        : '') +
      '<div class="bf-know"><p class="bf-know__title">Good to know</p><ul>' +
        notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join("") + '</ul></div>' +
    '</div>';

  // ---- Apply now: the card's public product page, new tab ----
  document.getElementById("apply").href = c.productUrl;

  // ---- light tilt + shine on the card art ----
  var wrap = document.getElementById("bf-art");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    wrap.addEventListener("mousemove", function (e) {
      var r = wrap.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      wrap.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
      wrap.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      wrap.style.setProperty("--shine", ((x + 0.5) * 100).toFixed(0) + "%");
    });
    wrap.addEventListener("mouseleave", function () {
      wrap.style.setProperty("--rx", "0deg"); wrap.style.setProperty("--ry", "0deg");
    });
  }

  // ---- Save my pick: celebration only (nothing is stored) ----
  var save = document.getElementById("save-pick");
  var label = save.querySelector("[data-label]");
  var timer = null;
  save.addEventListener("click", function () {
    label.textContent = "Saved!";
    save.classList.add("is-saved");
    clearTimeout(timer);
    timer = setTimeout(function () { label.textContent = "Save my pick"; save.classList.remove("is-saved"); }, 2000);
    if (!reduce) { var r = save.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 4, 70, 120, 220); }
  });

  // Welcome burst: when the "Decision made" badge stamps in, confetti pops from it
  // plus two side cannons. Skipped for prefers-reduced-motion.
  if (!reduce) {
    setTimeout(function () {
      var b = document.getElementById("decision").getBoundingClientRect();
      confetti(b.left + b.width / 2, b.top + b.height / 2, 90, 160, 260);
      confetti(0, window.innerHeight * 0.55, 45, 60, 420, -40);
      confetti(window.innerWidth, window.innerHeight * 0.55, 45, 60, 420, -140);
    }, 650);
  }

  // x, y: origin (viewport px); n: pieces; spread: cone width in degrees;
  // dist: max travel (px); aim: cone direction in degrees (-90 = straight up).
  function confetti(x, y, n, spread, dist, aim) {
    aim = aim === undefined ? -90 : aim;
    var colors = ["#0060F0", "#5FA8D3", "#1E9E52", "#F5B700", "#E4572E", "#7FB2E5"];
    var layer = document.createElement("div");
    layer.className = "confetti";
    layer.setAttribute("aria-hidden", "true");
    for (var i = 0; i < n; i++) {
      var p = document.createElement("span");
      var angle = (aim + (Math.random() - 0.5) * spread) * Math.PI / 180;
      var d = dist * (0.45 + Math.random() * 0.55);
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", (Math.cos(angle) * d).toFixed(0) + "px");
      p.style.setProperty("--dy", (Math.sin(angle) * d).toFixed(0) + "px");
      p.style.setProperty("--rot", (Math.random() * 720 - 360).toFixed(0) + "deg");
      p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";
      if (i % 3 === 0) p.style.borderRadius = "50%";
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 1600);
  }
})();
