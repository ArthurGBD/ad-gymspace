# Relatório de validação visual

Executado com `npm run verify` (Playwright, Chrome do sistema, headless):

- Lint, format, typecheck: OK. Unit/integração: 44 passando. E2E: 19 passando (fluxos, axe claro/escuro, visuais).
- `visual.spec.js` em 360, 390, 412, 768 e 1440: sem overflow horizontal, ação principal acima da nav, sem erros de página. Capturas em `test-results/screens/` (não versionadas). Inspecionei manualmente 360-exec-rest, 1440-home, 390-home e 390-exec.
- Mídia: carregamento, expandir, alternar posição; falha de rede (`route.abort`) mostra aviso sem imagem quebrada; exercício sem mídia mostra estado informativo e instruções.
- Descanso: pausar/continuar/±15s/pular. Alvos de toque ≥44px.
- Bugs achados e corrigidos na validação: contraste do acento no tema claro (axe); unidade no descanso (`restRemaining` já retorna segundos).

Não executado: dispositivo físico, teclado virtual real, novo Lighthouse após o redesign.
