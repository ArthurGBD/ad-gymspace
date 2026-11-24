import { h } from "../utils/dom.js";
import { formatDateBR } from "../utils/dates.js";

const NS = "http://www.w3.org/2000/svg";
const W = 320;
const H = 140;
const PAD = { l: 36, r: 12, t: 12, b: 24 };

/** @param {string} tag @param {Record<string,string|number>} attrs */
function svg(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/**
 * Gráfico de linha da maior carga (kg) por sessão. Pontos não comparáveis
 * (equipamento/variante diferente) aparecem vazados. Sem dados suficientes,
 * mostra um estado vazio em vez de inventar tendência.
 * @param {{date:string, topLoad:number|null, comparable:boolean}[]} points
 */
export function loadChart(points) {
  const pts = points.filter((p) => typeof p.topLoad === "number");
  if (pts.length < 2)
    return h(
      "p",
      { class: "muted", "data-testid": "evo-chart-empty" },
      "São necessárias ao menos 2 sessões com carga registrada para exibir o gráfico.",
    );
  const loads = pts.map((p) => /** @type {number} */ (p.topLoad));
  const min = Math.min(...loads);
  const max = Math.max(...loads);
  const span = max - min || 1;
  const x = (/** @type {number} */ i) =>
    PAD.l + (i * (W - PAD.l - PAD.r)) / (pts.length - 1);
  const y = (/** @type {number} */ v) =>
    PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b);
  const root = svg("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "chart",
    role: "img",
    "aria-label": `Maior carga em kg por sessão, de ${formatDateBR(pts[0].date)} a ${formatDateBR(pts[pts.length - 1].date)}: de ${loads[0]} a ${loads[loads.length - 1]} kg`,
  });
  const label = (
    /** @type {number} */ px,
    /** @type {number} */ py,
    /** @type {string} */ t,
    anchor = "end",
  ) => {
    const el = svg("text", {
      x: px,
      y: py,
      "text-anchor": anchor,
      class: "chart-label",
    });
    el.textContent = t;
    return el;
  };
  root.append(
    svg("line", {
      x1: PAD.l,
      x2: W - PAD.r,
      y1: y(max),
      y2: y(max),
      class: "chart-grid",
    }),
    svg("line", {
      x1: PAD.l,
      x2: W - PAD.r,
      y1: y(min),
      y2: y(min),
      class: "chart-grid",
    }),
    label(PAD.l - 4, y(max) + 4, `${max}`),
    label(PAD.l - 4, y(min) + 4, `${min}`),
    label(PAD.l, H - 6, formatDateBR(pts[0].date), "start"),
    label(W - PAD.r, H - 6, formatDateBR(pts[pts.length - 1].date)),
    svg("polyline", {
      points: pts
        .map((p, i) => `${x(i)},${y(/** @type {number} */ (p.topLoad))}`)
        .join(" "),
      class: "chart-line",
    }),
  );
  pts.forEach((p, i) =>
    root.append(
      svg("circle", {
        cx: x(i),
        cy: y(/** @type {number} */ (p.topLoad)),
        r: 4,
        class: p.comparable ? "chart-dot" : "chart-dot chart-dot-hollow",
      }),
    ),
  );
  return h(
    "figure",
    { class: "chart-wrap", "data-testid": "evo-chart" },
    root,
    h(
      "figcaption",
      { class: "hint" },
      "Maior carga (kg) por sessão. Ponto vazado = sessão não comparável.",
    ),
  );
}
