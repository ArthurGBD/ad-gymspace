# Auditoria de UI/UX (antes do redesign)

Capturas reais (Playwright + Chrome) em 360×800, 390×844, 412×915, 768×1024 e 1440×900.

| Problema observado                                     | Evidência          | Correção                                              |
| ------------------------------------------------------ | ------------------ | ----------------------------------------------------- |
| Tema sem identidade (laranja/claro genérico)           | capturas home/exec | paleta mentol sobre azul-escuro                       |
| Barra "Anterior/Próximo" sobrepunha o card de Descanso | exec 390           | barra sticky acima da nav                             |
| Campo RIR desalinhado pela dica "0–5"                  | exec 390/1440      | dica movida para o label; grade de 3 colunas          |
| Seleção A–E só com letras                              | home               | cards com título, nº de exercícios, músculos e status |
| Sem mídia/instruções                                   | exec               | catálogo + `exerciseMedia` + "Como executar"          |
| Descanso só texto                                      | exec               | anel de progresso, pausar/continuar, ±15 s, pular     |
| Evolução só em tabela                                  | histórico          | gráfico SVG + tabela, estado vazio                    |
| Botão de série pequeno                                 | exec               | "Concluir série" de 60px, largura total               |

Validação: `tests/e2e/visual.spec.js` (sem overflow horizontal, ação principal fora da nav, alvos ≥44px).
