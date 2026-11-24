/** Catálogo de erros com identificação consistente (código estável + mensagem ao usuário). */
export const ERR = Object.freeze({
  STORAGE_WRITE: [
    "AD-STO-001",
    "Não foi possível salvar neste aparelho. Exporte um backup agora.",
  ],
  STORAGE_READ: [
    "AD-STO-002",
    "Os dados salvos estavam ilegíveis. Uma cópia foi preservada e o app iniciou vazio.",
  ],
  STORAGE_UNAVAILABLE: [
    "AD-STO-003",
    "O armazenamento local está indisponível. Os dados valem só até fechar a página.",
  ],
  IMPORT_TOO_LARGE: ["AD-IMP-001", "Arquivo grande demais para importar."],
  IMPORT_NOT_JSON: ["AD-IMP-002", "O arquivo não é um JSON/CSV válido."],
  IMPORT_SCHEMA: [
    "AD-IMP-003",
    "O arquivo não segue um formato reconhecido do AD GymSpace.",
  ],
  IMPORT_VERSION: [
    "AD-IMP-004",
    "Versão do arquivo mais nova que a suportada por este app.",
  ],
  IMPORT_EMPTY: ["AD-IMP-005", "Nenhuma sessão encontrada no arquivo."],
  STATE_TRANSITION: [
    "AD-STA-001",
    "Esta ação não é permitida no estado atual do treino.",
  ],
  VALIDATION: [
    "AD-VAL-001",
    "Há valores inválidos. Revise os campos destacados.",
  ],
  NOT_FOUND: ["AD-NF-001", "Registro não encontrado."],
  DUPLICATE: ["AD-DUP-001", "Este treino já foi salvo."],
  UNEXPECTED: [
    "AD-UNX-001",
    "Ocorreu um erro inesperado. Seus dados salvos não foram alterados.",
  ],
});

export class AppError extends Error {
  /**
   * @param {readonly string[]} def entrada de ERR
   * @param {{details?: unknown, cause?: unknown, message?: string}} [opts]
   */
  constructor(def, opts = {}) {
    super(opts.message ?? def[1]);
    this.name = "AppError";
    this.code = def[0];
    this.userMessage = opts.message ?? def[1];
    this.details = opts.details;
    this.cause = opts.cause;
  }
}

export function toAppError(e) {
  return e instanceof AppError ? e : new AppError(ERR.UNEXPECTED, { cause: e });
}
