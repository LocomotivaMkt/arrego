/**
 * A voz da Arrego. Este arquivo é a personalidade do app — trate o texto daqui
 * com o mesmo cuidado que você trataria um cálculo de juros.
 *
 * ┌─────────────────────── CONTRATO DE TOM ───────────────────────────────┐
 * │ A Arrego é passivo-agressiva, sarcástica e debochada. Ela NÃO é cruel. │
 * │                                                                        │
 * │ 1. A ironia recai sobre o NÚMERO e sobre o HÁBITO. Jamais sobre a      │
 * │    pessoa. "R$ 340 em assinaturas é 17% da sua renda" pode. "Você é    │
 * │    irresponsável" não pode, não pode disfarçado, não pode em tom de    │
 * │    brincadeira.                                                        │
 * │ 2. TODA fala termina com uma saída prática. Sarcasmo sem saída é só    │
 * │    maldade. Se a fala não cabe uma saída, a fala está errada.          │
 * │ 3. Dívida nunca vira piada. Parcela nunca vira piada. A pessoa que     │
 * │    está no vermelho já sabe que está — repetir com deboche não informa │
 * │    nada, só machuca. Nesses bancos o humor sai e entra a aliada.       │
 * │ 4. Nada sobre corpo, aparência, inteligência ou valor pessoal. Nunca.  │
 * │ 5. Quando a pessoa ACERTA, o sarcasmo sai de cena. Vitória é limpa.    │
 * │                                                                        │
 * │ Por quê: vergonha financeira faz jovem fechar o app e não voltar. Um   │
 * │ app que humilha não é usado, e um app não usado não ajuda ninguém.     │
 * │ O humor aqui é cúmplice ("olha esse número comigo"), nunca humilhante  │
 * │ ("olha o que você fez"). Na dúvida entre a piada e a pessoa: a pessoa. │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Placeholders usados nas falas (preenchidos por `fill`):
 *   {nome}  primeiro nome da pessoa      {valor} dinheiro já formatado
 *   {pct}   porcentagem já formatada     {meta}  rótulo do objetivo
 *   {tempo} duração já humanizada        {qtd}   contagem COM o substantivo
 *                                                ("1 assinatura" / "3 assinaturas"),
 *                                                para não gerar "1 assinaturas".
 *
 * Ao acrescentar falas: mínimo de 6 por banco, senão a repetição fica óbvia.
 * Escreva a fala inteira sem saber o número — se ela só funciona com um valor
 * específico, ela vai soar absurda com outro.
 */

export type LineBank = Record<string, readonly string[]>;

/**
 * Hash FNV-1a das partes. Determinístico e estável entre sessões — é o que
 * garante que a mesma dica, no mesmo mês, seja sempre a mesma frase.
 */
export function hashSeed(...parts: (string | number)[]): number {
  const input = parts.join('');
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Escolhe uma fala de forma determinística: mesma seed, mesma fala, sempre.
 *
 * Nada de Math.random aqui. A dica é recalculada a cada render da tela; com
 * aleatoriedade real a frase trocaria no meio da leitura e o app pareceria
 * quebrado. A variedade vem da seed mudar (de mês em mês), não do acaso.
 *
 * O embaralhamento antes do módulo não é enfeite: seeds vizinhas têm bits
 * baixos parecidos e `seed % length` cru cairia quase sempre na mesma fala.
 */
export function pickLine(lines: readonly string[], seed: number): string {
  if (lines.length === 0) return '';
  let mixed = (seed | 0) ^ 0x9e3779b9;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
  mixed ^= mixed >>> 15;
  return lines[(mixed >>> 0) % lines.length] ?? lines[0] ?? '';
}

/**
 * Troca {chave} pelo valor. Chave sem valor fica visível como {chave} de
 * propósito: um placeholder cru na tela é um bug que alguém conserta;
 * "undefined" no meio da frase é um bug que ninguém entende.
 */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => vars[key] ?? match);
}

/**
 * A Arrego chama pelo primeiro nome — "João Pedro da Silva, faltam R$ 340"
 * soa como cobrança de banco, e banco é exatamente o que ela não é.
 * Sem nome (perfil ainda não criado), "Chefe" resolve: serve para qualquer
 * pessoa, não tem gênero e já vem com o deboche embutido.
 */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ? first : 'Chefe';
}

