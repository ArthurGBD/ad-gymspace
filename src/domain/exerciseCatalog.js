/**
 * Catálogo de exercícios: equipamento, variante, instruções e mídia.
 *
 * Mídia: imagens vêm do free-exercise-db (Unlicense / domínio público), copiadas
 * localmente em public/media/exercises. `match` declara a fidelidade:
 *  - "exact": a mídia mostra o mesmo exercício/equipamento do plano.
 *  - "similar": mídia de variante próxima; a legenda informa a diferença.
 * Sem entrada em `media`, a interface mostra só instruções textuais.
 * Não há vídeos verificados: `video` permanece ausente em todos os itens.
 * As instruções são orientações gerais do padrão de movimento, não prescrição.
 */
export const MEDIA_SOURCE = Object.freeze({
  name: "free-exercise-db",
  url: "https://github.com/yuhonas/free-exercise-db",
  license: "Unlicense (domínio público)",
});

const GENERAL_NOTE =
  "Orientação geral de técnica; ajuste ao seu equipamento e interrompa o movimento se sentir dor.";

/** @type {Record<string, {prep: string[], exec: string[], mistakes: string[], notes: string[]}>} */
const PATTERNS = {
  pressMachine: {
    prep: [
      "Ajuste o assento para que as pegadas fiquem na altura do meio do peito.",
      "Apoie escápulas e lombar no encosto e os pés no chão.",
    ],
    exec: [
      "Empurre as pegadas até estender os braços sem travar os cotovelos.",
      "Volte devagar, controlando a fase de retorno até alongar o peito com conforto.",
      "Expire ao empurrar e inspire ao retornar.",
    ],
    mistakes: [
      "Tirar as costas do encosto ou elevar os ombros.",
      "Usar carga que obriga a bater o peso ou encurtar o movimento.",
    ],
    notes: ["Dor no ombro: reduza a amplitude ou a carga e reavalie o ajuste."],
  },
  incline: {
    prep: [
      "Ajuste o assento ou o banco para a inclinação desejada.",
      "Mantenha escápulas firmes no apoio e pés estáveis.",
    ],
    exec: [
      "Empurre em direção ao alto do peito até estender os braços.",
      "Retorne com controle, sem deixar os ombros avançarem.",
    ],
    mistakes: [
      "Arquear a lombar para compensar a carga.",
      "Descer rápido e rebater o peso.",
    ],
    notes: ["Halteres e máquinas guiam o movimento de formas diferentes."],
  },
  fly: {
    prep: [
      "Ajuste o assento para que os braços fiquem na altura do peito.",
      "Mantenha o tronco apoiado e os cotovelos levemente flexionados.",
    ],
    exec: [
      "Aproxime as pegadas à frente do peito em arco, sem alterar a flexão do cotovelo.",
      "Volte devagar até sentir alongamento confortável do peito.",
    ],
    mistakes: [
      "Transformar o movimento em um supino (flexionar e estender o cotovelo).",
      "Abrir além da amplitude confortável do ombro.",
    ],
    notes: [],
  },
  curl: {
    prep: [
      "Posicione-se com o cotovelo fixo no apoio ou junto ao tronco.",
      "Pegada firme, punhos neutros.",
    ],
    exec: [
      "Flexione o cotovelo até contrair o bíceps, sem mover o ombro.",
      "Desça controlando até quase estender o braço.",
    ],
    mistakes: [
      "Balançar o tronco para ajudar a subir.",
      "Estender o cotovelo rápido na descida.",
    ],
    notes: [
      "Barra, halteres e máquina distribuem a tensão de formas distintas.",
    ],
  },
  wrist: {
    prep: [
      "Apoie o antebraço de modo que só o punho se mova.",
      "Use carga leve o bastante para controlar a amplitude.",
    ],
    exec: [
      "Flexione o punho até o fim da amplitude confortável.",
      "Retorne devagar, sem soltar a pegada.",
    ],
    mistakes: ["Usar carga que faz o antebraço sair do apoio."],
    notes: [],
  },
  plank: {
    prep: ["Apoie antebraços e pontas dos pés; cotovelos sob os ombros."],
    exec: [
      "Mantenha o corpo alinhado da cabeça aos calcanhares, abdômen firme.",
      "Respire de forma contínua durante o tempo registrado.",
    ],
    mistakes: [
      "Deixar o quadril cair ou subir demais.",
      "Prender a respiração.",
    ],
    notes: ["Exercício por tempo: registre segundos, não repetições."],
  },
  legPress: {
    prep: [
      "Ajuste o encosto e posicione os pés na plataforma na largura dos ombros.",
      "Mantenha quadril e lombar apoiados.",
    ],
    exec: [
      "Empurre a plataforma sem travar os joelhos.",
      "Desça com controle até uma amplitude em que o quadril não saia do banco.",
    ],
    mistakes: [
      "Descer tanto que a lombar se desprende do encosto.",
      "Travar os joelhos no topo.",
    ],
    notes: ["A posição dos pés muda a ênfase entre quadríceps e glúteos."],
  },
  hack: {
    prep: [
      "Posicione costas e ombros no apoio e os pés na plataforma.",
      "Destrave a máquina conforme o equipamento.",
    ],
    exec: [
      "Flexione os joelhos com controle e empurre de volta sem travá-los.",
      "Mantenha os joelhos alinhados com a direção dos pés.",
    ],
    mistakes: [
      "Deixar os joelhos colapsarem para dentro.",
      "Usar carga que reduz a amplitude.",
    ],
    notes: [],
  },
  legCurl: {
    prep: [
      "Alinhe o eixo da máquina ao joelho e ajuste o apoio da perna.",
      "Fixe o quadril no assento.",
    ],
    exec: [
      "Flexione os joelhos levando o rolo em direção aos glúteos.",
      "Retorne devagar, sem deixar o peso bater.",
    ],
    mistakes: ["Levantar o quadril do assento.", "Usar impulso."],
    notes: [],
  },
  legExt: {
    prep: [
      "Alinhe o eixo da máquina ao joelho; apoio do tornozelo logo acima do pé.",
    ],
    exec: [
      "Estenda os joelhos até contrair o quadríceps.",
      "Desça com controle sem relaxar totalmente a tensão.",
    ],
    mistakes: ["Balançar o corpo.", "Bater o peso na fase de retorno."],
    notes: [],
  },
  abductor: {
    prep: [
      "Sente com as costas apoiadas e as pernas contra as almofadas.",
      "Ajuste a abertura inicial para uma amplitude confortável.",
    ],
    exec: [
      "Abra as pernas contra a resistência e retorne devagar.",
      "Mantenha o tronco estável.",
    ],
    mistakes: ["Usar impulso do tronco.", "Deixar o peso bater no retorno."],
    notes: [],
  },
  calf: {
    prep: [
      "Posicione a ponta dos pés na plataforma ou apoio.",
      "Ajuste o equipamento para permitir amplitude completa.",
    ],
    exec: [
      "Eleve os calcanhares ao máximo e faça uma pausa breve no topo.",
      "Desça controlando até alongar a panturrilha.",
    ],
    mistakes: [
      "Fazer repetições curtas e rápidas.",
      "Flexionar o joelho para ajudar o movimento.",
    ],
    notes: [],
  },
  pulldown: {
    prep: [
      "Ajuste o apoio das coxas e escolha a pegada indicada no plano.",
      "Incline levemente o tronco e firme as escápulas.",
    ],
    exec: [
      "Puxe a barra em direção ao peito, levando os cotovelos para baixo.",
      "Retorne com controle até alongar os dorsais.",
    ],
    mistakes: [
      "Puxar com impulso do tronco.",
      "Elevar os ombros em direção às orelhas.",
    ],
    notes: [
      "Se sentir desconforto no ombro, ajuste a pegada ou substitua o exercício.",
    ],
  },
  strArm: {
    prep: [
      "Em pé, com leve inclinação do tronco e a corda ou barra na altura do alto.",
      "Braços estendidos, cotovelos levemente flexionados.",
    ],
    exec: [
      "Leve as mãos em arco até as coxas mantendo os braços quase estendidos.",
      "Retorne devagar sem perder a tensão nos dorsais.",
    ],
    mistakes: [
      "Flexionar e estender os cotovelos (vira um tríceps).",
      "Balançar o tronco.",
    ],
    notes: [],
  },
  row: {
    prep: [
      "Ajuste o assento e o apoio do peito.",
      "Segure as pegadas com os braços estendidos e as escápulas relaxadas à frente.",
    ],
    exec: [
      "Puxe os cotovelos para trás aproximando as escápulas.",
      "Retorne devagar até alongar as costas.",
    ],
    mistakes: [
      "Afastar o peito do apoio.",
      "Puxar com os ombros elevados ou com impulso.",
    ],
    notes: [],
  },
  pushdown: {
    prep: [
      "Em pé, próximo à polia, cotovelos junto ao tronco.",
      "Pegada firme na barra, punhos neutros.",
    ],
    exec: [
      "Estenda os cotovelos até contrair o tríceps.",
      "Retorne controlando até cerca de 90° de flexão.",
    ],
    mistakes: [
      "Afastar os cotovelos do corpo.",
      "Inclinar o tronco para empurrar com o peso do corpo.",
    ],
    notes: ["Barra reta, corda e V mudam a posição dos punhos."],
  },
  overheadTri: {
    prep: [
      "De costas para a polia, cotovelos apontando para frente e junto à cabeça.",
      "Tronco estável, abdômen firme.",
    ],
    exec: [
      "Estenda os cotovelos à frente e acima da cabeça.",
      "Volte devagar até alongar o tríceps.",
    ],
    mistakes: [
      "Abrir demais os cotovelos.",
      "Arquear a lombar para completar a repetição.",
    ],
    notes: [],
  },
  hipThrust: {
    prep: [
      "Apoie a parte superior das costas no banco e os pés no chão na largura dos quadris.",
      "Posicione a carga sobre o quadril de forma estável.",
    ],
    exec: [
      "Eleve o quadril até alinhar tronco e coxas, contraindo os glúteos.",
      "Desça com controle sem relaxar totalmente.",
    ],
    mistakes: [
      "Hiperestender a lombar no topo.",
      "Empurrar com os dedos dos pés em vez dos calcanhares.",
    ],
    notes: [
      "A versão no Smith guia a barra; o vídeo/imagem pode usar barra livre.",
    ],
  },
};

