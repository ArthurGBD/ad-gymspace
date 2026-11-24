# Modelo de ameaças

**Ativos**: histórico de treino (saúde: dores, fadiga), rascunho em andamento, backups exportados.
**Fronteiras de confiança**: (1) arquivos importados (não confiáveis); (2) `localStorage` (confiável para integridade acidental, não contra malware local); (3) o próprio JS do app.
**Fora de escopo**: usuário com acesso físico/DevTools, extensões maliciosas do navegador, comprometimento do dispositivo.

| Ameaça (STRIDE)               | Vetor                                              | Mitigação                                                                   | Residual                                   |
| ----------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| Tampering/XSS                 | Backup/CSV malicioso com HTML/JS                   | Validação + `h()` sem `innerHTML` + CSP                                     | baixo                                      |
| DoS                           | Arquivo gigante / JSON profundo                    | Limites de bytes, profundidade, linhas, itens                               | baixo                                      |
| Prototype pollution           | chaves `__proto__`                                 | rejeição                                                                    | baixo                                      |
| Perda de dados                | importação destrutiva, falha de escrita, corrupção | mescla, snapshot, quarentena, cópia `corrupt.*`, lixeira, banner AD-STO-001 | quota 5 MB                                 |
| Repúdio/adulteração do backup | edição manual do JSON                              | checksum só avisa                                                           | aceito (sem assinatura)                    |
| Vazamento                     | logs, CSV compartilhado                            | logger sanitizado; log local exportável sob demanda                         | usuário pode compartilhar backup — alertar |
| Supply chain                  | devDependencies                                    | `npm ci`, `npm audit` no CI, lockfile                                       | médio-baixo                                |
| CSV injection                 | planilha abre exportação                           | prefixo `'`                                                                 | baixo                                      |
| Múltiplas abas                | duas abas gravando                                 | não tratado (última escrita vence)                                          | **conhecido**                              |
