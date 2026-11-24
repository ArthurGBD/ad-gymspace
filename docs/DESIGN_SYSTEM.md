# Design system AD GymSpace

Fonte única: `src/styles/main.css` (tokens em `:root`, tema claro em `[data-theme="light"]`). Componentes só consomem tokens.

| Grupo        | Tokens                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cor (escuro) | `--bg #0b1220`, `--surface #111c2d`, `--surface2 #192638`, `--accent #35e0ba`, `--text #f8fafc`, `--muted #94a3b8`, `--warn #fbbf24`, `--danger #fb7185` |
| Cor (claro)  | acento `#065f4e` (ajustado após o axe acusar contraste insuficiente com `#087a65`)                                                                       |
| Tipografia   | `--fs-xs … --fs-xl`, `--fs-num` (carga/reps), `tabular-nums` (`.num`). Fonte: pilha de sistema (sem rede, sem layout shift)                              |
| Espaço       | escala de 4: `--s1…--s6`                                                                                                                                 |
| Raios        | `--r-sm 10`, `--r 16`, `--r-lg 22`, `--r-pill`                                                                                                           |
| Toque        | `--touch 48`, `--touch-lg 60`, `--nav-h 64`                                                                                                              |
| Breakpoints  | 380px (compacto), 768px (2 colunas)                                                                                                                      |

Componentes: header, bottom nav, workout card, stat, set tracker (`.set-pending|active|done`), rest timer (anel `conic-gradient`), `exerciseMedia`, `exerciseInstructions`, `loadChart`, empty state, diálogo e toasts. Safe areas via `env(safe-area-inset-*)`; `prefers-reduced-motion` respeitado; foco visível de 3px.

Limitação: header, nav, set tracker, rest timer, toasts e diálogo ainda vivem em `app.js` (não extraídos para arquivos próprios).