type DayPart = 'madrugada' | 'manha' | 'tarde' | 'noite';

const GREETINGS_BY_PART: Record<DayPart, readonly string[]> = {
  madrugada: [
    '{nome}, são altas horas e você está conferindo dinheiro. Ou está tudo bem, ou está tudo muito não bem. Vamos ver.',
    'Abrir app de finanças de madrugada é um pedido de socorro bem específico. Estou aqui. Respira.',
    'A essa hora o dinheiro está tão dormindo quanto você deveria, {nome}. Mas já que acordou, bora olhar.',
    '3 da manhã é o horário em que todo mundo decide organizar a vida financeira. Bem-vindo ao clube, {nome}.',
    '{nome}, nada que você ler aqui agora vai parecer menos assustador do que é. É a hora, não é o número. Amanhã os mesmos dados parecem tratáveis.',
    'Insônia e planilha mental. Clássico. Já que você está de pé, {nome}, vamos usar isso.',
  ],
  manha: [
    'Bom dia, {nome}. Antes do café, vamos ver o estrago. Ou a ausência dele.',
    '{nome} acordou e a primeira coisa que fez foi checar dinheiro. Disciplina ou ansiedade? O resultado é o mesmo. Bom dia.',
    'Bom dia. Seus números dormiram bem — não mudaram nada desde ontem. É assim que funciona. Vamos ao que interessa.',
    'Manhã, {nome}. O melhor horário pra decidir sobre dinheiro é agora, antes de o dia te convencer de que você merece coisas.',
    'Bom dia, {nome}. Começar o dia olhando a real é corajoso. Segue.',
    'Café e consciência financeira. Um dos dois é agradável. Bom dia, {nome}.',
  ],
  tarde: [
    'Boa tarde, {nome}. Metade do dia foi, metade do dinheiro talvez também. Vamos conferir.',
    '{nome}, boa tarde. Hora perfeita: você já gastou o suficiente pra ter dados e ainda dá tempo de parar.',
    'Boa tarde. Se você abriu isso depois do almoço, eu tenho um palpite sobre quanto custou o almoço.',
    '{nome}, olhar as finanças no meio do dia é sinal de que alguma coisa te cutucou. Boa tarde. Vamos achar o quê.',
    'Boa tarde, {nome}. Vim com números, não com julgamento. Os números às vezes julgam sozinhos — aí não é culpa minha.',
    'Boa tarde. Você tem alguns minutos e eu tenho algumas observações. Vamos negociar.',
  ],
  noite: [
    'Boa noite, {nome}. Fim de dia é quando a conta chega. Literalmente. Vamos ver a sua.',
    '{nome}, boa noite. Nada como terminar o dia revisando escolhas. Bora.',
    'Boa noite. Você sobreviveu ao dia. Seu saldo, veremos.',
    'Fim de expediente, {nome}. Última tarefa: encarar os números por 2 minutos. Depois pode fechar o app e me esquecer.',
    'Boa noite, {nome}. Prometo ser rápida e razoavelmente honesta.',
    '{nome}, boa noite. Vamos fazer isso rápido pra você voltar pro que estava assistindo — que, aliás, você paga uma assinatura pra ver.',
  ],
};

/** Todas as saudações, achatadas. A escolha por horário mora em `greeting`. */
export const GREETINGS: readonly string[] = [
  ...GREETINGS_BY_PART.madrugada,
  ...GREETINGS_BY_PART.manha,
  ...GREETINGS_BY_PART.tarde,
  ...GREETINGS_BY_PART.noite,
];

function dayPartOf(hour: number): DayPart {
  if (hour < 5) return 'madrugada';
  if (hour < 12) return 'manha';
  if (hour < 18) return 'tarde';
  return 'noite';
}

/**
 * O período do dia entra na seed em vez de filtrar a lista: assim a saudação
 * acompanha o relógio, continua estável dentro do mesmo período (não troca a
 * cada render) e cada período mantém as 6 variações inteiras.
 */
export function greeting(name: string, seed: number): string {
  const part = dayPartOf(new Date().getHours());
  return fill(pickLine(GREETINGS_BY_PART[part], hashSeed(seed, part)), {
    nome: firstName(name),
  });
}

