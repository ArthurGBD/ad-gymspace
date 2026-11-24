# AD GymSpace

Registro de treinos A–E **100% offline** (sem backend, sem contas, sem rede). Os dados ficam no `localStorage` do aparelho; backup/restauração por JSON, exportação CSV.

> Esta é uma **reconstrução modular** do app offline de retorno (v1/v2, nov/2026). Não é o app publicado no GPT Sites (código-fonte original Next.js/Supabase não foi fornecido). Veja `docs/ARCHITECTURE.md`.

## Executar

```bash
npm ci
npm run build        # gera dist/ (index.html, app.js, app.css)
npm run serve        # http://127.0.0.1:4173
```

`dist/` também abre via `file://` (scripts não-módulo); o armazenamento pode ser restrito por alguns navegadores nesse modo.

## Verificar

```bash
npm run lint && npm run format:check && npm run typecheck
npm run test:unit && npm run test:integration
npm run build && npm run test:e2e     # Playwright + Chrome do sistema (CHROME_PATH opcional)
npm run audit && npm run scan:secrets
npm run perf                          # com `npm run serve` ativo; usa histórico sintético
npm run verify                        # tudo
```

## Publicar localmente

Sirva `dist/` com qualquer servidor estático (HTTPS recomendado). **Não há deploy automático**; o CI apenas valida e publica o artefato.

## Estrutura

```
src/domain/      regras de negócio puras (estado, rascunho, métricas, progressão, rotinas)
src/validation/  contratos de dados, importadores legados, CSV
src/storage/     persistência (localStorage injetável), quarentena, snapshots, lixeira
src/services/    logger, erros com código, exportação
src/app/         controlador + views (DOM seguro, sem innerHTML)
src/styles/      design system (tokens dark/light)
tests/           unit, integration, e2e (fixtures 100% sintéticas)
docs/            documentação e ADRs
```

## Privacidade

Nenhum dado pessoal de treino é versionado. `.gitignore` bloqueia `Treino_*`, `indice_sessoes.*`, backups e `.env`. Mantenha seus arquivos originais fora do repositório (`private/`).

## Documentação

`docs/`: ARCHITECTURE, SECURITY_AUDIT, THREAT_MODEL, UI_UX_REVIEW, PERFORMANCE, DATA_MODEL, MIGRATION_PLAN, TEST_REPORT, CHANGELOG, KNOWN_LIMITATIONS, adr/.
