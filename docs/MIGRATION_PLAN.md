# Plano de migração

1. **Preservar originais** fora do repositório (`private/`, ignorado pelo git). Nada foi copiado para o repo.
2. **Importar** os arquivos legados na aba Dados → Importar (aceita vários, JSON e CSV). Cada importação cria snapshot (`Desfazer última importação`).
3. Conferir o relatório (novas/duplicadas/rejeitadas). Rejeitadas ficam em `adgymspace.v2.quarantine`.
4. Dados do app offline v1 (`adgymspace-offline-retorno-v1`): exporte o JSON do app antigo e importe; a chave antiga não é tocada.
5. Exportar um backup v2 e guardar fora do aparelho.

**Evolução de esquema**: backups com `schemaVersion` maior que o do app são recusados (AD-IMP-004). Para v3, adicionar função `migrate(v2→v3)` em `src/validation/` e teste de roundtrip; nunca alterar `raw`.

**Status**: importadores testados apenas com fixtures sintéticas derivadas da estrutura dos arquivos; **não** foram executados contra os arquivos reais do usuário (não gravados em disco). Recomenda-se rodar a importação real localmente e conferir o relatório.
