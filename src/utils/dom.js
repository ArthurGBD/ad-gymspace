/**
 * Construtor de DOM seguro: conteúdo textual sempre via text nodes.
 * Não existe caminho para innerHTML (mitiga XSS por construção).
 * @param {string} tag
 * @param {Record<string, any>|null} [attrs]
 * @param {...any} children
 * @returns {any}
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") /** @type {any} */ (el).value = v;
    else if (
      k === "checked" ||
      k === "disabled" ||
      k === "hidden" ||
      k === "open"
    )
      /** @type {any} */ (el)[k] = Boolean(v);
    else if (
      /^on/i.test(k) ||
      k === "innerHTML" ||
      k === "outerHTML" ||
      k === "srcdoc"
    )
      continue;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  el.replaceChildren();
}

const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = {
  home: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
  data: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h4v16H7zM13 4h4v16h-4z",
  check: "M4 12l5 5L20 6",
  plus: "M12 5v14M5 12h14",
  chevronL: "M15 5l-7 7 7 7",
  chevronR: "M9 5l7 7-7 7",
  timer: "M12 8v5l3 2M9 2h6M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  sun: "M12 4V2m0 20v-2M4 12H2m20 0h-2M6 6L4.6 4.6M19.4 19.4L18 18M6 18l-1.4 1.4M19.4 4.6L18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z",
  alert: "M12 3l10 18H2zM12 10v5M12 18v.5",
  restart: "M4 4v6h6M4.5 15a8 8 0 1 0 2-8L4 10",
};

/** @param {string} name */
export function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", /** @type {Record<string,string>} */ (ICONS)[name] ?? "");
  svg.append(p);
  return svg;
}
