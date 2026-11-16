// Figure controls for the Periapical Lesions Bench post: model chips on the film and the pass@k tabs.

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
