# ADR-001: Manter vanilla JS (sem framework)

Contexto: app offline pequeno, 1 tela ativa. Decisão: ES modules + esbuild; sem React/Next. Consequências: 21 KB gzip, sem runtime deps, DOM seguro via `h()`. Reavaliar se a UI crescer para muitas telas com estado compartilhado.
