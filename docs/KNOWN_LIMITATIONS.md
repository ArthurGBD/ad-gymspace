# Limitações conhecidas e status

| Item                                                                                     | Status                                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Reconstrução offline modular, fluxo A–E, estados, histórico, import/export               | Implementado e testado                                                                       |
| Importadores legados                                                                     | Implementado; testado só com fixtures sintéticas; **não** validado com os arquivos reais     |
| Conteúdo dos treinos B–E (exercícios, séries, faixas)                                    | **Reconstrução** (`provenance`), não prescrição verificada; só A tem origem em histórico     |
| Rótulos de exercícios em sessões legadas v2–v8                                           | Indisponíveis na fonte → “Exercício N”; evolução entre sessões legadas e novas não é pareada |
| Teto de ~1100 sessões (localStorage ~5 MB com `raw`)                                     | Limitação; IndexedDB (ADR-002) não implementado                                              |
| Edição de sessões salvas, gráfico de evolução                                            | Não realizado (há tabela)                                                                    |
| App publicado (Next.js/Supabase), HTML de relatórios, `Treino_A_…21-18.json`             | Não fornecidos; bloqueado                                                                    |
| Múltiplas abas simultâneas                                                               | Não tratado                                                                                  |
| Checksum de backup                                                                       | Não criptográfico                                                                            |
| Lighthouse pós-ajuste final, Firefox/Safari, `file://`, dispositivo real, leitor de tela | Não realizado                                                                                |
| Cobertura de código em %                                                                 | Não medida                                                                                   |
| Escalas de desconforto 0–5 vs 0–10                                                       | Ambiguidade documentada, não resolvida                                                       |

## Redesign (3.1.0)

- Sem vídeos demonstrativos; imagens de variantes próximas são indicadas como tal.
- Instruções gerais, não revisadas por profissional.
- Componentes de `app.js` não totalmente extraídos; teclado virtual validado só por emulação.
