# Modelo de dados (schemaVersion 2)

## Chaves de armazenamento

`adgymspace.v2.sessions`, `.draft`, `.meta`, `.quarantine`, `.preimport` (snapshot), `.recoverable` (até 5 rascunhos descartados), `.corrupt.<ts>`, `adgymspace.log`. A chave legada `adgymspace-offline-retorno-v1` **nunca é apagada**.

## Sessão canônica

```
{ id, schemaVersion:2, workoutCode:A–E, mode:RETURN|REFERENCE|HISTORICAL,
  status:COMPLETED|CANCELLED, date:YYYY-MM-DD (local), capturedAt/startedAt/completedAt (ISO),
  durationSeconds, check{energy,sleep,fatigue,motivation (1–5), shoulderPain,kneePain,lumbarPain (0–10)},
  exercises[{order,label,metric:REPS|TIME,target,variantType,equipmentMatch,equipmentLabel,rirLastSet,
             perception,notes,sets[{setNumber,loadKg,reps|timeSeconds,rir(0–5 int),completed}]}],
  cardio{done,minutes,speedMin,speedMax,distanceKm}, post{effort,rating(0–10),performance,finalFatigue,technique,notes},
  source{kind,originalSchema,importedAt}, transformations[], raw?, deletedAt?, unknown? }
```

Limites: ver `src/domain/constants.js` (`RANGES`, `LIMITS`).

## Transformações documentadas (legado → v2)

- `raw` guarda o objeto original inteiro; valores inválidos/fora do intervalo viram `null` **com nota** em `transformations`, nunca corrigidos.
- `completed` em formatos antigos é **inferido** (reps/tempo presentes) — anotado.
- Rótulos de exercício ausentes (v2–v8) → “Exercício N”; sem adivinhar nomes.
- `date` derivada de `capturedAt` no fuso do aparelho; `capturedAt` UTC preservado.
- App offline v1: “Prancha” guarda segundos em `reps` → `timeSeconds`. Modo `full` → `REFERENCE`, `return` → `RETURN`.
- v9: zeros-placeholders de séries não concluídas mantidos; `reps` em TIME e `time_seconds` em REPS ignorados no campo normalizado (originais em `raw`).
- **Escalas**: desconforto 0–5 (protótipo E) vs 0–10 (dados) é ambíguo; o app aceita 0–10 e não reinterpreta.
- IDs legados determinísticos: `legacy_<checksum(raw)>` e `v1_<id>`; reimportar não duplica.

## Backup

`{format:"adgymspace.backup", schemaVersion, appVersion, exportedAt, checksum, sessions[]}`. Checksum divergente = aviso, não bloqueio.
