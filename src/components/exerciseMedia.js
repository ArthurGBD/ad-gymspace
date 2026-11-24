import { h, icon } from "../utils/dom.js";
import { MEDIA_SOURCE } from "../domain/exerciseCatalog.js";

/**
 * Mídia demonstrativa do exercício: imagem sob demanda com alternância
 * entre posição inicial e final, estados de carregamento/erro e legenda.
 * Sem mídia verificada, mostra apenas um estado informativo (nunca imagem quebrada).
 * @param {{media: any|null, variant: string}} p
 */
export function exerciseMedia({ media, variant }) {
  if (!media) {
    return h(
      "figure",
      { class: "media media-empty", "data-testid": "media-empty" },
      icon("alert", 24),
      h(
        "figcaption",
        null,
        h("strong", null, "Sem demonstração visual verificada"),
        h("span", null, `Siga as instruções de texto de ${variant}.`),
      ),
    );
  }
  let pos = 0;
  const root = h("figure", {
    class: "media",
    "data-size": "compact",
    "data-testid": "media",
  });
  const frame = h("button", {
    class: "media-frame",
    type: "button",
    "data-state": "loading",
    "aria-expanded": "false",
    "aria-label": "Ampliar demonstração",
    "data-testid": "media-expand",
    onclick: () => {
      const large = root.dataset.size === "compact";
      root.dataset.size = large ? "large" : "compact";
      frame.setAttribute("aria-expanded", String(large));
      frame.setAttribute(
        "aria-label",
        large ? "Reduzir demonstração" : "Ampliar demonstração",
      );
    },
  });
  const status = h(
    "p",
    { class: "media-status", role: "status" },
    "Carregando…",
  );
  const toggle = h(
    "button",
    {
      class: "btn btn-sm",
      type: "button",
      "data-testid": "media-toggle",
      onclick: () => show(1 - pos),
    },
    "Ver posição final",
  );
  /** @param {number} next */
  function show(next) {
    pos = next;
    frame.dataset.state = "loading";
    status.textContent = "Carregando…";
    const img = h("img", {
      src: media.images[pos],
      alt: `${media.caption} — posição ${pos === 0 ? "inicial" : "final"}`,
      loading: "lazy",
      decoding: "async",
      width: 600,
      height: 400,
      "data-testid": "media-img",
    });
    img.addEventListener("load", () => {
      frame.dataset.state = "ready";
      status.textContent = "";
    });
    img.addEventListener("error", () => {
      frame.dataset.state = "error";
      status.textContent =
        "Não foi possível carregar a imagem. Use as instruções de texto.";
      img.remove();
    });
    frame.replaceChildren(img);
    toggle.textContent =
      pos === 0 ? "Ver posição final" : "Ver posição inicial";
  }
  show(0);
  root.append(
    frame,
    h(
      "figcaption",
      null,
      h("span", null, media.caption),
      media.match === "similar"
        ? h(
            "span",
            { class: "tag tag-warn", "data-testid": "media-similar" },
            "Variante próxima",
          )
        : null,
      h(
        "small",
        { class: "hint" },
        `Imagem: ${media.sourceName} · ${MEDIA_SOURCE.name} (${MEDIA_SOURCE.license})`,
      ),
      toggle,
      status,
    ),
  );
  return root;
}
