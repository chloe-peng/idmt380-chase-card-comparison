/*
 * Card Match scoring engine.
 * Generic: every weight, filter, guardrail and tag lives in data/scoring.json.
 * Works in the browser (window.CardMatchScoring) and in Node (module.exports).
 *
 * Usage (browser):
 *   const S = CardMatchScoring.create(cardsJson, scoringJson);
 *   S.saveAnswers({ hasCard: "no", goal: "travel" });   // merges + persists
 *   const result = S.score(S.loadAnswers());           // { top3, ranked, removed, inPlay, notices }
 *   const rows = S.compare("freedom-unlimited", "sapphire-preferred", answers);
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CardMatchScoring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ANSWER_KEYS = ["hasCard", "ownedCard", "goal", "spend", "payFull", "fee"];
  var PRIORITY_KEYS = ["goal", "spend", "payFull", "fee"];

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function fill(template, card) {
    return template.replace(/\{([\w.]+)\}/g, function (_, path) {
      var v = get(card, path);
      return v == null ? "" : String(v);
    });
  }

  // A `when` matches if every key matches. Values: id, [ids], or null (= skipped).
  function matches(when, a) {
    if (!when) return true;
    return Object.keys(when).every(function (k) {
      var want = when[k];
      var have = a[k] === undefined ? null : a[k];
      return Array.isArray(want) ? want.indexOf(have) !== -1 : want === have;
    });
  }

  function testCard(test, card) {
    if (!test) return true;
    var v = card[test.field];
    if ("equals" in test) return v === test.equals;
    if ("gte" in test) return typeof v === "number" && v >= test.gte;
    if (test.nonEmpty) return Array.isArray(v) && v.length > 0;
    return false;
  }

  function create(cardsJson, config) {
    var cards = cardsJson.cards;
    var byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });
    var ownedIds = cardsJson.ownedCardOptions.map(function (o) { return o.id; });
    var optionIds = {};
    config.questions.forEach(function (q) {
      optionIds[q.id] = q.options ? q.options.map(function (o) { return o.id; }) : ownedIds;
    });
    var memoryStore = null; // fallback when storage is unavailable

    // Guardrail: anything unknown is treated as skipped, and impossible combos are repaired.
    function sanitize(raw) {
      var a = {};
      raw = raw || {};
      ANSWER_KEYS.forEach(function (k) {
        var v = raw[k];
        a[k] = (typeof v === "string" && optionIds[k].indexOf(v) !== -1) ? v : null;
      });
      if (a.hasCard !== "yes") a.ownedCard = null;            // can't own a card if you said No
      if (a.hasCard === "yes" && !a.ownedCard) a.hasCard = null; // incomplete Step 1
      return a;
    }

    function anyPriorityAnswered(a) {
      return PRIORITY_KEYS.some(function (k) { return a[k] !== null; });
    }

    function pool(a) {
      var removed = {};
      config.filters.forEach(function (f) {
        if (f.removeOwnedCard) {
          if (a.ownedCard && byId[a.ownedCard] && !removed[a.ownedCard]) removed[a.ownedCard] = f.reason;
        } else if (matches(f.when, a)) {
          f.remove.forEach(function (id) { if (!removed[id]) removed[id] = f.reason; });
        }
      });
      var inPlay = cards.filter(function (c) { return !removed[c.id]; });
      // Guardrail: never fewer than a full shortlist. With 6 cards this can't trigger
      // (max removed = 2 fee + 1 owned), but protects future data edits.
      var size = config.ranking.shortlistSize;
      if (inPlay.length < size) {
        config.ranking.fixedOrder.forEach(function (id) {
          if (inPlay.length < size && removed[id] && id !== a.ownedCard) {
            delete removed[id];
            inPlay.push(byId[id]);
          }
        });
      }
      return {
        inPlay: inPlay,
        removed: Object.keys(removed).map(function (id) { return { id: id, reason: removed[id] }; })
      };
    }

    function applyPoints(list, a, table) {
      list.forEach(function (rule) {
        if (!matches(rule.when, a)) return;
        rule.points.forEach(function (p) {
          var row = table[p.card];
          if (!row) return; // card filtered out
          row.score += p.pts;
          row.trace.push({ rule: rule.id, pts: p.pts });
          if (p.tag && p.pts > 0) row.tagWeights[p.tag] = (row.tagWeights[p.tag] || 0) + p.pts;
        });
      });
    }

    function score(rawAnswers) {
      var a = sanitize(rawAnswers);
      var p = pool(a);
      var table = {};
      p.inPlay.forEach(function (c) { table[c.id] = { id: c.id, score: 0, tagWeights: {}, trace: [] }; });

      applyPoints(config.rules, a, table);
      applyPoints(config.guardrails.penalties, a, table);

      // Fixed-fact tags: display only, never change the score.
      var tagOrder = Object.keys(config.tags);
      config.fixedTags.forEach(function (ft) {
        var w = ft.weight;
        (ft.weightWhen || []).forEach(function (ww) { if (matches(ww.when, a)) w = Math.max(w, ww.weight); });
        p.inPlay.forEach(function (c) {
          if (!testCard(ft.test, c)) return;
          if (ft.skipIfNeedsCheck && c.needsCheck.indexOf(ft.test.field) !== -1) return;
          table[c.id].tagWeights[ft.tag] = Math.max(table[c.id].tagWeights[ft.tag] || 0, w);
        });
      });

      var useFee = anyPriorityAnswered(a);
      var order = config.ranking.fixedOrder;
      var ranked = Object.keys(table).map(function (id) { return table[id]; });
      ranked.sort(function (x, y) {
        if (y.score !== x.score) return y.score - x.score;
        if (useFee && byId[x.id].annualFee !== byId[y.id].annualFee) return byId[x.id].annualFee - byId[y.id].annualFee;
        return order.indexOf(x.id) - order.indexOf(y.id);
      });

      // Anchors: pull a required card into the shortlist, replacing the lowest
      // non-anchored card. The anchored card keeps its natural relative order.
      var size = config.ranking.shortlistSize;
      var top = ranked.slice(0, size).map(function (r) { return r.id; });
      var locked = {};
      config.guardrails.anchors.forEach(function (an) {
        if (!matches(an.when, a)) return;
        var needAll = an.mustInclude || [];
        var needAny = an.mustIncludeAnyOf || [];
        var targets = needAll.filter(function (id) { return table[id]; });
        if (needAny.length) {
          var present = needAny.filter(function (id) { return top.indexOf(id) !== -1; });
          if (present.length) present.forEach(function (id) { locked[id] = true; });
          else {
            var best = ranked.find(function (r) { return needAny.indexOf(r.id) !== -1; });
            if (best) targets.push(best.id);
          }
        }
        targets.forEach(function (id) {
          if (top.indexOf(id) === -1) {
            for (var i = top.length - 1; i >= 0; i--) {
              if (!locked[top[i]]) { top.splice(i, 1); break; }
            }
            top.push(id);
          }
          locked[id] = true;
        });
      });
      top.sort(function (x, y) { return ranked.indexOf(table[x]) - ranked.indexOf(table[y]); });

      // notFirst: a card may stay on the shortlist but can't hold #1 under these conditions.
      // It swaps down behind the best card that is allowed to be #1.
      var barred = {};
      (config.guardrails.notFirst || []).forEach(function (nf) {
        var active = matches(nf.when, a) && !(nf.unless && matches(nf.unless, a));
        if (active) nf.cards.forEach(function (id) { barred[id] = nf.id; });
      });
      if (barred[top[0]]) {
        var ok = top.findIndex(function (id) { return !barred[id]; });
        if (ok > 0) top.unshift(top.splice(ok, 1)[0]);
      }

      function decorate(id, i) {
        var c = byId[id], row = table[id];
        var tags = Object.keys(row.tagWeights)
          .sort(function (t1, t2) {
            return (row.tagWeights[t2] - row.tagWeights[t1]) || (tagOrder.indexOf(t1) - tagOrder.indexOf(t2));
          })
          .slice(0, config.ranking.maxTags)
          .map(function (t) { return { id: t, label: fill(config.tags[t].label, c), weight: row.tagWeights[t] }; });
        var cautions = config.cautions.filter(function (ca) {
          return matches(ca.when, a) && (!ca.cards || ca.cards.indexOf(id) !== -1) && testCard(ca.cardTest, c);
        }).map(function (ca) { return fill(ca.text, c); });
        return { rank: i + 1, id: id, card: c, score: row.score, tags: tags, cautions: cautions, trace: row.trace };
      }

      return {
        answers: a,
        top3: top.map(decorate),
        ranked: ranked.map(function (r) { return { id: r.id, score: r.score }; }),
        inPlay: p.inPlay.map(function (c) { return c.id; }),
        removed: p.removed,
        notices: config.notices.filter(function (n) { return matches(n.when, a); }).map(function (n) { return n.text; })
      };
    }

    // "Cards in play" counter for the UI (6 -> n) without running the full score.
    function cardsInPlay(rawAnswers) { return pool(sanitize(rawAnswers)); }

    // Compare rows with "Better for you" winners ("a", "b" or null for a tie).
    function compare(idA, idB, rawAnswers) {
      var a = sanitize(rawAnswers), A = byId[idA], B = byId[idB], cfg = config.compare;
      var cat = cfg.topCategoryFromSpend[a.spend || "_skipped"];
      var introMode = cfg.introAprMode.some(function (w) { return matches(w, a); });
      function lower(x, y) { return x === y ? null : (x < y ? "a" : "b"); }
      function higher(x, y) {
        if (x === y) return null;
        if (x === null) return "b";
        if (y === null) return "a";
        return x > y ? "a" : "b";
      }
      function months(c) { return c.introApr ? c.introApr.months : 0; }
      return [
        { row: "annualFee", title: "Annual fee", a: "$" + A.annualFee, b: "$" + B.annualFee, winner: lower(A.annualFee, B.annualFee) },
        { row: "topCategory", title: "Rewards on your top category", category: cat, a: A.earn[cat].label, b: B.earn[cat].label, winner: higher(A.earn[cat].value, B.earn[cat].value) },
        { row: "everything", title: "Rewards on everything else", a: A.earn.everything.label, b: B.earn.everything.label, winner: higher(A.earn.everything.value, B.earn.everything.value) },
        introMode
          ? { row: "apr", title: "Intro APR", mode: "intro", a: A.introApr ? A.introApr.label : "No intro APR", b: B.introApr ? B.introApr.label : "No intro APR", winner: higher(months(A), months(B)) }
          : { row: "apr", title: "APR", mode: "standard", a: A.apr.label, b: B.apr.label, winner: lower(A.apr.min, B.apr.min) },
        { row: "foreignTxFee", title: "Foreign transaction fee", a: A.foreignTxFee + "%", b: B.foreignTxFee + "%", winner: lower(A.foreignTxFee, B.foreignTxFee),
          unconfirmed: { a: A.needsCheck.indexOf("foreignTxFee") !== -1, b: B.needsCheck.indexOf("foreignTxFee") !== -1 } }
      ];
    }

    // ---- Answer storage (sessionStorage with in-memory fallback) ----
    function storage() {
      try {
        var s = typeof window !== "undefined" && window[config.storage.scope];
        if (!s) return null;
        s.setItem("__cm_test", "1"); s.removeItem("__cm_test");
        return s;
      } catch (e) { return null; }
    }
    function loadAnswers() {
      var raw = null;
      var s = storage();
      try { raw = s ? JSON.parse(s.getItem(config.storage.key)) : memoryStore; } catch (e) { raw = null; }
      if (!raw || raw.schemaVersion !== config.schemaVersion) return sanitize({});
      return sanitize(raw.answers);
    }
    function saveAnswers(partial) {
      var merged = Object.assign({}, loadAnswers(), partial || {});
      var clean = sanitize(merged);
      // Keep an in-progress "yes" so Step 1 can show the dropdown before a card is picked.
      if (merged.hasCard === "yes") clean.hasCard = "yes";
      var payload = { schemaVersion: config.schemaVersion, savedAt: new Date().toISOString(), answers: clean };
      var s = storage();
      try { if (s) s.setItem(config.storage.key, JSON.stringify(payload)); else memoryStore = payload; }
      catch (e) { memoryStore = payload; }
      return clean;
    }
    function clearAnswers() {
      memoryStore = null;
      var s = storage();
      try { if (s) s.removeItem(config.storage.key); } catch (e) { /* ignore */ }
    }
    function step1Complete(raw) {
      return raw && (raw.hasCard === "no" || (raw.hasCard === "yes" && ownedIds.indexOf(raw.ownedCard) !== -1));
    }

    return {
      score: score, compare: compare, cardsInPlay: cardsInPlay, sanitize: sanitize, step1Complete: step1Complete,
      loadAnswers: loadAnswers, saveAnswers: saveAnswers, clearAnswers: clearAnswers
    };
  }

  return { create: create, matches: matches };
});
