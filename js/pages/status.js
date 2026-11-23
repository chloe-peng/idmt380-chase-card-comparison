/* Step 1: Status. "Yes, I do" reveals a dropdown of the 6 project cards. */
(function () {
  "use strict";
  var CM = window.CM;
  var form = document.getElementById("status");
  var reveal = document.getElementById("owned-field");
  var trigger = document.getElementById("owned-trigger");
  var list = document.getElementById("owned-list");
  var valueEl = document.getElementById("owned-value");
  var swatch = trigger.querySelector("[data-swatch]");

  // The 6 cards used in this project (data/cards.json), in lineup order.
  var cards = CM.cards.cards;

  function art(c) {
    return "linear-gradient(135deg, " + c.art.base + " 0%, " + c.art.base + " 55%, " + c.art.accent + " 140%)";
  }

  list.innerHTML = cards.map(function (c) {
    return '<li class="select__option" role="option" id="opt-' + c.id + '" data-id="' + c.id + '" aria-selected="false">' +
      '<span class="select__swatch" style="background:' + art(c) + '" aria-hidden="true"></span>' +
      '<span class="select__name">' + c.name + '</span>' +
      '<svg class="select__tick" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</li>';
  }).join("");
  var options = Array.prototype.slice.call(list.querySelectorAll(".select__option"));

  // ---- state ----
  // loadAnswers() drops an unfinished "yes" (no card yet), so read the raw value too
  // so a refresh mid-step keeps the dropdown open where the user left it.
  var answers = CM.S.loadAnswers();
  var hasCard = answers.hasCard || rawHasCard();
  var ownedCard = answers.ownedCard;

  function rawHasCard() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(CM.config.storage.key));
      return raw && raw.answers && raw.answers.hasCard === "yes" ? "yes" : null;
    } catch (e) { return null; }
  }

  function render(animate) {
    form.querySelectorAll("input[name=hasCard]").forEach(function (i) { i.checked = i.value === hasCard; });
    setReveal(hasCard === "yes", animate);

    var card = cards.find(function (c) { return c.id === ownedCard; });
    valueEl.textContent = card ? card.name : "Choose your card";
    valueEl.classList.toggle("is-placeholder", !card);
    swatch.style.background = card ? art(card) : "";
    swatch.classList.toggle("is-empty", !card);
    options.forEach(function (o) { o.setAttribute("aria-selected", String(o.dataset.id === ownedCard)); });

    CM.setContinueEnabled(hasCard === "no" || (hasCard === "yes" && !!card));
  }

  // ---- reveal (height + opacity) ----
  function setReveal(open, animate) {
    if (open === !reveal.hidden && !reveal.classList.contains("is-closing")) return;
    if (open) {
      reveal.hidden = false;
      reveal.classList.remove("is-closing");
      if (animate) {
        reveal.classList.add("is-entering");
        void reveal.offsetWidth;
        reveal.classList.remove("is-entering");
      }
    } else {
      closeList(false);
      if (!animate) { reveal.hidden = true; return; }
      reveal.classList.add("is-closing");
      setTimeout(function () {
        if (reveal.classList.contains("is-closing")) { reveal.hidden = true; reveal.classList.remove("is-closing"); }
      }, 260);
    }
  }

  // ---- option cards ----
  form.addEventListener("change", function (e) {
    if (e.target.name !== "hasCard") return;
    hasCard = e.target.value;
    if (hasCard === "no") ownedCard = null;
    CM.S.saveAnswers({ hasCard: hasCard, ownedCard: ownedCard });
    render(true);
    if (hasCard === "yes") {
      // Move focus to the dropdown once it has slid in, and bring it into view.
      setTimeout(function () {
        trigger.focus({ preventScroll: true });
        reveal.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 280);
    }
  });

  // ---- dropdown (listbox) ----
  var active = -1;
  function openList() {
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    // Open downward (over the footer, like any popover); flip up only if it would leave the window.
    var r = trigger.getBoundingClientRect();
    var below = window.innerHeight - r.bottom - 8, above = r.top - 8;
    list.classList.toggle("is-up", below < list.offsetHeight + 8 && above > below);
    var sel = options.findIndex(function (o) { return o.dataset.id === ownedCard; });
    setActive(sel === -1 ? 0 : sel);
    list.focus({ preventScroll: true });
    list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function closeList(refocus) {
    if (list.hidden) return;
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    list.removeAttribute("aria-activedescendant");
    if (refocus) trigger.focus();
  }
  function setActive(i) {
    active = Math.max(0, Math.min(options.length - 1, i));
    options.forEach(function (o, k) { o.classList.toggle("is-active", k === active); });
    list.setAttribute("aria-activedescendant", options[active].id);
    options[active].scrollIntoView({ block: "nearest" });
  }
  function choose(i) {
    ownedCard = options[i].dataset.id;
    CM.S.saveAnswers({ hasCard: "yes", ownedCard: ownedCard });
    closeList(true);
    render(false);
    trigger.classList.remove("is-picked"); void trigger.offsetWidth; trigger.classList.add("is-picked");
  }

  trigger.addEventListener("click", function () { list.hidden ? openList() : closeList(true); });
  trigger.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openList(); }
  });
  list.addEventListener("click", function (e) {
    var o = e.target.closest(".select__option");
    if (o) choose(options.indexOf(o));
  });
  list.addEventListener("mousemove", function (e) {
    var o = e.target.closest(".select__option");
    if (o && options.indexOf(o) !== active) setActive(options.indexOf(o));
  });
  list.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive(active + 1); break;
      case "ArrowUp": e.preventDefault(); setActive(active - 1); break;
      case "Home": e.preventDefault(); setActive(0); break;
      case "End": e.preventDefault(); setActive(options.length - 1); break;
      case "Enter": case " ": e.preventDefault(); choose(active); break;
      case "Escape": e.preventDefault(); closeList(true); break;
      case "Tab": closeList(false); break;
      default: // type-ahead on the part after "Chase "
        if (e.key.length === 1) {
          var k = e.key.toLowerCase();
          var hit = options.findIndex(function (o, i) {
            return i > active && o.textContent.replace(/^Chase\s+/, "").toLowerCase().indexOf(k) === 0;
          });
          if (hit === -1) hit = options.findIndex(function (o) { return o.textContent.replace(/^Chase\s+/, "").toLowerCase().indexOf(k) === 0; });
          if (hit !== -1) setActive(hit);
        }
    }
  });
  document.addEventListener("click", function (e) {
    if (!list.hidden && !e.target.closest("#owned-select")) closeList(false);
  });

  render(false);
})();
