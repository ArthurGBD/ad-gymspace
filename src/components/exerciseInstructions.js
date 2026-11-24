import { h } from "../utils/dom.js";

/** @param {{prep: string[], exec: string[], mistakes: string[], notes: string[]}} ins @param {string} general */
export function exerciseInstructions(ins, general) {
  /** @param {string} title @param {string[]} items */
  const section = (title, items) =>
    items.length
      ? h(
          "section",
          { class: "ins-section" },
          h("h3", null, title),
          h(
            "ul",
            null,
            items.map((t) => h("li", null, t)),
          ),
        )
      : null;
  return h(
    "details",
    { class: "card ins", "data-testid": "instructions" },
    h("summary", null, "Como executar"),
    section("Preparação", ins.prep),
    section("Execução", ins.exec),
    section("Erros comuns", ins.mistakes),
    section("Observações", ins.notes),
    h("small", { class: "hint" }, general),
  );
}
