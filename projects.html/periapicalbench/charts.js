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
  const state = { x: "cost", scale: "log" };
  const percent = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
  const compact = (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10));
  const AXES = {
    cost: { title: "Cost of the attempts on one film (USD)", format: (v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(v % 1 ? 1 : 0)}` },
    minutes: { title: "Time for the attempts on one film (minutes)", format: compact },
    tokens: { title: "Output tokens for the attempts on one film", format: compact },
    calls: { title: "Model calls for the attempts on one film", format: compact },
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
    // one point per model and k: pass@k, at what k attempts on a film take
    const points = models.flatMap((m) => [1, 2, 3].map((k) => ({ m, k, x: k * m[state.x], y: m[`pass${k}`] })));
    const log = state.scale === "log";
    const xs = points.map((p) => p.x);
    const xTicks = log ? logTicks(Math.min(...xs) * 0.8, Math.max(...xs) * 1.6) : linearTicks(Math.max(...xs) * 1.15, 6);
    const yTicks = linearTicks(Math.max(...points.map((p) => p.y)) * 1.1, 6);
    const [x0, x1] = [xTicks[0], xTicks[xTicks.length - 1]];
    const y1 = yTicks[yTicks.length - 1];
    const along = (v) => (log ? (Math.log10(v) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0)) : (v - x0) / (x1 - x0));
    const px = (v) => box.left + (box.right - box.left) * along(v);
    const py = (v) => box.bottom - (box.bottom - box.top) * (v / y1);

    let out = "";
    for (const tick of yTicks) {
      out += `<line class="grid" x1="${box.left}" x2="${box.right}" y1="${py(tick)}" y2="${py(tick)}"/>`;
      out += `<text class="tick" text-anchor="end" x="${box.left - 10}" y="${py(tick) + 5}">${Math.round(tick * 100)}%</text>`;
    }
    for (const tick of xTicks) {
      out += `<line class="grid" x1="${px(tick)}" x2="${px(tick)}" y1="${box.top}" y2="${box.bottom}"/>`;
      out += `<text class="tick" text-anchor="middle" x="${px(tick)}" y="${box.bottom + 22}">${AXES[state.x].format(tick)}</text>`;
    }
    out += `<line class="axis" x1="${box.left}" x2="${box.right}" y1="${box.bottom}" y2="${box.bottom}"/>`;
    out += `<text class="title" text-anchor="middle" x="${(box.left + box.right) / 2}" y="${box.bottom + 50}">${AXES[state.x].title}${log ? ", log scale" : ""}</text>`;
    out += `<text class="title" text-anchor="middle" transform="translate(16 ${(box.top + box.bottom) / 2}) rotate(-90)">pass@k</text>`;

    // the frontier: points that nothing else beats for less
    const frontier = points
      .filter((p) => !points.some((o) => o !== p && o.x <= p.x && o.y >= p.y && (o.x < p.x || o.y > p.y)))
      .sort((a, b) => a.x - b.x);
    let path = `M${px(frontier[0].x)},${py(frontier[0].y)}`;
    for (const p of frontier.slice(1)) path += `H${px(p.x)}V${py(p.y)}`;
    out += `<path class="frontier" d="${path}H${box.right}"/>`;

    const taken = points.map((p) => ({ x: px(p.x) - 7, y: py(p.y) - 7, w: 14, h: 14, of: p }));
    const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const inside = (s) => s.x >= box.left + 2 && s.x + s.w <= box.right + 24 && s.y >= 0 && s.y + s.h <= box.bottom - 2;
    const place = (spots, own) => {
      const cost = (s) => taken.reduce((sum, t) => sum + (!own.includes(t.of) && hits(s, t) ? 10 : 0), inside(s) ? 0 : 100);
      const spot = spots.reduce((best, candidate) => (cost(candidate) < cost(best) ? candidate : best));
      taken.push({ ...spot, of: null });
      return spot;
    };

    let lines = "";
    let dots = "";
    let labels = "";
    for (const m of models) {
      const own = points.filter((p) => p.m === m);
      lines += `<polyline class="run" stroke="${m.color}" points="${own.map((p) => `${px(p.x)},${py(p.y)}`).join(" ")}"/>`;
      for (const p of own) {
        dots += `<circle class="pt" fill="${m.color}" cx="${px(p.x)}" cy="${py(p.y)}" r="5.5"><title>${m.name}, pass@${p.k}: ${percent(p.y)} at ${AXES[state.x].format(p.x)}</title></circle>`;
      }
    }
    // the end of each line carries the model and its pass@3; the small numbers say which k a dot is
    for (const m of [...models].sort((a, b) => b.pass3 - a.pass3)) {
      const end = points.find((p) => p.m === m && p.k === 3);
      const [cx, cy] = [px(end.x), py(end.y)];
      const text = `${m.name}  ${percent(end.y)}`;
      const w = text.length * 7.4 + 8;
      const spot = place(
        [
          { x: cx + 10, y: cy - 9 },
          { x: cx + 10, y: cy - 24 },
          { x: cx + 10, y: cy + 6 },
          { x: cx - w / 2, y: cy - 30 },
          { x: cx - w - 10, y: cy - 26 },
          { x: cx - w / 2, y: cy - 48 },
          { x: cx + 10, y: cy - 42 },
        ].map((s) => ({ ...s, w, h: 17 })),
        [end],
      );
      labels += `<text class="end" x="${spot.x + 2}" y="${spot.y + 13}">${m.name} <tspan class="pass3">${percent(end.y)}</tspan></text>`;
    }
    for (const p of points) {
      const [cx, cy] = [px(p.x), py(p.y)];
      const text = p.k === 1 ? "k=1" : String(p.k);
      const w = text.length * 6.4 + 2;
      const spot = place(
        [
          { x: cx - w - 6, y: cy - 19 },
          { x: cx - w / 2, y: cy - 22 },
          { x: cx + 2, y: cy + 7 },
          { x: cx - w - 8, y: cy + 5 },
          { x: cx - w / 2, y: cy + 9 },
        ].map((s) => ({ ...s, w, h: 13 })),
        [p],
      );
      labels += `<text class="k" style="fill:${p.m.color}" x="${spot.x + 1}" y="${spot.y + 11}">${text}</text>`;
    }
    svg.innerHTML = out + lines + dots + labels;
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
