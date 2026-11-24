# Relatório de testes

Resultados da última execução completa de `npm run verify` (reproduzível):

| Verificação                                 | Resultado                      |
| ------------------------------------------- | ------------------------------ |
| ESLint                                      | 0 erros                        |
| Prettier `--check`                          | ok                             |
| `tsc` (checkJs)                             | 0 erros                        |
| Vitest unit + integração                    | **39 passed** (3 arquivos)     |
| Playwright E2E (Pixel 7, Chrome do sistema) | **8 passed** (6 fluxo + 2 axe) |
| `npm audit`                                 | 0 vulnerabilidades             |
| `scan:secrets`                              | 0 achados                      |

## Cobertura funcional

- Unit: estados e transições, duração com pausa, modo retorno, volume, RIR 0–5, descanso, vírgula decimal, datas/fuso, progressão (incl. dor e modo retorno), comparabilidade, sequência A–E, conversão rascunho→sessão (sem correção silenciosa), importadores v2–v8/v9/offline v1/CSV, arquivos inválidos/grandes/profundos/`__proto__`, roundtrip, CSV injection.
- Integração (jsdom): sessão completa→histórico, duplo clique, retomada, reinício com confirmação + recuperação, cancelamento, falha de gravação, corrupção, quarentena, merge/dedupe/desfazer, exclusão lógica, XSS, logger.
- E2E: fluxo completo com exportação de backup, reabertura inesperada, reinício, estado vazio, mobile sem overflow horizontal, dados corrompidos, import inválido/duplicado, CSP, axe WCAG 2.2 AA.

## Não medido / não realizado

- **Cobertura de código em %**: não coletada (nenhum número é afirmado).
- Execução contra os arquivos reais do usuário; navegadores Firefox/Safari; dispositivos físicos; teste `file://`; múltiplas abas.
- Bugs encontrados durante os testes e corrigidos: sinal do offset de fuso no importador; servidor estático derrubado por 404 (headers enviados duas vezes); resolução do diálogo de confirmação; `null` implícito em validadores.
