# Revisão UI/UX

## Problemas no app original (por leitura)

Grade de 5 colunas densa no mobile; checkbox 20–24 px (WCAG 2.5.8 exige ≥24, boa prática 44); `alert/confirm`; timer perdido ao recarregar; `type=number` com vírgula decimal; sem estados vazios/erro; sem recuperação de rascunho; exclusão irreversível.

## Implementado

- Design system em `src/styles/main.css`: tokens (cor, raio, espaçamento), tema **dark/light** persistido, `prefers-reduced-motion`.
- Execução com **um exercício por tela**, botão ✓ 56×48 px, descanso automático (60/90/120/180/+15 s) baseado em instante-alvo (persiste ao recarregar), `aria-live` ao terminar, última sessão do exercício visível, sugestões rotuladas “Sugestão do sistema” (ocultas em modo retorno).
- Campos decimais como `inputmode=decimal` (vírgula aceita); labels visíveis; foco `:focus-visible` 3 px.
- Diálogos nativos `<dialog>` para ações destrutivas; toasts com código de erro; banner persistente para falha de gravação.
- Estados vazios (histórico, lixeira, descartados), lixeira com restaurar, recuperação de treino reiniciado.
- Navegação inferior (Treino/Histórico/Dados) com alvos ≥ 60 px; histórico paginado (20), evolução em tabela acessível.

## Verificado

Axe-core (tags wcag2a/2aa/21aa/22aa) em home, check-in, execução, histórico, dados nos temas dark e light: **0 violações** (executado, `tests/e2e/a11y.spec.js`). Lighthouse (headless, desktop padrão): Performance 100, Acessibilidade 100, Best Practices 96 (antes de adicionar ícone de página; não reexecutado depois).

## Não verificado

Teste com leitores de tela reais, dispositivos físicos, gráfico de evolução (há apenas tabela), inserção por stepper/gestos, ajuste fino por usuário real na academia.
