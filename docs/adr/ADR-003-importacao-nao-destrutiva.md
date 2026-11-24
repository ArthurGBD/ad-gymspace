# ADR-003: Importação por mescla, com snapshot e quarentena

Decisão: nunca substituir. Dedupe por id e fingerprint de conteúdo; itens inválidos em quarentena; snapshot pré-importação restaurável; `raw` e `transformations` preservam a origem. Substitui o comportamento destrutivo do app v1.