const img = (slug, sourceName, match, caption) => ({
  match,
  sourceName,
  caption,
  images: [`media/exercises/${slug}-0.jpg`, `media/exercises/${slug}-1.jpg`],
});

/** @type {Record<string, any>} */
export const EXERCISE_CATALOG = Object.freeze({
  supino_plano_na_maquina: {
    equipment: "Máquina",
    variant: "Supino sentado na máquina",
    pattern: "pressMachine",
    media: img(
      "machine_bench_press",
      "Machine Bench Press",
      "exact",
      "Supino na máquina",
    ),
  },
  supino_inclinado_na_maquina: {
    equipment: "Máquina",
    variant: "Supino inclinado na máquina",
    pattern: "incline",
    media: img(
      "leverage_incline_chest_press",
      "Leverage Incline Chest Press",
      "similar",
      "Supino inclinado em máquina articulada; o seu aparelho pode ter pegada diferente",
    ),
  },
  crucifixo_na_maquina_peck_deck: {
    equipment: "Máquina (peck deck)",
    variant: "Crucifixo sentado",
    pattern: "fly",
    media: img(
      "butterfly",
      "Butterfly",
      "exact",
      "Crucifixo na máquina (butterfly)",
    ),
  },
  rosca_scott: {
    equipment: "Banco Scott",
    variant: "Rosca Scott",
    pattern: "curl",
    media: img(
      "preacher_curl",
      "Preacher Curl",
      "similar",
      "Rosca Scott com barra; o plano não especifica a barra",
    ),
  },
  rosca_martelo_com_halteres: {
    equipment: "Halteres",
    variant: "Rosca martelo (pegada neutra)",
    pattern: "curl",
    media: img(
      "hammer_curls",
      "Hammer Curls",
      "exact",
      "Rosca martelo com halteres",
    ),
  },
  flexao_de_punho_na_polia_com_apoio: {
    equipment: "Polia",
    variant: "Flexão de punho na polia",
    pattern: "wrist",
    media: img(
      "cable_wrist_curl",
      "Cable Wrist Curl",
      "similar",
      "Flexão de punho na polia; o apoio pode diferir",
    ),
  },
  prancha_frontal: {
    equipment: "Peso corporal",
    variant: "Prancha frontal (por tempo)",
    pattern: "plank",
    media: img("plank", "Plank", "exact", "Prancha frontal"),
  },
  leg_press_hack: {
    equipment: "Leg press",
    variant: "Leg press (o plano cita Leg Press / Hack)",
    pattern: "legPress",
    media: img(
      "leg_press",
      "Leg Press",
      "similar",
      "Leg press; o rótulo do plano também cita Hack",
    ),
  },
  hack_leg_hack_squat: {
    equipment: "Máquina hack",
    variant: "Agachamento hack",
    pattern: "hack",
    media: img(
      "hack_squat",
      "Hack Squat",
      "exact",
      "Agachamento hack na máquina",
    ),
  },
  cadeira_flexora: {
    equipment: "Cadeira flexora",
    variant: "Flexão de joelhos sentado",
    pattern: "legCurl",
    media: img(
      "seated_leg_curl",
      "Seated Leg Curl",
      "exact",
      "Cadeira flexora",
    ),
  },
  cadeira_extensora: {
    equipment: "Cadeira extensora",
    variant: "Extensão de joelhos sentado",
    pattern: "legExt",
    media: img(
      "leg_extensions",
      "Leg Extensions",
      "exact",
      "Cadeira extensora",
    ),
  },
  cadeira_abdutora: {
    equipment: "Cadeira abdutora",
    variant: "Abdução sentado",
    pattern: "abductor",
    media: img("thigh_abductor", "Thigh Abductor", "exact", "Cadeira abdutora"),
  },
  panturrilha_sentada: {
    equipment: "Máquina de panturrilha sentado",
    variant: "Elevação de panturrilha sentado",
    pattern: "calf",
    media: img(
      "seated_calf_raise",
      "Seated Calf Raise",
      "exact",
      "Panturrilha sentada na máquina",
    ),
  },
  pulldown_na_polia_com_pegada_neutra_fechada: {
    equipment: "Polia alta",
    variant: "Pulldown pegada neutra fechada",
    pattern: "pulldown",
    media: img(
      "close_grip_front_lat_pulldown",
      "Close-Grip Front Lat Pulldown",
      "similar",
      "Pulldown de pegada fechada; a pegada neutra pode exigir outro pegador",
    ),
  },
  remada_com_peito_apoiado_na_maquina: {
    equipment: "Máquina com apoio de peito",
    variant: "Remada com peito apoiado",
    pattern: "row",
    media: null,
  },
  pulldown_com_corda_e_bracos_estendidos: {
    equipment: "Polia alta com corda",
    variant: "Pulldown com braços estendidos",
    pattern: "strArm",
    media: img(
      "rope_straight_arm_pulldown",
      "Rope Straight-Arm Pulldown",
      "exact",
      "Pulldown com corda e braços estendidos",
    ),
  },
  triceps_na_polia_com_barra: {
    equipment: "Polia com barra",
    variant: "Tríceps na polia (barra)",
    pattern: "pushdown",
    media: img(
      "triceps_pushdown",
      "Triceps Pushdown",
      "similar",
      "Tríceps na polia; o acessório pode diferir da barra do plano",
    ),
  },
  extensao_de_triceps_acima_da_cabeca_na_polia: {
    equipment: "Polia",
    variant: "Extensão acima da cabeça",
    pattern: "overheadTri",
    media: img(
      "triceps_overhead_extension_with_rope",
      "Triceps Overhead Extension with Rope",
      "similar",
      "Extensão acima da cabeça com corda",
    ),
  },
  supino_inclinado_com_halteres: {
    equipment: "Halteres",
    variant: "Supino inclinado com halteres",
    pattern: "incline",
    media: img(
      "incline_dumbbell_press",
      "Incline Dumbbell Press",
      "exact",
      "Supino inclinado com halteres",
    ),
  },
  chest_press_na_maquina: {
    equipment: "Máquina",
    variant: "Chest press sentado",
    pattern: "pressMachine",
    media: img(
      "leverage_chest_press",
      "Leverage Chest Press",
      "similar",
      "Chest press em máquina articulada",
    ),
  },
  crucifixo_no_cabo: {
    equipment: "Cabos",
    variant: "Crucifixo no cabo",
    pattern: "fly",
    media: img(
      "cable_crossover",
      "Cable Crossover",
      "similar",
      "Cruzamento de cabos; a altura da polia pode diferir",
    ),
  },
  rosca_direta_com_barra: {
    equipment: "Barra",
    variant: "Rosca direta em pé",
    pattern: "curl",
    media: img(
      "barbell_curl",
      "Barbell Curl",
      "exact",
      "Rosca direta com barra",
    ),
  },
  rosca_inclinada_com_halteres: {
    equipment: "Halteres e banco inclinado",
    variant: "Rosca inclinada",
    pattern: "curl",
    media: img(
      "incline_dumbbell_curl",
      "Incline Dumbbell Curl",
      "exact",
      "Rosca inclinada com halteres",
    ),
  },
  elevacao_pelvica_no_smith: {
    equipment: "Smith",
    variant: "Elevação pélvica no Smith",
    pattern: "hipThrust",
    media: img(
      "barbell_hip_thrust",
      "Barbell Hip Thrust",
      "similar",
      "Elevação pélvica com barra livre; o plano usa o Smith",
    ),
  },
  leg_press_45: {
    equipment: "Leg press 45°",
    variant: "Leg press 45°",
    pattern: "legPress",
    media: img(
      "leg_press",
      "Leg Press",
      "similar",
      "Leg press; o ângulo da plataforma pode diferir",
    ),
  },
  remada_com_peito_apoiado: {
    equipment: "Máquina com apoio de peito",
    variant: "Remada com peito apoiado",
    pattern: "row",
    media: null,
  },
  panturrilha_no_leg_press: {
    equipment: "Leg press",
    variant: "Panturrilha no leg press",
    pattern: "calf",
    media: img(
      "calf_press_on_the_leg_press_machine",
      "Calf Press On The Leg Press Machine",
      "exact",
      "Panturrilha no leg press",
    ),
  },
});

/**
 * @param {string} id
 * @returns {{equipment: string, variant: string, instructions: {prep: string[], exec: string[], mistakes: string[], notes: string[]}, media: any|null, general: string}|null}
 */
export function getExerciseInfo(id) {
  const e = EXERCISE_CATALOG[id];
  if (!e) return null;
  return {
    equipment: e.equipment,
    variant: e.variant,
    instructions: PATTERNS[e.pattern],
    media: e.media,
    general: GENERAL_NOTE,
  };
}
