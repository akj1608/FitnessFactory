(() => {
  const PLAN_START = "2026-11-15";
  const WATER_TARGET = 12;
  const HEIGHT_M = 1.65;
  const START_WEIGHT = 80;
  const STORAGE_KEY = "fit-reset-v2";

  const LABS = [
    {
      name: "HbA1c",
      value: "6.80%",
      meta: "Diabetes range (≥6.5). Avg sugar ~148 mg/dl over ~3 months.",
      level: "critical",
    },
    {
      name: "Fasting glucose",
      value: "167.8",
      meta: "Diabetes (≥126). Bring under 126, ideally under 110.",
      level: "critical",
    },
    {
      name: "Urine glucose",
      value: "1+",
      meta: "Sugar spilling into urine — blood sugar running high.",
      level: "critical",
    },
    {
      name: "ALT (SGPT)",
      value: "136",
      meta: "~2.7× high — fatty liver pattern.",
      level: "high",
    },
    {
      name: "GGT",
      value: "153",
      meta: "~3× high — fatty liver and/or alcohol. Alcohol = 0.",
      level: "high",
    },
    {
      name: "AST (SGOT)",
      value: "74",
      meta: "Elevated with ALT/GGT — liver inflammation.",
      level: "high",
    },
    {
      name: "Triglycerides",
      value: "160",
      meta: "Borderline high (want <150).",
      level: "high",
    },
    {
      name: "LDL",
      value: "116.9",
      meta: "Above optimal (<100).",
      level: "high",
    },
    {
      name: "Eosinophils / AEC",
      value: "15% / 1.47",
      meta: "Allergy / parasite screen with your doctor.",
      level: "high",
    },
  ];

  // Times in Asia/Calcutta local minutes from midnight
  const SCHEDULE = [
    { id: "wake", time: "06:30", title: "Wake + 500 ml water", detail: "Weigh yourself. Check fasting sugar. No sugar tea." },
    { id: "water7", time: "07:00", title: "Drink 1 glass water", detail: "~250–300 ml." },
    { id: "breakfast", time: "08:00", title: "Breakfast", detail: "Eggs / moong chilla / oats. Black coffee OK (no sugar)." },
    { id: "walkB", time: "08:20", title: "Walk after breakfast", detail: "10–15 minutes easy walk." },
    { id: "snack", time: "10:30", title: "Water + light snack", detail: "Cucumber or unsweetened buttermilk. 6 almonds OK." },
    { id: "lunch", time: "13:00", title: "Lunch + omega-3", detail: "Salad first. Dal/chicken + 2 millet rotis + curd. Take omega-3." },
    { id: "walkL", time: "13:20", title: "Walk after lunch", detail: "10–15 minutes. This blunts sugar spike." },
    { id: "water3", time: "15:30", title: "Drink water", detail: "1–2 glasses." },
    { id: "evening", time: "17:00", title: "Evening snack ± strength", detail: "Sprouts/chana. Mon/Wed/Fri: do strength circuit now." },
    { id: "mainWalk", time: "18:00", title: "Main brisk walk", detail: "45–60 minutes. You should be able to talk." },
    { id: "dinner", time: "19:15", title: "Dinner (no roti/rice)", detail: "Protein + sabzi/salad only. Finish by 8:00." },
    { id: "walkD", time: "19:35", title: "Walk after dinner", detail: "10–15 minutes." },
    { id: "wind", time: "20:30", title: "Magnesium + wind down", detail: "No more food. Light water if thirsty." },
    { id: "sleep", time: "22:30", title: "Sleep", detail: "Phone away. Target 7–8 hours." },
  ];

  function todayISO() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Calcutta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function nowMinutesIST() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Calcutta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour").value);
    const m = Number(parts.find((p) => p.type === "minute").value);
    return h * 60 + m;
  }

  function parseHM(hm) {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
  }

  function dayNumber(iso) {
    const start = new Date(PLAN_START + "T00:00:00");
    const cur = new Date(iso + "T00:00:00");
    return Math.floor((cur.getTime() - start.getTime()) / 86400000) + 1;
  }

  function weekdayIST() {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Calcutta",
      weekday: "short",
    }).format(new Date());
  }

  function isStrengthDay() {
    return ["Mon", "Wed", "Fri"].includes(weekdayIST());
  }

  function emptyLog() {
    return {
      waterGlasses: 0,
      fastingSugar: "",
      weightKg: "",
      walked: false,
      strength: false,
      alcoholFree: true,
      sugarFree: true,
      sleepOk: false,
      afterMealWalk: false,
      dietStrict: false,
      earlyDinner: false,
      omegaTaken: false,
      notes: "",
      doneSlots: {},
    };
  }

  function scoreDay(log) {
    let s = 0;
    if (log.waterGlasses >= WATER_TARGET) s += 15;
    else s += Math.round((log.waterGlasses / WATER_TARGET) * 15);
    if (log.walked) s += 15;
    if (log.afterMealWalk) s += 10;
    if (log.strength) s += 10;
    if (log.dietStrict) s += 15;
    if (log.alcoholFree) s += 10;
    if (log.sugarFree) s += 10;
    if (log.earlyDinner) s += 5;
    if (log.sleepOk) s += 5;
    if (log.omegaTaken) s += 5;
    return Math.min(100, s);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("fit-reset-v1");
      if (!raw) return { logs: {}, profileWeight: String(START_WEIGHT), reminders: false };
      return { reminders: false, ...JSON.parse(raw) };
    } catch {
      return { logs: {}, profileWeight: String(START_WEIGHT), reminders: false };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const msg = document.getElementById("saved-msg");
    if (!msg) return;
    msg.hidden = false;
    clearTimeout(saveState._t);
    saveState._t = setTimeout(() => {
      msg.hidden = true;
    }, 1200);
  }

  function planDays() {
    const out = [];
    const base = new Date(PLAN_START + "T00:00:00");
    for (let i = 0; i < 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Calcutta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d)
      );
    }
    // Fallback simple ISO dates from PLAN_START for 30 days
    if (out.length === 0 || out.some((x) => !x)) {
      const fallback = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(PLAN_START + "T00:00:00");
        d.setDate(d.getDate() + i);
        fallback.push(d.toISOString().slice(0, 10));
      }
      return fallback;
    }
    return out;
  }

  // Stable 30 calendar days from plan start (date-only arithmetic)
  function planDaysStable() {
    const out = [];
    const [y, m, day] = PLAN_START.split("-").map(Number);
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(y, m - 1, day + i));
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  const state = loadState();
  const today = todayISO();
  if (!state.logs[today]) state.logs[today] = emptyLog();
  else state.logs[today] = { ...emptyLog(), ...state.logs[today], doneSlots: { ...emptyLog().doneSlots, ...(state.logs[today].doneSlots || {}) } };

  const $ = (id) => document.getElementById(id);
  let lastNotifiedId = "";

  function currentLog() {
    state.logs[today] = {
      ...emptyLog(),
      ...state.logs[today],
      doneSlots: { ...(state.logs[today] && state.logs[today].doneSlots ? state.logs[today].doneSlots : {}) },
    };
    return state.logs[today];
  }

  function bmi(weight) {
    const w = parseFloat(weight) || START_WEIGHT;
    return (w / (HEIGHT_M * HEIGHT_M)).toFixed(1);
  }

  function currentAndNext() {
    const now = nowMinutesIST();
    let current = SCHEDULE[0];
    let next = SCHEDULE[1] || SCHEDULE[0];
    for (let i = 0; i < SCHEDULE.length; i++) {
      const start = parseHM(SCHEDULE[i].time);
      const end = i + 1 < SCHEDULE.length ? parseHM(SCHEDULE[i + 1].time) : 24 * 60;
      if (now >= start && now < end) {
        current = SCHEDULE[i];
        next = SCHEDULE[Math.min(i + 1, SCHEDULE.length - 1)];
        break;
      }
      if (now < start) {
        current = null;
        next = SCHEDULE[i];
        break;
      }
      if (i === SCHEDULE.length - 1) {
        current = SCHEDULE[i];
        next = null;
      }
    }
    return { current, next, now };
  }

  function renderNext() {
    const { current, next } = currentAndNext();
    const strengthNote = isStrengthDay() ? " · Strength day (Mon/Wed/Fri)" : " · Walk/mobility day";
    if (current) {
      $("next-action-title").textContent = `Now: ${current.title}`;
      $("next-action-detail").textContent = `${current.time} — ${current.detail}${strengthNote}`;
    } else if (next) {
      $("next-action-title").textContent = `Next: ${next.title}`;
      $("next-action-detail").textContent = `At ${next.time} — ${next.detail}${strengthNote}`;
    } else {
      $("next-action-title").textContent = "Day complete — sleep well";
      $("next-action-detail").textContent = "Log score, no late food." + strengthNote;
    }
  }

  function renderTimeline() {
    const log = currentLog();
    const now = nowMinutesIST();
    const root = $("timeline");
    root.innerHTML = SCHEDULE.map((slot) => {
      const mins = parseHM(slot.time);
      const done = Boolean(log.doneSlots[slot.id]);
      const isNow =
        now >= mins &&
        now < (SCHEDULE[SCHEDULE.indexOf(slot) + 1] ? parseHM(SCHEDULE[SCHEDULE.indexOf(slot) + 1].time) : 24 * 60);
      const cls = ["timeline-row", done ? "done" : "", isNow ? "now" : ""].filter(Boolean).join(" ");
      return `<button type="button" class="${cls}" data-slot="${slot.id}">
        <span class="t-time">${slot.time}</span>
        <span class="t-body"><strong>${slot.title}</strong><small>${slot.detail}</small></span>
        <span class="t-mark">${done ? "✓" : isNow ? "NOW" : ""}</span>
      </button>`;
    }).join("");

    root.querySelectorAll("[data-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-slot");
        const L = currentLog();
        L.doneSlots[id] = !L.doneSlots[id];
        // Auto-tick related habits
        if (id === "mainWalk" && L.doneSlots[id]) L.walked = true;
        if ((id === "walkB" || id === "walkL" || id === "walkD") && L.doneSlots.walkB && L.doneSlots.walkL && L.doneSlots.walkD) {
          L.afterMealWalk = true;
        }
        if (id === "dinner" && L.doneSlots[id]) L.earlyDinner = true;
        if (id === "lunch" && L.doneSlots[id]) L.omegaTaken = true;
        if (id === "evening" && L.doneSlots[id] && isStrengthDay()) L.strength = true;
        if (id === "sleep" && L.doneSlots[id]) L.sleepOk = true;
        persist();
        syncFormFromState();
      });
    });
  }

  function renderWater() {
    const track = $("water-track");
    const log = currentLog();
    track.innerHTML = "";
    for (let i = 0; i < WATER_TARGET; i++) {
      const drop = document.createElement("div");
      drop.className = "drop" + (i < log.waterGlasses ? " filled" : "");
      track.appendChild(drop);
    }
    $("water-count").textContent = String(log.waterGlasses);
  }

  function renderSugarHint() {
    const hint = $("sugar-hint");
    const v = parseFloat(currentLog().fastingSugar);
    hint.className = "hint";
    if (!currentLog().fastingSugar || Number.isNaN(v)) {
      hint.textContent = "";
      return;
    }
    if (v < 100) {
      hint.textContent = "Excellent range";
      hint.classList.add("good");
    } else if (v < 126) {
      hint.textContent = "Getting better — keep the plan";
      hint.classList.add("warn");
    } else {
      hint.textContent = "Still high — walk after meals + doctor";
      hint.classList.add("bad");
    }
  }

  function renderHeader() {
    const log = currentLog();
    const weight = log.weightKg || state.profileWeight || START_WEIGHT;
    $("greeting").textContent = `Day ${Math.max(1, dayNumber(today))}`;
    $("profile-line").textContent = `5′5″ · ${weight} kg · BMI ${bmi(weight)} · ${weekdayIST()}${isStrengthDay() ? " · strength" : ""}`;
    $("score-value").textContent = String(scoreDay(log));
  }

  function renderLabs() {
    const root = $("labs-list");
    if (!root) return;
    root.innerHTML = LABS.map(
      (lab) => `
      <article class="lab ${lab.level}">
        <div class="name">${lab.name}</div>
        <div class="val">${lab.value}</div>
        <div class="meta">${lab.meta}</div>
      </article>`
    ).join("");
  }

  function renderExercises() {
    const list = window.FIT_RESET_EXERCISES || [];
    const session = window.FIT_RESET_SESSION;
    const sessionCard = $("session-card");
    const nav = $("ex-nav");
    const root = $("ex-list");
    if (!root || !nav) return;

    if (session && sessionCard) {
      sessionCard.innerHTML = `
        <p class="eyebrow">Your 3× / week session</p>
        <h2>${session.title}</h2>
        <p class="muted">${session.minutes}</p>
        <ol class="list numbered">
          ${session.flow.map((step) => `<li>${step}</li>`).join("")}
        </ol>
        <p class="muted">Open each move below · watch · then copy the steps slowly.</p>`;
    }

    nav.innerHTML = list
      .map(
        (ex, i) =>
          `<button type="button" class="ex-chip${i === 0 ? " active" : ""}" data-ex="${ex.id}">${ex.name}</button>`
      )
      .join("");

    root.innerHTML = list
      .map((ex, i) => {
        const steps = ex.steps.map((s) => `<li>${s}</li>`).join("");
        const mistakes = ex.mistakes.map((s) => `<li>${s}</li>`).join("");
        return `<article class="ex-card${i === 0 ? " active" : ""}" id="ex-${ex.id}">
          <div class="ex-head">
            <div>
              <p class="eyebrow">${ex.level} · ${ex.gear}</p>
              <h2>${ex.name}</h2>
              <p class="muted">${ex.muscles}</p>
            </div>
            <div class="ex-reps">${ex.reps}</div>
          </div>
          <p class="ex-why">${ex.why}</p>
          <div class="video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${ex.video}"
              title="${ex.videoTitle}"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>
          <p class="video-cap">${ex.videoTitle}</p>
          <h3>How to do it</h3>
          <ol class="list numbered">${steps}</ol>
          <h3>Common mistakes</h3>
          <ul class="list danger">${mistakes}</ul>
          <p class="muted"><strong>Easier version:</strong> ${ex.easier}</p>
          <a class="btn ghost yt-link" href="https://www.youtube.com/watch?v=${ex.video}" target="_blank" rel="noopener">Open video on YouTube</a>
        </article>`;
      })
      .join("");

    nav.querySelectorAll("[data-ex]").forEach((btn) => {
      btn.addEventListener("click", () => {
        nav.querySelectorAll(".ex-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const id = btn.getAttribute("data-ex");
        root.querySelectorAll(".ex-card").forEach((card) => card.classList.remove("active"));
        const card = document.getElementById(`ex-${id}`);
        if (card) {
          card.classList.add("active");
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function renderHistory() {
    const days = planDaysStable();
    const body = $("history-body");
    let scored = 0;
    let count = 0;
    let waterSum = 0;

    body.innerHTML = days
      .map((d) => {
        const log = state.logs[d];
        const n = dayNumber(d);
        if (!log) {
          return `<tr><td>${n}</td><td>${d}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
        }
        const s = scoreDay(log);
        scored += s;
        count += 1;
        waterSum += log.waterGlasses || 0;
        return `<tr>
          <td>${n}</td>
          <td>${d}</td>
          <td>${log.waterGlasses}/${WATER_TARGET}</td>
          <td>${log.fastingSugar || "—"}</td>
          <td>${log.weightKg || "—"}</td>
          <td>${s}%</td>
        </tr>`;
      })
      .join("");

    $("hist-days").textContent = String(count);
    $("hist-avg").textContent = count ? `${Math.round(scored / count)}%` : "0%";
    $("hist-water").textContent = count ? String(Math.round(waterSum / count)) : "0";
  }

  function syncFormFromState() {
    const log = currentLog();
    $("fasting-sugar").value = log.fastingSugar;
    $("weight").value = log.weightKg;
    $("notes").value = log.notes;
    document.querySelectorAll("#checks input[data-key]").forEach((input) => {
      input.checked = Boolean(log[input.dataset.key]);
    });
    renderWater();
    renderSugarHint();
    renderHeader();
    renderHistory();
    renderNext();
    renderTimeline();
    $("reminder-status").textContent = state.reminders
      ? "Reminders on — keep this tab/app open or use chat daily pings."
      : "Reminders off — tap the button above, or rely on chat daily messages.";
  }

  function persist() {
    saveState(state);
    renderHeader();
    renderHistory();
    renderNext();
  }

  function maybeNotify() {
    if (!state.reminders || Notification.permission !== "granted") return;
    const { current } = currentAndNext();
    if (!current || current.id === lastNotifiedId) return;
    const start = parseHM(current.time);
    const now = nowMinutesIST();
    if (now >= start && now < start + 5) {
      lastNotifiedId = current.id;
      try {
        new Notification("Fit Reset", { body: `${current.time} — ${current.title}. ${current.detail}` });
      } catch {
        /* ignore */
      }
    }
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  document.querySelectorAll(".subtab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".subtab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".plan-block").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const block = $(`plan-${btn.dataset.plan}`);
      if (block) block.classList.add("active");
    });
  });

  $("water-plus").addEventListener("click", () => {
    const log = currentLog();
    log.waterGlasses = Math.min(16, log.waterGlasses + 1);
    renderWater();
    persist();
  });

  $("water-minus").addEventListener("click", () => {
    const log = currentLog();
    log.waterGlasses = Math.max(0, log.waterGlasses - 1);
    renderWater();
    persist();
  });

  $("fasting-sugar").addEventListener("input", (e) => {
    currentLog().fastingSugar = e.target.value;
    renderSugarHint();
    persist();
  });

  $("weight").addEventListener("input", (e) => {
    currentLog().weightKg = e.target.value;
    if (e.target.value) state.profileWeight = e.target.value;
    persist();
  });

  $("notes").addEventListener("input", (e) => {
    currentLog().notes = e.target.value;
    persist();
  });

  document.querySelectorAll("#checks input[data-key]").forEach((input) => {
    input.addEventListener("change", () => {
      currentLog()[input.dataset.key] = input.checked;
      persist();
    });
  });

  $("reset-today").addEventListener("click", () => {
    if (!confirm("Clear today’s log?")) return;
    state.logs[today] = emptyLog();
    syncFormFromState();
    persist();
  });

  $("enable-reminders").addEventListener("click", async () => {
    if (!("Notification" in window)) {
      $("reminder-status").textContent = "This browser can’t show alerts. Use the chat daily reminders + timetable.";
      return;
    }
    const perm = await Notification.requestPermission();
    state.reminders = perm === "granted";
    saveState(state);
    $("reminder-status").textContent = state.reminders
      ? "Reminders on — keep Fit Reset open on your phone for timed alerts."
      : "Permission denied — I’ll still message you daily in this chat.";
    maybeNotify();
  });

  renderLabs();
  renderExercises();
  syncFormFromState();
  setInterval(() => {
    renderNext();
    renderTimeline();
    maybeNotify();
  }, 30000);
})();
