# Performance

Ambiente: Linux, Node 26, Chrome headless do sistema, `scripts/perf.mjs` (`npm run perf`), histórico **sintético** (6 exercícios × 3 séries, ~4,4 KB/sessão com `raw`). Cada valor abaixo é uma execução real; variam entre execuções.

| Métrica                                           | 300 sessões | 1000 sessões |
| ------------------------------------------------- | ----------- | ------------ |
| Backup JSON (bytes)                               | 1 324 050   | 4 413 150    |
| Normalizar+validar (ms)                           | 55          | 121          |
| Exportar JSON (ms)                                | 25          | 69           |
| Reimportar backup (ms)                            | 31          | 107          |
| Startup, mediana de 5 (DOMContentLoaded/load, ms) | 41 / 41     | 56 / 56      |
| Itens renderizados na 1ª página do histórico      | 20          | 20           |
| JS heap (bytes)                                   | 19,4 M      | 37,0 M       |

Bundle: `app.js` 61 124 B (21,6 KB gzip), `app.css` 5,9 KB, `index.html` 0,6 KB.
Lighthouse (headless): Performance 100; FCP/LCP 1,2 s (throttling simulado), TBT 0 ms, CLS 0.

## Achado real

Com `raw` preservado, 2000 sessões ≈ 8,8 MB: **excede o limite de importação (5 MB) e a quota típica do `localStorage` (~5 MB)** → ~1100 sessões é o teto prático. Ação: ADR-002 (migrar para IndexedDB se o histórico crescer). Não otimizado ainda.

## Otimizações feitas

Paginação do histórico (20), gravação de rascunho com debounce + flush em `pagehide`, renderização por view (sem templates string). **Sem linha de base do app original** (sem testes/ambiente para medi-lo equivalente) → não afirmo “ganho” sobre ele.

## Pendente

`loadSessions` revalida todas as sessões a cada operação (O(n)); aceitável até ~1000, cache em memória é melhoria futura. Sem profiling de reflow/memória em dispositivo móvel real.
