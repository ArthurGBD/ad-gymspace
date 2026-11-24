# Auditoria de segurança

Escopo: o app offline v1/v2 fornecido (analisado por leitura; sem testes originais) e a reconstrução. Referências: OWASP ASVS (V5 validação, V8 dados, V14 config), Top 10 (A03 Injeção, A04 Design inseguro, A05 Config, A08 Integridade). Sem backend → autenticação, RLS e autorização por recurso **não aplicáveis**.

## Achados confirmados (app original)

| ID   | Sev.     | Evidência                                                                                         | Impacto                                             | Correção                                                             | Teste de regressão                                                                                                    |
| ---- | -------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| S-01 | **Alta** | `history` renderizado com `innerHTML` de template (`x.title`, `x.day`, `aria-label` com `x.date`) | XSS armazenado via backup importado                 | `h()` só cria text nodes; sem `innerHTML`; CSP `script-src 'self'`   | `integration › conteúdo malicioso importado nunca vira HTML`; `e2e › importação…`; `e2e › CSP bloqueia script inline` |
| S-02 | **Alta** | Importar fazia `state={...mkState(),...j.data}`                                                   | Perda total de dados; objeto arbitrário vira estado | Importação **mescla**, valida cada sessão, cria snapshot restaurável | `integration › mescla sem substituir…`; `unit › item inválido vai para rejeitados`                                    |
| S-03 | Média    | `x.date.split`/`x.series.flatMap` sem validação                                                   | Travamento da UI com arquivo malformado             | Validação de esquema por sessão + quarentena                         | `unit › arquivos inválidos…`                                                                                          |
| S-04 | Média    | Sem limite de tamanho/profundidade                                                                | DoS por arquivo grande/aninhado                     | 5 MB, profundidade 12, 50 000 linhas CSV, 5000 sessões               | `unit › rejeita… excesso de tamanho`, `profundidade excessiva`                                                        |
| S-05 | Média    | `JSON.parse` falho resetava estado em silêncio                                                    | Perda silenciosa                                    | Cópia bruta em `adgymspace.v2.corrupt.<ts>` + aviso AD-STO-002       | `integration › dados corrompidos…`; `e2e › dados corrompidos…`                                                        |
| S-06 | Média    | `__proto__`/`constructor` aceitos em JSON                                                         | Poluição de protótipo                               | `findUnsafeKey` rejeita                                              | `unit › rejeita __proto__`                                                                                            |
| S-07 | Baixa    | `window.open`+`document.write` no “copiar resumo”                                                 | Superfície de injeção                               | Removido; usa `navigator.clipboard`                                  | revisão de código                                                                                                     |
| S-08 | Baixa    | `id=Date.now()`; duplo clique em Finalizar                                                        | Sessões duplicadas                                  | `id` do rascunho + `addSession` idempotente; dedupe por fingerprint  | `integration › duplo clique…`                                                                                         |
| S-09 | Baixa    | Exportação sem proteção de fórmulas                                                               | CSV injection em planilhas                          | `csvCell` prefixa `'` em `= + - @ TAB CR`                            | `unit › neutraliza injeção de fórmula`                                                                                |
| S-10 | Baixa    | Sem CSP                                                                                           | Defesa em profundidade ausente                      | `<meta>` CSP restritiva (`default-src 'none'`, `connect-src 'none'`) | `e2e › CSP bloqueia script inline`                                                                                    |
| S-11 | Info     | Protótipo E carrega imagens Wikimedia/YouTube                                                     | Rastreamento/dependência externa                    | Reconstrução **não** possui recursos externos                        | CSP `img-src 'self' data:`                                                                                            |

## Dependências

`npm audit`: **0 vulnerabilidades** (resultado real, 43 arquivos varridos por `scan:secrets`: 0 achados). Todas são devDependencies; o artefato final não tem dependências de runtime. O pós-instalação do esbuild não é aprovado pelo npm 11, mas o binário funciona (verificado).

## Persistência

`localStorage` é sem criptografia e acessível a qualquer script da mesma origem — aceitável para app offline sem terceiros. Checksum cyrb53 é **não criptográfico**: detecta corrupção acidental, não adulteração. Quota (~5 MB) é limitação conhecida (ver KNOWN_LIMITATIONS).

## Privacidade

Logs: chaves sensíveis (notes, sets, load…) são removidas por `sanitizeContext`; testado. Dados reais não foram gravados em disco nem versionados; fixtures são sintéticas.

## Não aplicável / não realizado

Autenticação, RLS, endpoints, sessões: inexistentes. Pentest dinâmico além dos testes E2E: não realizado.