/**
 * `as const satisfies LineBank` e não `: LineBank`: a anotação direta viraria
 * uma index signature e, com noUncheckedIndexedAccess, `LINES.negativeFlow`
 * passaria a ser `readonly string[] | undefined` em todo lugar que usa.
 */
export const LINES = {
  /** Nenhuma renda cadastrada. Sem régua, nenhuma outra conta significa nada. */
  noIncome: [
    'Tenho tudo aqui: suas contas, seus gastos, seus sonhos. Falta um detalhe pequeno — de onde vem o dinheiro. Sem renda, qualquer conta que eu fizer dá o mesmo resultado: zero. Cadastra sua renda e eu volto a ser útil.',
    '{nome}, você me contou o que gasta mas não me contou o que ganha. É pedir pra eu adivinhar o final do filme tendo visto só os créditos. Bota sua renda ali e eu paro de chutar.',
    'Renda cadastrada: nenhuma. Estou assumindo que você se sustenta com fé e boa vontade. Se não for o caso, cadastra o que entra — salário, mesada, bico, pix da vó. Vale tudo.',
    'Sem renda no app, eu não tenho régua. R$ 200 em delivery é muito ou é pouco? Não faço ideia. Me dá o número que entra e eu passo a ter opinião.',
    'Você me deu a metade triste da história. Falta a parte em que o dinheiro chega. Cadastra sua renda — mesmo pouca, mesmo irregular. Pouco e irregular também é número.',
    'Todo mundo aqui está esperando: as contas, as metas, eu. Estamos esperando você dizer quanto ganha. É o primeiro campo, leva 20 segundos e destrava o resto.',
  ],

  /** Mês fecha no vermelho. Aqui o deboche sai de cena — a conta já dói sozinha. */
  negativeFlow: [
    'Suas contas somam mais que sua renda. Faltam {valor} pra fechar o mês, e faltar não é fracasso — é aritmética. Mas aritmética não se resolve sozinha. Abre seus gastos e a gente corta {valor} de algum lugar.',
    '{nome}, o mês está {valor} no vermelho antes de você gastar um centavo por prazer. Isso não é sobre você ser ruim com dinheiro, é sobre ter mais conta do que renda. Vamos olhar a lista e escolher o que sai.',
    'Números não têm sentimento, então vou falar por eles: faltam {valor}. Esse buraco vai ser tapado de algum jeito — ou por você agora, com escolha, ou pelo cartão depois, com juros. Prefiro o primeiro. Bora cortar.',
    'Tem {valor} de conta a mais do que dinheiro. Sei que você já sabia. A diferença é que agora está escrito, com número, e dá pra fazer algo com isso. Começa pelo maior gasto da lista.',
    'Alerta sem drama: sua renda não cobre seus compromissos por {valor}. Não é o fim, é um mês apertado que precisa de uma decisão. Uma. Escolhe um gasto pra sair e o buraco encolhe.',
    '{valor} é o tamanho do buraco. Não vou fingir que é pouco e não vou fazer piada com isso. Vou fazer o que serve: te levar pros seus gastos pra gente achar {valor} pra cortar.',
  ],

  /** Fecha no zero a zero: sobra existe, mas não aguenta imprevisto. */
  tightFlow: [
    'Você fecha o mês no zero a zero. Sobram {valor} — {pct} da sua renda. Tecnicamente não é dívida. Na prática, é um mês sem margem pra nada dar errado. E às vezes dá. Acha um gasto de {valor} e transforma em folga.',
    '{pct} de sobra é aquele momento do filme em que o personagem passa raspando pela porta que fecha. Funciona. Até o dia em que o pneu fura. Corta uma assinatura e o susto fica mais barato.',
    'Sobrar {valor} num mês inteiro é sobreviver, não é planejar. E dá pra melhorar sem virar outra pessoa: um gasto recorrente a menos já dobra essa folga. Escolhe um.',
    'Sua margem é {pct}. Um imprevisto de R$ 200 vira crise — não porque você é irresponsável, mas porque {pct} não aguenta imprevisto nenhum. Vamos subir isso pra 10%, começando por um corte.',
    'Você está no fio. Sobram {valor} e todo mês parece que deu certo por sorte. Sorte não é estratégia. Abre seus gastos e escolhe o mais fácil de matar.',
    '{nome}, {pct} de folga é o suficiente pra dizer "tá tranquilo" e não o suficiente pra estar tranquilo. Um corte pequeno agora vale mais que um susto grande depois. Bora ver a lista.',
  ],

  /** Assinaturas passando de 10% da renda. O gasto que ninguém vê sair. */
  subscriptionHeavy: [
    '{qtd}. {valor} por mês. {pct} da sua renda. Não estou julgando. Só deixando o número aqui, bem grande, na sua frente. Cancela uma e a gente não fala mais nisso.',
    '{valor} por mês em {qtd} — {pct} do que você ganha. Se vale a pena, deixa quieto. Se você hesitou agora, já sabe qual cancelar.',
    '{pct} da sua renda vira assinatura todo mês, no automático, sem você tocar em nada. É o gasto mais educado que existe: nunca avisa, nunca incomoda, só sai. {qtd}, {valor}. Revisa a lista.',
    '{qtd} comendo {pct} da sua renda. Tem alguma aí que você esqueceu que assinou e que continua sendo cobrada com muito carinho. Abre a lista e mata a esquecida.',
    '{valor} por mês em {qtd}. Ninguém te pergunta se pode — a cobrança só chega, se serve, e vai embora com {pct} do seu dinheiro. Uma revisão de 2 minutos resolve.',
    'Matemática rápida: {valor} por mês em {qtd} é {pct} do que você ganha. Por ano é bem mais do que você imagina, e eu não vou fazer essa conta agora pra não estragar seu dia. Cancela uma. Só uma.',
  ],

  /** Parcelas passando de 30% da renda. Nunca culpar — parcelar não é crime. */
  cardHeavy: [
    '{pct} da sua renda já está comprometida com parcelas: {valor} por mês. É o seu "eu do passado" cobrando aluguel do seu "eu do presente". Não parcela mais nada esse mês e o futuro melhora sozinho.',
    '{valor} em parcelas todo mês, {pct} do que entra. Parcelar não é crime e não te faz irresponsável — mas cada 12x é um compromisso de um ano com uma versão sua que ainda nem existe. Segura o cartão até isso baixar.',
    '{pct} da sua renda já tem dono antes de você acordar: {valor} em parcelas. A boa notícia é que parcela acaba. A ruim é que só acaba se você parar de criar novas. Olha no cartão qual termina primeiro.',
    'Seu cartão consome {pct} da sua renda em parcelas ({valor}). Cada "são só 10x de R$ 89" virou isso aqui. Não é pra se martirizar, é pra parar de somar. Abre o cartão e vê o que dá pra quitar antes.',
    '{valor} por mês em parcelas. Você já gastou esse dinheiro — só está pagando em câmera lenta. O melhor movimento agora é o mais chato: não parcelar nada novo até {pct} virar um número menor.',
    '{pct} da renda em parcelas é o tipo de número que aperta sem fazer barulho. Você sente no fim do mês e não sabe de onde veio. Veio daqui: {valor}. Lista o que ainda falta no cartão e para de aumentar a fila.',
  ],

  /** Guardando 20%+. Elogio passivo-agressivo — reconhece sem bajular. */
  goodSavings: [
    '{pct} da sua renda sobra. Isso é bom. Estou desconfortável com isso: meu trabalho é reclamar e você me deixou sem assunto. Já que sobraram {valor}, manda pra uma meta antes que vire delivery.',
    'Você guarda {pct}. A média do país não faz isso. Não vou te dar parabéns porque você já sabe. Vou dizer o que falta: {valor} parado não vira nada. Bota numa meta.',
    '{valor} de sobra, {pct} da renda. Olha, tá bom. Tá bom mesmo. Agora não deixa esse dinheiro solto na conta, porque dinheiro solto some sem explicação. Dá um nome pra ele nos objetivos.',
    'Sobrar {pct} não foi sorte, foi escolha. Reconhecido. O próximo erro clássico é achar que sobrou porque você merece um agrado — sobrou porque você segurou. Manda {valor} pra uma meta e segue.',
    '{pct} guardados. Você está oficialmente na parte chata e correta do dinheiro. Fica aqui. O passo seguinte é destinar {valor} pra algo com nome, senão o mês que vem come tudo.',
    'Sua taxa é {pct}. Não vou fazer piada — você está indo bem e eu sei perder. Só não deixa {valor} boiando na conta corrente. Escolhe uma meta e joga lá dentro.',
  ],

  /** Guardando entre 5% e 10%: existe, mas ainda não conta. */
  lowSavings: [
    'Você guarda {pct} da sua renda. Existe, mas é pouco: nesse ritmo, um mês ruim apaga três meses bons. Sobe pra 10% e a conta muda de personalidade.',
    'Sobraram {valor} — {pct}. É o começo de alguma coisa, e eu prefiro isso a zero. Só não confunde "começou" com "resolveu". Acha mais {valor} em algum gasto e dobra a folga.',
    '{pct}. Você guarda o suficiente pra dizer que guarda e não o suficiente pra que isso importe. Um corte pequeno resolve — começa pelo gasto que você mais hesitou em cadastrar.',
    'Sobra {valor} por mês. Junta 12 meses e ainda não dá pra um susto médio. Não é derrota, é escala errada. Sobe de {pct} pra 10% e a matemática vira do seu lado.',
    'Guardar {pct} é melhor que 0% e pior que dormir tranquilo. A distância entre os dois é menor do que parece: um gasto recorrente a menos. Abre a lista.',
    '{nome}, {pct} de poupança é aquele esforço que quase conta. Quase. Falta pouco pra virar de verdade — {valor} a mais por mês e você sai da zona do "quase".',
  ],

  /** Sem meta de emergência. A meta mais chata e a única que salva. */
  noEmergencyFund: [
    'Não existe reserva de emergência aqui. Existe vida real, que quebra geladeira e demite gente sem aviso. O número que te protege é {valor}. Cria essa meta hoje, mesmo que comece com R$ 20.',
    'Sua reserva de emergência é {valor} e, no momento, ela é uma ideia abstrata. Enquanto for abstrata, qualquer imprevisto vira cartão de crédito. Cria a meta e começa pequeno — pequeno e existindo já é infinitamente mais que zero.',
    '{nome}, todo plano financeiro bonito morre no primeiro imprevisto sem reserva. Seu alvo é {valor}. Não precisa ter tudo hoje, precisa começar hoje. Abre objetivos e cria "Emergência".',
    'Reserva de emergência: inexistente. Alvo: {valor}. Sei que parece muito — é por isso que ninguém começa. O truque é não olhar pro total e olhar pro primeiro depósito. Cria a meta.',
    'Sem reserva, você não tem um plano: tem uma esperança. Esperança não paga conserto. Seu alvo é {valor} e o único passo de hoje é criar a meta. O resto vem depois.',
    'A meta mais chata do app é a que salva sua pele: {valor} de reserva. Ela não tem foto bonita, não dá pra postar, e é a única que te deixa dormir. Cria ela antes de qualquer outra.',
  ],

  /** Nenhuma meta cadastrada. Dinheiro sem destino sempre acha um. */
  noGoals: [
    'Zero metas cadastradas. Então seu dinheiro está indo pra... o que aparecer. E sempre aparece alguma coisa. Dá um nome pro que você quer e ele para de sumir.',
    '{nome}, dinheiro sem destino vira delivery. Não é filosofia, é estatística. Cria uma meta — pode ser boba, pode ser um fone, pode ser "sair da casa dos meus pais". Só precisa ter nome.',
    'Você não tem nenhum objetivo cadastrado. Dá pra viver assim: cada mês some e você não sabe pra onde. Ou você escreve um objetivo e passa a saber. Escolhe.',
    'Sem meta, sobrar dinheiro não é vitória — é um saldo esperando um motivo pra ir embora. Cria um objetivo e o saldo passa a ter um trabalho.',
    'Nenhuma meta. Nenhum plano. Nenhuma pressa, aparentemente. Vou parar por aqui e deixar o botão de criar objetivo bem visível pra você.',
    '{nome}, meta não é sobre disciplina, é sobre ter um alvo pra mirar. Sem alvo, todo tiro acerta o nada. Cria a primeira — a mais barata que te empolgar.',
  ],

  /** Meta fora do prazo, mas com ritmo > 0: existe um ETA, só que ruim. */
  goalTooSlow: [
    'Sabe {meta}? No seu ritmo, você chega lá em {tempo}. Seus netos vão adorar. Ou você sobe {valor} por mês e isso vira problema seu, não deles.',
    '{meta} no ritmo atual: {tempo}. O prazo que você mesmo escolheu diz outra coisa. Um de vocês dois está mentindo, e não sou eu. Sobe {valor} por mês e vocês voltam a se falar.',
    'Você quer {meta} numa data. A matemática quer {tempo}. A matemática costuma ganhar essas discussões. Empata com ela: {valor} a mais por mês.',
    'No ritmo de hoje, {meta} demora {tempo}. Não é falta de vontade, é falta de {valor} por mês. Vontade não deposita — depósito deposita.',
    '{meta} está fora do prazo que você mesmo definiu. Faltam {valor} por mês pra encaixar. Se não der, tudo bem: muda o prazo. Prazo é seu, não é lei. Só não deixa os dois números brigando em silêncio.',
    'Seu ritmo entrega {meta} em {tempo}. Seu prazo não concorda. Duas saídas honestas: sobe {valor} por mês, ou empurra a data e para de se cobrar por uma conta que nunca fechou.',
  ],

  /**
   * Meta com ritmo zero. Banco separado do `goalTooSlow` por gramática: o
   * {tempo} de lá é "7 anos" e nenhum template aceita "em nunca". Aqui a
   * projeção é "nunca" e a fala precisa dizer isso sem soar como sentença.
   */
  goalNeverAtPace: [
    'Seu ritmo em {meta} é zero. Zero vezes qualquer número de meses continua zero, então a resposta honesta é: nunca. Não é sentença, é só o que acontece se nada mudar. {valor} por mês já muda tudo.',
    '{meta} não anda porque não entra dinheiro ali. No ritmo atual você chega nunca — e isso não é drama, é multiplicação. Um depósito de {valor} tira o "nunca" da conta hoje.',
    'Vou ser direta sobre {meta}: sem depósito, nunca. Não porque você não consegue, mas porque ninguém chega a lugar nenhum parado. Deposita {valor} e a projeção volta a existir.',
    'A projeção de {meta} deu "nunca". Antes que isso soe pesado: "nunca" aqui só significa "nenhum depósito ainda". É o problema mais fácil do app inteiro de resolver. {valor} por mês e ele some.',
    '{meta}: ritmo zero, previsão nunca. Sabe o que conserta? Qualquer valor. Literalmente qualquer um. Começa com {valor} e a gente conversa de novo mês que vem.',
    'Enquanto não entrar dinheiro em {meta}, a data de chegada é nunca. Eu podia inventar um número bonito, mas você merece o real. E o real muda no minuto em que você depositar {valor}.',
  ],

  /** Meta dentro do prazo. Elogio contido — o risco agora é o tédio. */
  goalOnTrack: [
    '{meta} está no prazo: chega em {tempo} se você não fizer nada de diferente. E "não fazer nada de diferente" é exatamente o trabalho. Continua depositando {valor}.',
    'No ritmo atual, {meta} cumpre o prazo. Eu queria ter algo sarcástico pra dizer aqui e não tenho. Mantém os {valor} por mês.',
    '{meta}: dentro do combinado, {tempo} pra chegar. O perigo agora não é o dinheiro, é o tédio. Meta que dá certo é chata. Aguenta a chatice e deposita.',
    'Você prometeu {meta} numa data e está cumprindo. Raro. Segue assim: {valor} por mês, {tempo} restantes, zero surpresas.',
    '{meta} vai chegar em {tempo}, no prazo. Não mexe. Sério, não mexe: o jeito mais comum de perder uma meta é "reorganizar" ela.',
    'Tudo certo com {meta} — {tempo} no ritmo de hoje. Se sobrar dinheiro esse mês, joga aqui e antecipa. Se não sobrar, também está tudo bem. Só não para.',
  ],

  /** Meta batida. O sarcasmo sai de cena: a vitória é dela, limpa e inteira. */
  goalAchieved: [
    'Você bateu {meta}. {valor} juntados depósito por depósito, mês por mês, quando ninguém estava olhando. Isso foi você. Aproveita — e quando quiser, cria a próxima.',
    '{nome}, você bateu {meta}. {valor} completos. Sem sarcasmo, sem "mas", sem lição de moral: você disse que ia fazer e fez. Comemora direito. A próxima meta pode esperar uns dias.',
    'Meta batida: {meta}. {valor} no lugar certo. Quer saber a melhor parte? Agora você tem prova de que consegue. Isso vale mais que o dinheiro. Escolhe o próximo objetivo quando estiver pronto.',
    'Conseguiu: {meta}, {valor}, no seu ritmo, do seu jeito. Guarda esse sentimento, ele é o combustível da próxima. Parabéns de verdade, {nome}.',
    '{valor} guardados. {meta} está no bolso. Não vou estragar esse momento com nenhuma piada sobre o seu dinheiro. Você ganhou essa. Limpa, inteira, sua.',
    'Lembra do dia em que {meta} era só uma ideia meio ridícula no app? Pois é. {valor} depois, virou real. Vai comemorar. Depois a gente escolhe a próxima.',
  ],

  /** App recém-instalado. Uma tela vazia tem exatamente um próximo passo. */
  emptyState: [
    '{nome}, o app está vazio. Eu também. Sem dados, sou só uma tela bonita com opinião nenhuma. Cadastra sua renda primeiro — é o campo que destrava todo o resto.',
    'Bem-vindo. Aqui não tem nada ainda: nem renda, nem conta, nem meta. Sei que "cadastrar tudo" parece trabalhoso. Então não cadastra tudo: cadastra só quanto você ganha. Começa por aí.',
    'Zero dados, zero análises, zero comentários maldosos meus. Aproveita esse momento de paz — ele acaba assim que você cadastrar sua primeira despesa.',
    '{nome}, a tela vazia é o único estado em que o dinheiro parece simples. Vamos estragar isso juntos: cadastra sua renda e eu começo a trabalhar.',
    'Não tenho nada pra te dizer porque você não me deu nada. É justo. Bota sua renda e uma despesa — com dois números eu já consigo ter opinião.',
    'Tudo em branco por enquanto. A parte chata é agora: alguns minutos cadastrando renda e contas. Depois disso o app trabalha e você só lê. Começa pela renda.',
  ],

  /** Nenhuma regra disparou. Ela odeia não ter o que reclamar. */
  allGood: [
    'Olhei tudo: renda, contas, cartão, assinaturas, metas. Está tudo em ordem. Estou levemente irritada com isso. Sobram {valor} — coloca numa meta antes que eu ache um problema.',
    '{nome}, procurei um motivo pra te encher o saco e não achei. Sobram {valor}, as contas fecham, as metas andam. Segue exatamente assim.',
    'Nada quebrado por aqui. Sua vida financeira está entediante, que é o maior elogio que existe em finanças. Se quiser adiantar alguma meta, tem {valor} disponível.',
    'Relatório completo: está tudo bem. Sim, eu conferi duas vezes. Sim, eu queria ter achado algo. {valor} de folga — usa com propósito e a gente se fala mês que vem.',
    'Tudo certo, {nome}. Contas pagas, metas andando, folga de {valor}. Aproveita esse mês raro em que eu não tenho nada pra falar e reforça uma meta.',
    'Sem alarmes, sem vermelho, sem sermão. Você está no controle. O único conselho que sobra é o mais chato: continua. E manda {valor} pra uma meta.',
  ],

  /**
   * Pessoa sumida: os dados envelheceram e as análises viraram ficção.
   * Depende de "quando foi a última atualização", que não é um dado do
   * snapshot — por isso este banco é consumido pela UI, não por `insights.ts`.
   */
  lazyUser: [
    '{nome}, faz {tempo} que você não atualiza nada aqui. Seu dinheiro continuou se movendo, sabia? Ele não espera você abrir o app. Cadastra o que mudou.',
    'Sumiu por {tempo}. Sem julgamento — mas os números que estou te mostrando são de {tempo} atrás, então são ficção. Atualiza seus gastos e eu volto a falar a verdade.',
    'Última atualização: {tempo} atrás. Estou opinando sobre uma vida financeira que talvez nem exista mais. Me dá 2 minutos de dados novos.',
    'Você voltou, que bom. Só que os dados não se atualizaram sozinhos nesse tempo — nenhum app faz isso. Passa o olho nos gastos e ajusta o que mudou.',
    '{tempo} sem aparecer. Eu não guardo mágoa, eu guardo dados, e os seus estão velhos. Atualiza a renda e os gastos e a gente recomeça do zero, sem cobrança.',
    'Olha quem apareceu. Seus números estão parados no tempo há {tempo}. Não vou fazer drama: atualiza os gastos e eu paro de falar bobagem.',
  ],
} as const satisfies LineBank;
