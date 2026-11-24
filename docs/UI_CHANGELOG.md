# UI changelog

## 3.1.0

- Novo design system (tokens, paleta mentol/azul-escuro, tema claro com contraste AA).
- Home: cards A–E, estatísticas (duração marcada como estimativa), última sessão, CTA fixo.
- Execução: mídia, músculo/equipamento, plano e última carga, estados de série, botão "Concluir série" grande, exercícios restantes.
- Descanso: anel, pausar/continuar, ±15 s, pular.
- Catálogo com instruções e imagens (ver EXERCISE_MEDIA_CATALOG.md); gráfico de carga no histórico.
- Campo focado rola para o centro (teclado virtual).
- Correção: "+15s" do descanso usava unidade errada.
- Lógica de séries/RIR/histórico/importação inalterada; testes de regressão passando.

## Seleção explícita A–E (patch recebido, adaptado)

- Home sempre mostra os cinco cards A–E, inclusive com rascunho ativo; card só seleciona e abre prévia (exercícios, séries, imagens locais, instruções). Sessão só começa em "Iniciar treino".
- Com rascunho: banner "Continuar treino" / "Reiniciar treino"; "Iniciar" fica desabilitado.
- Reabrir o app com rascunho cai na home (banner), não direto na execução.
- Vídeos: continuam pendentes (sem fontes verificadas).
- Testes: 44 unit/integração + 29 E2E (`tests/e2e/selection.spec.js`), executados.
