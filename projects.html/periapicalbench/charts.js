// Figure controls for the Periapical Lesions Bench post: model chips on the film, pass@k tabs, the Pareto chart.

const pressOnly = (group, chosen) => {
  for (const button of group.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button === chosen));
  }
};

for (const figure of document.querySelectorAll(".filmfig")) {
  for (const chip of figure.querySelectorAll("button.chip")) {
    chip.addEventListener("click", () => {
      const shown = chip.getAttribute("aria-pressed") !== "true";
      chip.setAttribute("aria-pressed", String(shown));
      for (const group of figure.querySelectorAll(`.m-${chip.dataset.model}`)) {
        group.style.display = shown ? "" : "none";
      }
    });
  }
}

for (const figure of document.querySelectorAll(".passfig")) {
  for (const tab of figure.querySelectorAll(".seg button")) {
    tab.addEventListener("click", () => {
      figure.dataset.k = tab.dataset.k;
      pressOnly(tab.parentElement, tab);
    });
  }
}

const pareto = document.getElementById("pareto");
if (pareto) {
  const models = JSON.parse(document.getElementById("pareto-data").textContent);
  const svg = pareto.querySelector("svg");
  const state = { y: "pass1", x: "cost", scale: "log" };
  const percent = (v) => `${Math.round(v * 1000) / 10}%`;
  const compact = (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10));
  const AXES = {
    cost: { title: "Cost per attempt (USD)", format: (v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(v % 1 ? 1 : 0)}` },
    minutes: { title: "Time per attempt (minutes)", format: compact },
    tokens: { title: "Output tokens per attempt", format: compact },
    calls: { title: "Model calls per attempt", format: compact },
    pass1: { title: "pass@1", format: percent },
    pass2: { title: "pass@2", format: percent },
    pass3: { title: "pass@3", format: percent },
    reward: { title: "Mean reward", format: (v) => v.toFixed(1) },
  };
  const box = { left: 66, right: 730, top: 22, bottom: 400 };

  // round steps (1, 2, 5 × a power of ten) so every gridline is a number worth reading
  const linearTicks = (max, count) => {
    const raw = max / count;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
    const ticks = [];
    for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  };
  const logTicks = (low, high) => {
    const ticks = [];
    for (let power = Math.floor(Math.log10(low)) - 1; power <= Math.ceil(Math.log10(high)); power += 1) {
      for (const m of [1, 2, 5]) ticks.push(Math.round(m * 10 ** power * 1e6) / 1e6);
    }
    const first = ticks.filter((t) => t <= low).pop();
    const last = ticks.find((t) => t >= high);
    return ticks.filter((t) => t >= first && t <= last);
  };

  const draw = () => {
    const xs = models.map((m) => m[state.x]);
    const ys = models.map((m) => m[state.y]);
    const log = state.scale === "log";
    const xTicks = log ? logTicks(Math.min(...xs) * 0.8, Math.max(...xs) * 1.25) : linearTicks(Math.max(...xs) * 1.08, 6);
    const yTicks = linearTicks(Math.max(...ys) * 1.1, 5);
    const [x0, x1] = [xTicks[0], xTicks[xTicks.length - 1]];
    const y1 = yTicks[yTicks.length - 1];
    const along = (v) => (log ? (Math.log10(v) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0)) : (v - x0) / (x1 - x0));
    const px = (v) => box.left + (box.right - box.left) * along(v);
    const py = (v) => box.bottom - (box.bottom - box.top) * (v / y1);

    // on the frontier: nothing else scores at least as high for no more
    const frontier = models
      .filter((m) => !models.some((o) => o !== m && o[state.x] <= m[state.x] && o[state.y] >= m[state.y] && (o[state.x] < m[state.x] || o[state.y] > m[state.y])))
      .sort((a, b) => a[state.x] - b[state.x]);

    let out = "";
    for (const tick of yTicks) {
      out += `<line class="grid" x1="${box.left}" x2="${box.right}" y1="${py(tick)}" y2="${py(tick)}"/>`;
      out += `<text class="tick" text-anchor="end" x="${box.left - 10}" y="${py(tick) + 5}">${AXES[state.y].format(tick)}</text>`;
    }
    for (const tick of xTicks) {
      out += `<line class="grid" x1="${px(tick)}" x2="${px(tick)}" y1="${box.top}" y2="${box.bottom}"/>`;
      out += `<text class="tick" text-anchor="middle" x="${px(tick)}" y="${box.bottom + 22}">${AXES[state.x].format(tick)}</text>`;
    }
    out += `<line class="axis" x1="${box.left}" x2="${box.right}" y1="${box.bottom}" y2="${box.bottom}"/>`;
    out += `<line class="axis" x1="${box.left}" x2="${box.left}" y1="${box.top}" y2="${box.bottom}"/>`;
    out += `<text class="title" text-anchor="middle" x="${(box.left + box.right) / 2}" y="${box.bottom + 50}">${AXES[state.x].title}${log ? ", log scale" : ""}</text>`;
    out += `<text class="title" text-anchor="middle" transform="translate(16 ${(box.top + box.bottom) / 2}) rotate(-90)">${AXES[state.y].title}</text>`;

    const steps = [];
    if (frontier.length) {
      let path = `M${px(frontier[0][state.x])},${py(frontier[0][state.y])}`;
      frontier.forEach((m, n) => {
        const next = frontier[n + 1];
        const [fromX, toX, y] = [px(m[state.x]), next ? px(next[state.x]) : box.right, py(m[state.y])];
        steps.push({ x: fromX, y: y - 3, w: toX - fromX, h: 6, of: null, step: true });
        if (next) {
          steps.push({ x: toX - 3, y: py(next[state.y]), w: 6, h: y - py(next[state.y]), of: null, step: true });
          path += `H${toX}V${py(next[state.y])}`;
        }
      });
      out += `<path class="frontier" d="${path}H${box.right}"/>`;
    }

    // The frontier leaves each point rightwards and reaches it from below, so a label goes above its point when it can;
    // in a crowd it moves further up and a thin line ties it back to its point.
    const taken = [...steps, ...models.map((m) => ({ x: px(m[state.x]) - 8, y: py(m[state.y]) - 8, w: 16, h: 16, of: m }))];
    const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    let labels = "";
    for (const m of [...models].sort((a, b) => py(a[state.y]) - py(b[state.y]))) {
      const cx = px(m[state.x]);
      const cy = py(m[state.y]);
      const on = frontier.includes(m);
      const w = m.name.length * 7.6 + 6;
      const spots = [
        { x: cx - 8 - w, y: cy - 26 },
        { x: cx + 8, y: cy - 26 },
        { x: cx + 10, y: cy + 8 },
        { x: cx - 10 - w, y: cy + 8 },
        { x: cx + 12, y: cy - 9 },
        { x: cx - 12 - w, y: cy - 9 },
        { x: cx - w / 2, y: cy - 30 },
        { x: cx - w / 2, y: cy + 12 },
        { x: Math.max(box.left + 6, cx - w / 2), y: cy - 52, far: true },
        { x: cx + 14, y: cy - 52, far: true },
        { x: Math.max(box.left + 6, cx - w / 2), y: cy - 74, far: true },
        { x: cx + 14, y: cy - 74, far: true },
        { x: Math.max(box.left + 6, cx - w / 2), y: cy - 96, far: true },
        { x: cx + 14, y: cy - 96, far: true },
      ].map((spot) => ({ ...spot, w, h: 17 }));
      // crossing the dashed frontier is tolerable; landing on a point or another label is not
      const inside = (spot) => spot.x >= box.left + 2 && spot.x + w <= box.right && spot.y >= 0 && spot.y + 17 <= box.bottom - 2;
      const cost = (spot) => taken.reduce((sum, t) => sum + (t.of !== m && hits(spot, t) ? (t.step ? 1 : 10) : 0), inside(spot) ? 0 : 100);
      const spot = spots.reduce((best, candidate) => (cost(candidate) < cost(best) ? candidate : best));
      taken.push({ ...spot, of: null });
      out += `<circle class="${on ? "dot on" : "dot"}" cx="${cx}" cy="${cy}" r="${on ? 6.5 : 5.5}"><title>${m.name}: ${AXES[state.y].title} ${AXES[state.y].format(m[state.y])}, ${AXES[state.x].format(m[state.x])}</title></circle>`;
      if (spot.far) labels += `<line class="leader" x1="${cx}" y1="${cy - 8}" x2="${Math.min(Math.max(cx, spot.x + 8), spot.x + w - 8)}" y2="${spot.y + 18}"/>`;
      labels += `<text class="${on ? "name" : "name off"}" x="${spot.x + 3}" y="${spot.y + 14}">${m.name}</text>`;
    }
    out += labels;
    svg.innerHTML = out;
  };

  for (const group of pareto.querySelectorAll(".seg")) {
    for (const button of group.querySelectorAll("button")) {
      button.addEventListener("click", () => {
        state[group.dataset.axis] = button.dataset.v;
        pressOnly(group, button);
        draw();
      });
    }
  }
  draw();
}
