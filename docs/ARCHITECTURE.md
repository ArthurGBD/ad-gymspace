# Arquitetura

## Arquitetura encontrada (somente o que foi fornecido)

| Artefato                                                        | Natureza                                                                                      | Status                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| `AD_GymSpace_Retorno_Offline*.html` (v1/v2) + `index/style/app` | HTML/CSS/JS único, `innerHTML` por template, `localStorage` (`adgymspace-offline-retorno-v1`) | **Funcional** (reconstrução offline) |
| `Treino_E_Ciclo1_Mobile_V1_Feedback_D.html`                     | protótipo histórico, carrega imagens externas                                                 | Referência histórica                 |
| `Treino_*.json/csv` (bodygym.session v2–v9)                     | registros reais de treino                                                                     | **Dados** (não versionados)          |
| App publicado (GPT Sites; Next.js/Supabase/D1)                  | código **não fornecido**, HTTP 401                                                            | Não auditado                         |

Não há backend, autenticação nem banco no material recebido; portanto nada disso foi implementado.

## Arquitetura resultante

Vanilla JS (ES modules) → bundle IIFE via esbuild → estáticos. Sem framework: ~60 KB de JS (21 KB gzip) atendem ao requisito (ADR-001).

```
domain  ← validation ← storage ← app(UI)
   ↑          ↑           ↑
 utils      services   (logger/erros)
```

- **domain**: funções puras e imutáveis. `workoutState` (NOT_STARTED/IN_PROGRESS/PAUSED/COMPLETED/CANCELLED), `draft`, `metrics`, `progression` (sugestões rotuladas `SYSTEM_SUGGESTION`; nenhuma em modo retorno), `routines` (com `provenance`), `session` (rascunho→sessão canônica; valida sem corrigir).
- **validation**: `session` (contrato v2), `legacy` (bodygym v2–v8, v9, app offline v1 → v2), `csv`, `importer` (detecção, limites, dedupe por fingerprint).
- **storage**: `createStore({storage})` aceita qualquer objeto Storage → testável e substituível (IndexedDB futuro, ADR-002).
- **app**: único controlador com views; o DOM é montado por `h()` (sem `innerHTML`).
- **services**: logger estruturado com sanitização, catálogo de erros `AD-*`, exportação.

## Fluxo de estados

`Hoje → Check-in → Execução (1 exercício por tela, descanso persistido) → Pós-treino → Resumo`. Rascunho salvo com debounce de 250 ms e em `visibilitychange`/`pagehide`.

## ADRs

`docs/adr/ADR-001-stack.md`, `ADR-002-persistencia.md`, `ADR-003-importacao-nao-destrutiva.md`.

## Código legado

Não foi copiado código do app v2 além do comportamento (modo retorno, reiniciar, descanso 90/120, resumo, histórico, exportar/importar). Itens do plano A–E têm `provenance` explícita (`recovered-history` só para A; demais `reconstruction`).
