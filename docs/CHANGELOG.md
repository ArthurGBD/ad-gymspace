# Changelog

## 3.0.0 — reconstrução modular

- Nova base ES modules + esbuild; domínio puro, validação, storage injetável, logger, erros `AD-*`.
- Máquina de estados do treino; rascunho persistente; reinício com cópia recuperável; lixeira.
- Importação não destrutiva (mescla, snapshot, quarentena), importadores legados v2–v9, CSV legado, offline v1.
- Exportação JSON (checksum) e CSV (anti-injeção).
- UI mobile-first, dark/light, WCAG (axe 0 violações), CSP.
- Testes: 39 unit/integração, 8 E2E; CI sem deploy.

## Antes (2.x offline v1/v2, por leitura)

Arquivo único, `innerHTML`, importação substitutiva, sem testes. Ver SECURITY_AUDIT.
