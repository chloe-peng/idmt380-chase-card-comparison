/* Step 2: Priorities. Questions come from data/scoring.json (step: 2). */
(function () {
  "use strict";
  var CM = window.CM;
  var questions = CM.config.questions.filter(function (q) { return q.step === 2; });
  var form = document.getElementById("priorities");
  var answers = CM.S.loadAnswers();

  form.innerHTML = questions.map(function (q) {
    return '<fieldset class="question">' +
      '<legend class="question__legend"><span class="question__num">' + q.number + '</span>' + q.prompt + '</legend>' +
      '<div class="options" style="--cols:' + q.options.length + '">' +
      q.options.map(function (o) {
        var id = q.id + "-" + o.id;
        return '<label class="option" for="' + id + '">' +
          '<input type="radio" id="' + id + '" name="' + q.id + '" value="' + o.id + '"' + (answers[q.id] === o.id ? " checked" : "") + '>' +
          '<span class="option__radio" aria-hidden="true"></span>' +
          '<span class="option__label">' + o.label + '</span></label>';
      }).join("") +
      '</div></fieldset>';
  }).join("");

  // Clicking the selected answer again clears it (= skip).
  form.addEventListener("click", function (e) {
    var input = e.target.closest("input[type=radio]");
    if (!input) return;
    var current = CM.S.loadAnswers()[input.name];
    if (current === input.value) {
      input.checked = false;
      save(input.name, null);
    }
  });
  form.addEventListener("change", function (e) {
    if (e.target.type === "radio") save(e.target.name, e.target.value);
  });

  function save(key, value) {
    var patch = {};
    patch[key] = value;
    CM.S.saveAnswers(patch);
    updateCounter();
  }

  // "Cards in play" counter: hard filters (fee, owned card) knock cards out live.
  var counter = document.getElementById("in-play");
  var total = CM.cards.cards.length;
  var last = null;
  function updateCounter() {
    var pool = CM.S.cardsInPlay(CM.S.loadAnswers());
    var n = pool.inPlay.length;
    counter.querySelector("[data-count]").textContent = n;
    counter.querySelector("[data-total]").textContent = total;
    counter.title = pool.removed.length
      ? "Out: " + pool.removed.map(function (r) {
          var c = CM.cards.cards.find(function (x) { return x.id === r.id; });
          return c.name + " (" + r.reason.toLowerCase() + ")";
        }).join(", ")
      : "All cards are still in play";
    if (last !== null && n !== last) {
      counter.classList.remove("is-bump");
      void counter.offsetWidth; // restart animation
      counter.classList.add("is-bump");
    }
    last = n;
  }
  updateCounter();

  CM.setContinueEnabled(true); // every question is skippable
})();
