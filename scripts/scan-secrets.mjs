import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["token GitHub", /gh[pousr]_[A-Za-z0-9]{36,}/],
  [
    "segredo atribuído",
    /(api[_-]?key|secret|passw(or)?d|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
  ],
];
const files = execSync("git ls-files -co --exclude-standard", {
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => f && !/package-lock\.json$/.test(f));
let bad = 0;
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const [name, re] of PATTERNS)
    if (re.test(text)) {
      console.error(`Possível ${name} em ${f}`);
      bad++;
    }
}
console.log(`scan-secrets: ${files.length} arquivos, ${bad} achado(s)`);
process.exit(bad ? 1 : 0);
