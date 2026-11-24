# ADR-002: localStorage com chaves separadas; IndexedDB adiado

Decisão: `localStorage` via adaptador injetável (`createStore`). Motivo: simplicidade, síncrono, compatível com o app v1. Risco: quota ~5 MB (≈1100 sessões com `raw`). Gatilho para migrar: histórico >800 sessões ou erro AD-STO-001 recorrente. O adaptador isola a mudança.
