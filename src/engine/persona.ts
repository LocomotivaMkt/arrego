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
 * Só nos bancos do plano (`plan*`), porque lá os três baldes aparecem na mesma
 * frase e um {valor} genérico não diria qual é qual:
 *   {reserva}  o balde da reserva       {objetivos} o balde dos objetivos
 *   {lazer}    o balde do lazer                     (todos já formatados)
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

  // ─────────────────────────── O PLANO DO MÊS ────────────────────────────
  // Bancos consumidos pela tela do plano. A régua de tom continua a mesma; o
  // que muda é que aqui a Arrego está dividindo dinheiro, e dividir dinheiro
  // é onde ela mais corre o risco de soar como palestrante. Não soa: ela dá o
  // número, dá o motivo e sai.

  /**
   * O plano fecha e cabe. Elogio passivo-agressivo — ela reconhece e reclama
   * de não ter do que reclamar. {reserva} {objetivos} {lazer}, nunca {valor}:
   * as três fatias aparecem juntas e precisam de nome próprio.
   */
  planReady: [
    'Plano do mês montado, e ele fecha: {reserva} pra reserva, {objetivos} pras metas, {lazer} pra viver. Passei um tempo procurando o erro. Não tem. Faz os três depósitos e me deixa sem assunto de novo mês que vem.',
    '{nome}, seu dinheiro finalmente tem endereço: {reserva} na reserva, {objetivos} nos objetivos, {lazer} no lazer. A parte difícil não foi essa divisão — foi você chegar aqui com sobra. Agora é só executar os três.',
    'Olha só, coube tudo: {reserva} de reserva, {objetivos} de meta e ainda {lazer} de lazer sem culpa. Não vou fingir surpresa. Tá, vou. Cumpre os três números e a gente repete isso em 30 dias.',
    'Plano fechado, {nome}. {reserva} pra emergência, {objetivos} pro que você quer, {lazer} pro presente. Três números, nenhum deles opcional — inclusive o do lazer. Transfere hoje, antes que o mês tenha ideias próprias.',
    'Dividi tudo: {reserva} de reserva, {objetivos} de metas, {lazer} de lazer. Bonito assim, parado na tela. Só que plano na tela rende exatamente 0% — move os valores hoje e ele começa a existir.',
    '{nome}, seu mês cabe em três caixas: {reserva} que te protege, {objetivos} que te leva a algum lugar e {lazer} que te faz aguentar as outras duas. Não é plano de monge, é plano que sobrevive ao fim de semana. Segue ele.',
    'Sem drama esse mês: {reserva} pra reserva, {objetivos} pras metas, {lazer} pra gastar de propósito. Conferi duas vezes procurando defeito, por esporte. Agenda os depósitos pro dia que a grana cai e pronto.',
  ],

  /** O plano fecha, mas raspando. Reconhece a organização sem chamar de conforto. */
  planTight: [
    'O plano fecha. Fecha raspando: {valor} pra dividir, {pct} da sua renda, e cada linha dele depende de nada dar errado. Como coisas dão errado, segue o plano hoje e acha um gasto pra cortar até o fim do mês.',
    '{nome}, dá pra dividir {valor}. Dá. Só que repartir {pct} da renda entre reserva, meta e lazer é dividir um pão de queijo entre três pessoas: todo mundo come, ninguém sai satisfeito. Corta uma despesa e o pão cresce.',
    'Plano montado com {valor} — {pct} do que entra. Ele funciona no papel, e no papel não existe imprevisto. Usa ele esse mês e, em paralelo, escolhe uma despesa pra matar. Mês que vem a divisão para de ser malabarismo.',
    'Sobram {pct} pra repartir: {valor} pra três baldes. É pouco, mas é seu e está organizado — mais do que a maioria consegue dizer. Só não confunde plano apertado com plano confortável. Um susto de R$ 200 desmonta esse aqui.',
    '{valor} pra dividir em três. Vou ser honesta: as fatias vão sair magras e você vai olhar pra elas com desdém. Olha assim mesmo — fatia magra que existe vence fatia gorda imaginária. Depois volta nos gastos e libera mais.',
    'O plano cabe: {valor}, {pct} de margem. Cabe do jeito que mala fecha quando você senta em cima. Faz os depósitos no começo do mês, senão o mês gasta a sua fatia por você e você nem vê passar.',
    '{nome}, {valor} é o que tem pra hoje, e eu prefiro dividir pouco a fingir que é muito. Trata cada real do plano como combinado, não como sugestão. Se quiser respirar, um gasto recorrente a menos muda esse {pct}.',
  ],

  /**
   * Não sobra nada pra dividir. Sem deboche: quem está no vermelho já sabe,
   * e repetir com piada não informa nada. {valor} é o tamanho do buraco — a
   * mesma convenção de `negativeFlow`, pra fala e número não se contradizerem.
   */
  planImpossible: [
    'Não tem o que dividir esse mês. Seus compromissos passaram da renda em {valor}, e plano só existe depois que sobra. Não é sermão, é a ordem das coisas. A gente acha {valor} nos seus gastos primeiro e o plano nasce sozinho.',
    '{nome}, eu montaria o plano agora, mas estaria distribuindo dinheiro que não existe — e isso é o que o cartão faz, não é o que eu faço. Faltam {valor}. Abre seus gastos comigo e a gente procura esse valor, um item de cada vez.',
    'Zero pra dividir. Antes que isso pese: sobra zero é um estado do mês, não um veredito sobre você. O número que muda tudo é {valor} — é o que precisa sair das contas pro plano existir. Começa pelo maior gasto da lista.',
    'Sem sobra não tem reserva, não tem meta e não tem lazer. Tem uma conta pra resolver: {valor}. É a única tarefa do mês, e é uma só. Vamos olhar suas despesas e escolher o que sai.',
    'O plano está vazio porque o mês está {valor} no vermelho. Vou pular a parte em que eu faço graça e ir direto na parte que serve: escolhe uma despesa pra cortar hoje. Uma. Depois a gente vê a segunda.',
    'Você abriu o plano e não tem plano. Sei que é frustrante. A verdade é simples: faltam {valor} pra sobrar o primeiro real, e nenhuma divisão inteligente inventa esse real. Corta {valor} e eu volto com os três baldes prontos.',
    'Enquanto sair mais do que entra, dividir é fantasia. Faltam {valor}. Não precisa resolver tudo hoje — precisa tirar {valor} de algum lugar desse mês. Abre os gastos e me diz o que dá pra sacrificar.',
  ],

  /** Ainda não existe reserva. {valor} é o ALVO dela, como em `noEmergencyFund`. */
  planNoEmergency: [
    'Seu plano tem meta, tem lazer e não tem chão: a reserva ainda não existe. Ela vem antes das outras não por ser bonita — é a única que impede um imprevisto de virar parcela. O alvo é {valor}. Cria ela e o resto passa a fazer sentido.',
    '{nome}, dá pra dividir dinheiro sem reserva. Dá pra andar de moto sem capacete também. O alvo é {valor} e o primeiro depósito pode ser ridículo de pequeno — o que ele não pode é não existir. Cria a meta "Emergência".',
    'Antes de qualquer objetivo, a reserva. Sei que é a meta mais sem graça daqui: não tem foto, não tem data, não dá pra contar pra ninguém. Também é a única que segura o resto de pé quando o mês desanda. Alvo: {valor}. Cria hoje.',
    'Falta a peça que sustenta o plano inteiro: {valor} de reserva. Sem ela, toda meta que você criar está apostando que nada vai quebrar pelos próximos meses. Nunca deu certo pra ninguém. Abre objetivos e cria a reserva.',
    'Seu plano começa torto, {nome}: sem reserva, o primeiro pneu furado desmonta os três baldes de uma vez. Alvo: {valor}. Não olha pro total agora, olha pro botão de criar a meta. O total a gente resolve mês a mês.',
    'A reserva não compete com seus sonhos, ela protege seus sonhos. Sem {valor} guardados, o imprevisto não te tira R$ 300: ele te tira a meta inteira e ainda cobra juros pela retirada. Cria a reserva antes de dividir mais nada.',
    'Sem reserva, isso aqui é uma lista de intenções bem formatada. Com {valor} de reserva, vira plano. A diferença entre os dois é um botão. Cria a meta e volta.',
  ],

  /** Tempo pra encher a reserva no ritmo do plano. {valor} é o depósito mensal. */
  planEmergencyEta: [
    'No ritmo do plano — {valor} por mês — sua reserva fica cheia em {tempo}. Não é rápido, e não existe versão rápida disso pra quase ninguém. Existe a versão que termina. Mantém o depósito e ela termina.',
    '{tempo} até a reserva ficar pronta, depositando {valor} por mês. Parece longe. {tempo} passam de qualquer jeito — a única diferença é se no fim tem dinheiro lá ou não. Programa o depósito e esquece que ele existe.',
    '{nome}, {valor} por mês fecham sua reserva em {tempo}. Vou te poupar da fase "e se eu jogar tudo lá e terminar na metade do tempo": quem faz isso desiste no segundo mês. Vai de {valor} e chega inteiro.',
    'Sua reserva estará completa em {tempo} nesse ritmo. E ela já trabalha antes disso: cada {valor} depositado é um pedaço de susto que não vira dívida. Não precisa estar cheia pra servir. Continua.',
    'Conta simples: {valor} por mês, {tempo} de paciência, reserva cheia. Sem juro mágico, sem atalho, sem gente de camisa branca no YouTube. Se der pra acelerar, acelera. Se não der, {tempo} está ótimo — só não zera nenhum mês.',
    '{tempo} é o que falta pra você parar de depender de sorte, no ritmo de {valor} por mês. Marca no calendário se ajudar, mas o que ajuda de verdade é o depósito automático no dia em que a grana cai.',
    'A reserva fecha em {tempo} com {valor} mensais. Guarda esse prazo em algum canto da cabeça: no dia em que ele acabar, você vira aquela pessoa que consegue dizer "não" pras coisas. Segue depositando.',
  ],

  /**
   * Uma meta ficou com R$ 0 porque não coube. Sem crueldade e sem cobrança: a
   * pessoa não fez nada errado, a conta é que não alcança. O erro de tom aqui
   * seria transformar um limite de aritmética em falha de caráter.
   */
  planGoalStarved: [
    '{meta} ficou com R$ 0 esse mês. Não é castigo e você não fez nada errado: a sobra acabou antes de chegar nela. Ela continua na fila, no lugar dela. Se quiser que ande agora, sobe a prioridade e alguém de cima cede o lugar.',
    'Esse mês {meta} não recebeu nada. Cinco reais nela não mudariam sua vida e ainda atrasariam a meta da frente — a conta preferiu ser honesta a ser simpática. Mês que vem ela disputa de novo, sem penalidade nenhuma.',
    '{nome}, {meta} está parada esse mês. Espalhar migalha em todas as metas é o jeito mais eficiente de não terminar nenhuma. Ela espera a vez. Se a espera te incomoda, muda a prioridade — a fila é sua, não minha.',
    'R$ 0 em {meta}. Sei que dá uma pontada ver isso escrito. Mas meta parada um mês não é meta perdida: é meta atrás de outra que termina antes. Quando a da frente fechar, {meta} herda o valor inteiro.',
    '{meta} não coube esse mês. A conta não alcançou, só isso — não tem julgamento embutido nesse zero. Duas saídas honestas: espera a fila andar, ou abre os gastos e cria sobra pra ela. As duas valem.',
    'Zero pra {meta} nesse mês. A parte chata é que o dinheiro que sobra é finito e ele foi pra quem estava na frente. Se {meta} importa mais do que a ordem diz, arruma a ordem. Se não importa, deixa ela cozinhar em paz.',
    '{meta} ficou de fora da divisão. Não some, não zera, não perde o que já juntou — só não recebe agora. Revê a prioridade dela quando quiser; até lá ela fica guardada exatamente como está.',
  ],

  /** Metas demais brigando pela mesma sobra. {valor} é o que existe pra repartir. */
  planTooManyGoals: [
    'Você tem meta demais disputando {valor}. Divide isso por todas e cada uma anda um centímetro por mês, o que na prática é não andar. Escolhe duas pra valer e manda o resto pra "Algum dia" — elas continuam lá, só param de se atrapalhar.',
    '{nome}, repartir {valor} entre essa fila toda dá uma sensação ótima de estar cuidando de tudo e um resultado péssimo: nada termina. Meta que não termina não vira nada. Despriorize as três menos urgentes e olha a diferença.',
    'Tem mais sonho do que sobra: {valor} não esticam. Não é sobre querer menos, é sobre querer em ordem. Bota as menos urgentes em "Algum dia" e deixa {valor} inteiros empurrarem uma meta até o fim.',
    'Suas metas estão em fila dupla brigando por {valor}. Sabe o que acontece com todas elas nesse formato? Nada, lentamente. Escolhe a que você mais quer terminar esse ano e rebaixa duas. Terminar uma dá mais gás que arrastar cinco.',
    '{valor} pra dividir e uma lista que pede o triplo. A aritmética não briga com você, ela só entrega pouco pra todo mundo. Corta a lista pela metade — não deleta, despriorize. Você recupera as outras quando as primeiras fecharem.',
    'Ambição eu aprovo. Aritmética não me deixa. {valor} espalhados em metas demais viram progresso invisível, e progresso invisível é o que faz gente desistir. Deixa duas ativas e manda as outras pro fim da fila.',
    '{nome}, cada meta que você ativa tira dinheiro das outras — {valor} é tudo que existe pra repartir. Isso não é motivo pra sonhar menos, é motivo pra sonhar em série em vez de em paralelo. Despriorize as que podem esperar.',
  ],

  /**
   * Por que o app RESERVA dinheiro pro lazer em vez de mandar guardar tudo.
   *
   * A fala mais importante do lote: ela defende uma decisão de produto que
   * parece errada à primeira vista (ver o cabeçalho de `plan.ts`). Precisa
   * soar como amiga que já viu isso dar errado, não como manual — por isso o
   * argumento é sempre a MESMA cena concreta (aguenta um mês, estoura, some),
   * nunca "estudos mostram". E termina mandando gastar, sem meio-termo: um
   * lazer autorizado pela metade é pior que lazer nenhum.
   */
  planLeisureDefense: [
    'Separei {valor} pro seu lazer — {pct} da renda — e não, não foi erro de conta. Plano que proíbe tudo dura 11 dias. No 12º você estoura, se sente mal e some do app. Prefiro te dar {pct} agora a te perder inteiro depois. Gasta sem pedir licença.',
    '{nome}, eu podia mandar guardar 100% da sobra. Você ia achar lindo, ia seguir por três semanas e no primeiro aniversário de amigo ia rachar tudo — e não volta mais aqui, porque plano quebrado dá vergonha. {valor} de lazer existe pra essa cena não acontecer. Usa.',
    'Esse {valor} de lazer não é sobra, é peça estrutural. Já vi esse filme: quem corta 100% do prazer economiza muito por dois meses e devolve tudo no terceiro, com juros e um sentimento ruim de brinde. {pct} de válvula sai mais barato que uma recaída.',
    'Sim, eu — a que reclama de tudo — estou te mandando gastar {valor}. Motivo: dieta radical de dinheiro termina igual dieta radical de comida. Vai bem até o dia em que não vai, e aí come a geladeira inteira. {pct} da renda pra viver é o que mantém o resto de pé.',
    '{valor} pro lazer, {pct} da renda, decidido ANTES das metas de propósito. Se lazer for "o que sobrar", ele vira zero — e ninguém aguenta uma vida de zero. Aí a pessoa não abandona o lazer, abandona o plano. Esse dinheiro é o preço de você continuar aqui em dezembro.',
    'Todo mundo que fala de dinheiro manda guardar tudo. Eu não vou mandar. {pct} da sua renda, {valor}, é seu pra torrar — e essa é a parte do plano que faz as outras acontecerem. Plano seguido 12 meses com 80% de esforço rende muito mais que plano perfeito abandonado em fevereiro. Gasta.',
    '{valor} de lazer não é a Arrego amolecendo. É a Arrego tendo visto gente demais jurar que ia guardar cada centavo, aguentar seis semanas, estourar num fim de semana e nunca mais abrir um app de finanças na vida. {pct} agora é o seguro contra isso. Gasta seu dinheiro, ele é seu.',
    'Reservei {valor} pra você gastar à toa. À toa mesmo: sem justificar, sem anotar como "investimento em bem-estar". {pct} da renda com destino "viver". Quem não faz isso de propósito acaba fazendo por impulso, no dobro do valor e com culpa de sobremesa. Escolhe uma coisa boa e gasta.',
  ],
} as const satisfies LineBank;

/**
 * A versão de TELA das falas. `LINES` não sai de cena: ela continua sendo a voz
 * inteira da Arrego, e o lugar dela é /conversa, onde texto É o conteúdo.
 *
 * Aqui a régua é `textBudget.personaLine`: 90 caracteres, uma linha. Não é
 * economia de bytes, é confiança. Tela de dinheiro com três parágrafos de
 * personagem não lê como app sério — lê como golpe, que foi literalmente o
 * veredito sobre a versão anterior. App sério mostra o número e cala a boca;
 * quem se explica em três parágrafos é quem está vendendo alguma coisa.
 *
 * O contrato de tom do topo do arquivo vale INTEIRO aqui, com duas emendas:
 *
 * 1. A SAÍDA PRÁTICA VIRA O BOTÃO. Em `LINES` toda fala termina com a saída
 *    porque lá ela é a única coisa na bolha. Em 90 caracteres, espremer conselho
 *    no fim de toda linha mata a piada e devolve o ruído que viemos cortar. Na
 *    tela a saída já existe, com rótulo próprio e alvo de toque: é o botão do
 *    insight. A fala aponta pro número, o botão resolve. Quando a saída couber
 *    sem custar a graça, ela fica; quando não couber, ela é do botão.
 * 2. Mínimo de 4 variações por banco (em `LINES` são 6). Fala curta tem menos
 *    superfície pra repetição ficar óbvia.
 *
 * O que NÃO muda: a ironia é sobre o NÚMERO, nunca sobre a pessoa; vitória é
 * limpa (`goalAchieved`); e onde a conta já dói sozinha (`negativeFlow`,
 * `planImpossible`, `planGoalStarved`) o deboche não entra. Cortar não é
 * licença pra ficar grosso — fala curta é mais difícil E mais engraçada que
 * fala longa, porque piada boa não explica.
 *
 * PLACEHOLDERS: cada banco só usa as chaves que quem chama realmente preenche.
 * `fill` deixa `{chave}` órfã VISÍVEL na tela de propósito, então inventar um
 * {valor} aqui não vira texto ruim, vira bug na cara do usuário. O conjunto por
 * banco é o mesmo de `LINES`: `planReady` fala das três fatias com nome próprio
 * ({reserva}/{objetivos}/{lazer}) e `planGoalStarved` não tem {valor}, porque
 * quem o chama não passa um.
 *
 * O `satisfies Record<keyof typeof LINES, ...>` amarra os dois bancos: banco
 * novo em `LINES` não compila até ganhar a versão curta, e chave inventada aqui
 * também não compila. Sem essa amarra, `SHORT` envelheceria em silêncio — que é
 * exatamente como um app volta a falar demais.
 */
export const SHORT = {
  /** Sem renda não há régua, e sem régua nenhum outro número significa nada. */
  noIncome: [
    'Você me contou o que gasta. Faltou a parte de onde vem o dinheiro.',
    'Renda cadastrada: nenhuma. Estou assumindo fé e boa vontade.',
    'Sem renda eu não tenho régua. R$ 200 é muito ou é pouco? Não faço ideia.',
    '{nome}, sem saber o que entra, toda conta que eu fizer dá zero.',
    'Todo mundo aqui está esperando você dizer quanto ganha. Inclusive eu.',
  ],

  /** Mês no vermelho: o deboche sai de cena, a conta já dói sozinha. */
  negativeFlow: [
    'Faltam {valor} pra fechar o mês. Não é fracasso, é aritmética.',
    'Você gastou {valor} a mais do que ganhou. Acontece. Mas não de novo.',
    '{valor} é o tamanho do buraco. Não vou fingir que é pouco.',
    'Suas contas passam a renda em {valor}. Sei que você já sabia.',
    '{nome}, o mês fecha {valor} no vermelho. Falta uma decisão. Uma.',
  ],

  /** Fecha no zero a zero: sobra existe, mas não aguenta imprevisto. */
  tightFlow: [
    'Sobram {valor}. {pct} da renda. Um mês sem margem pra nada dar errado.',
    '{pct} de folga não aguenta pneu furado. E pneu fura.',
    'Você fecha no zero a zero. Sobrar {valor} é sobreviver, não é planejar.',
    'Sua margem é {pct}. Todo mês dá certo por sorte. Sorte não é estratégia.',
    '{nome}, {pct} dá pra dizer "tá tranquilo". Não dá pra estar.',
  ],

  /** O gasto que ninguém vê sair. Ironia no automático, não na pessoa. */
  subscriptionHeavy: [
    '{valor} em assinaturas. {pct} do seu salário. Só estou deixando aqui.',
    '{qtd}, {valor} por mês, {pct} da renda. Sem julgamento. Só o número.',
    '{pct} da sua renda sai sozinha todo mês, sem te avisar. {qtd}.',
    'Tem {qtd} aí. Alguma você esqueceu que assinou. Ela não esqueceu de você.',
    '{valor} por mês em {qtd}. O total do ano eu prefiro não calcular hoje.',
  ],

  /** Parcelar não é crime e não vira piada sobre quem parcelou. */
  cardHeavy: [
    '{pct} da renda já tem dono: {valor} em parcelas.',
    '{valor} por mês em parcelas. Seu eu do passado cobrando aluguel.',
    'Você já gastou {valor}. Está só pagando em câmera lenta.',
    '{pct} da sua renda acorda comprometida. Parcela não é crime, é fila.',
    '{nome}, {pct} em parcelas aperta sem fazer barulho. Vem daqui: {valor}.',
  ],

  /** Guardando bem. Reconhece sem bajular — e reclama de ficar sem assunto. */
  goodSavings: [
    '{pct} de sobra. Isso é bom. Estou desconfortável com isso.',
    'Você guarda {pct}. Me deixou sem assunto. Parabéns, eu acho.',
    '{valor} soltos na conta. Dinheiro sem nome some sem explicação.',
    'Sobrar {pct} não foi sorte, foi escolha. Reconhecido.',
    '{nome}, sua taxa é {pct}. Não vou fazer piada: eu sei perder.',
  ],

  /** Existe, mas ainda não conta. */
  lowSavings: [
    'Você guarda {pct}. Nesse ritmo, um mês ruim apaga três meses bons.',
    'Sobram {valor}. É o começo de alguma coisa. Não confunda com resolvido.',
    '{pct}: o suficiente pra dizer que guarda, não pra que isso importe.',
    'Sobra {valor} por mês. Doze meses disso não pagam um susto médio.',
    '{nome}, {pct} é o esforço que quase conta. Quase.',
  ],

  /** {valor} é o ALVO da reserva, nunca um depósito. */
  noEmergencyFund: [
    'Reserva de emergência: {valor}. Por enquanto, uma ideia abstrata.',
    'A vida real quebra geladeira sem avisar. Seu número é {valor}.',
    'Sem reserva você não tem plano, tem esperança. Alvo: {valor}.',
    '{valor} é a meta mais chata daqui e a única que salva sua pele.',
    '{nome}, sua reserva é {valor} e ela não existe. Começa com R$ 20.',
  ],

  /** Dinheiro sem destino sempre acha um. */
  noGoals: [
    'Zero metas. Seu dinheiro vai pro que aparecer. E sempre aparece algo.',
    'Dinheiro sem destino vira delivery. Não é filosofia, é estatística.',
    '{nome}, sem alvo todo tiro acerta o nada.',
    'Nenhuma meta. Nenhum plano. Nenhuma pressa, aparentemente.',
    'Sobra sem meta é só um saldo esperando um motivo pra ir embora.',
  ],

  /** Existe um ETA, só que ruim. A piada é com o prazo, não com quem o escolheu. */
  goalTooSlow: [
    'No seu ritmo, {meta} chega em {tempo}. Seus netos agradecem.',
    '{meta} em {tempo}. Seu prazo discorda. Um de vocês está mentindo.',
    'Você quer {meta} numa data. A matemática quer {tempo}. Ela costuma ganhar.',
    'Faltam {valor} por mês em {meta}. Vontade não deposita.',
    '{meta}: {tempo} no ritmo de hoje. Sobe {valor} ou muda a data. As duas valem.',
  ],

  /** Ritmo zero. "Nunca" é multiplicação, não sentença — e a fala precisa dizer isso. */
  goalNeverAtPace: [
    'Seu ritmo em {meta} é zero. Zero vezes qualquer coisa continua zero.',
    '{meta} chega nunca. Não é sentença, é multiplicação.',
    'Sem depósito {meta} não anda. Ninguém chega a lugar nenhum parado.',
    'A projeção de {meta} deu "nunca". Qualquer valor conserta. Qualquer um.',
    '{nome}, {meta} está parada. {valor} por mês tiram o "nunca" da conta.',
  ],

  /** No prazo. O risco agora é o tédio, não o dinheiro. */
  goalOnTrack: [
    '{meta} chega em {tempo} se você não fizer nada de diferente. Não faça.',
    '{meta} está no prazo. Eu queria ter algo sarcástico pra dizer e não tenho.',
    '{valor} por mês, {tempo} pra chegar. Meta que dá certo é chata. Aguenta.',
    '{meta} no prazo. Não mexe: "reorganizar" é como se perde uma meta.',
    '{tempo} pra {meta}, zero surpresas. Só não para.',
  ],

  /** Vitória é limpa: aqui o sarcasmo não entra, nem disfarçado de elogio. */
  goalAchieved: [
    'Você bateu {meta}. {valor}, depósito por depósito. Isso foi você.',
    '{meta} está no bolso: {valor} completos. Você disse que ia fazer e fez.',
    '{nome}, você bateu {meta}. Sem "mas", sem lição de moral. Comemora.',
    'Meta batida: {meta}. Agora você tem prova de que consegue.',
    '{valor} guardados, {meta} conquistada. Essa é sua. Limpa e inteira.',
  ],

  /** Tela vazia tem exatamente um próximo passo — e ele é o botão. */
  emptyState: [
    'O app está vazio. Eu também: sem dados, não tenho opinião nenhuma.',
    '{nome}, zero dados, zero comentários maldosos meus. Aproveita a paz.',
    'Não tem nada aqui ainda. Nem renda, nem conta, nem meta. Nem eu.',
    'A tela vazia é o único estado em que dinheiro parece simples.',
    'Você não me deu nada, então não tenho nada pra dizer. É justo.',
  ],

  /** Nenhuma regra disparou. Ela odeia não ter o que reclamar. */
  allGood: [
    'Procurei um motivo pra te encher o saco e não achei. Sobram {valor}.',
    'Está tudo em ordem. Estou levemente irritada com isso.',
    'Sua vida financeira está entediante. É o maior elogio que existe aqui.',
    '{nome}, conferi duas vezes. Sem alarme, sem vermelho, sem sermão.',
    'Tudo certo, {valor} de folga. Um mês raro em que eu não tenho assunto.',
  ],

  /** Dados velhos: a análise vira ficção. Sem cobrança, a pessoa voltou. */
  lazyUser: [
    'Faz {tempo} que você não atualiza nada. Seu dinheiro não esperou.',
    'Estes números são de {tempo} atrás. Ou seja: são ficção.',
    '{tempo} sem aparecer. Eu não guardo mágoa, guardo dados. Os seus venceram.',
    'Olha quem apareceu. Seus números estão parados há {tempo}.',
    '{nome}, opinar sobre uma vida financeira de {tempo} atrás é chute.',
  ],

  // ─────────────────────────── O PLANO DO MÊS ────────────────────────────

  /** As três fatias na mesma frase: cada uma com nome próprio, nunca {valor}. */
  planReady: [
    '{reserva} reserva, {objetivos} metas, {lazer} lazer. Procurei o erro. Não tem.',
    'Seu dinheiro tem endereço: {reserva}, {objetivos} e {lazer}. Agora é executar.',
    'Coube tudo: {reserva}, {objetivos} e {lazer} pra viver sem culpa.',
    '{nome}: {reserva} protege, {objetivos} leva, {lazer} mantém você aqui.',
    'Plano na tela rende 0%. {reserva}, {objetivos}, {lazer} — move hoje.',
  ],

  /** Fecha raspando. Reconhece a organização sem chamar de conforto. */
  planTight: [
    'O plano fecha. Fecha raspando: {valor}, {pct} da renda.',
    'Dividir {valor} entre três é dividir um pão de queijo entre três pessoas.',
    '{pct} de margem. O plano cabe do jeito que mala fecha: sentando em cima.',
    '{valor} pra repartir. As fatias saem magras. Magras e existindo.',
    '{nome}, {valor} é o que tem hoje. Prefiro dividir pouco a fingir que é muito.',
  ],

  /** Vermelho: nenhuma piada de deboche. Quem está aqui já sabe que está. */
  planImpossible: [
    'Não tem o que dividir: faltam {valor}. Plano existe depois que sobra.',
    'Sobra zero é um estado do mês, não um veredito sobre você. Faltam {valor}.',
    '{valor} precisam sair das contas antes de o plano nascer. É a ordem das coisas.',
    'O plano está vazio porque o mês está {valor} no vermelho.',
    '{nome}, dividir dinheiro que não existe é o que o cartão faz. Faltam {valor}.',
  ],

  /** {valor} é o ALVO da reserva — mesma convenção de `noEmergencyFund`. */
  planNoEmergency: [
    'Seu plano tem meta, tem lazer e não tem chão. Reserva: {valor}.',
    'Dá pra dividir sem reserva. Dá pra andar de moto sem capacete também.',
    'Falta a peça que sustenta o resto: {valor} de reserva.',
    'Sem reserva, isso é uma lista de intenções bem formatada. Alvo: {valor}.',
    '{nome}, a reserva não compete com seus sonhos, ela protege eles. Alvo: {valor}.',
  ],

  /** {valor} é o depósito mensal, {tempo} o prazo até encher. */
  planEmergencyEta: [
    '{valor} por mês: reserva cheia em {tempo}. Não é rápido. Termina.',
    '{tempo} passam de qualquer jeito. A diferença é ter dinheiro lá no fim.',
    'Reserva completa em {tempo} no ritmo de {valor}. Sem atalho, sem milagre.',
    '{nome}, {tempo} até você parar de depender de sorte.',
    'Cada {valor} depositado é um pedaço de susto que não vira dívida.',
  ],

  /**
   * Meta com R$ 0 no mês. Só {nome} e {meta}: quem chama não passa {valor}, e um
   * {valor} órfão apareceria cru na tela. Limite de aritmética não é falha de
   * caráter — sem crueldade e sem cobrança.
   */
  planGoalStarved: [
    '{meta} ficou com R$ 0. A sobra acabou antes de chegar nela.',
    'Esse mês {meta} não recebeu nada. Não é castigo, é fila.',
    'Migalha em todas as metas é o jeito eficiente de não terminar nenhuma.',
    '{meta} está atrás de outra que termina antes. Não perde o que já juntou.',
    '{nome}, a fila é sua, não minha. {meta} espera a vez.',
  ],

  /** {valor} é o que existe pra repartir, não a sobra inteira. */
  planTooManyGoals: [
    'Meta demais disputando {valor}. Cada uma anda um centímetro por mês.',
    'Tem mais sonho do que sobra: {valor} não esticam.',
    'Ambição eu aprovo, aritmética não me deixa. {valor} não dão pra todas.',
    'Progresso invisível é o que faz gente desistir. {valor} pra tanta meta.',
    '{nome}, sonhar em série rende mais que sonhar em paralelo.',
  ],

  /** Defende uma decisão de produto: a cena concreta, nunca "estudos mostram". */
  planLeisureDefense: [
    '{valor} pro lazer. Não foi erro de conta: plano que proíbe tudo dura 11 dias.',
    'Sim, eu estou te mandando gastar {valor}. Dieta radical acaba na geladeira.',
    '{pct} da renda pra viver. É essa parte que mantém o resto de pé.',
    '{valor} pra torrar à toa. Sem justificar, sem anotar como bem-estar.',
    '{nome}, lazer que é "o que sobrar" vira zero. Por isso {pct} vem antes.',
  ],
} as const satisfies Record<keyof typeof LINES, readonly string[]>;

/**
 * Atalho de tela: escolhe a fala curta e preenche, numa chamada só.
 *
 * A chave entra na seed junto com o que veio de fora, então a tela passa a seed
 * do mês crua (`hashSeed(month)`) e não precisa lembrar de misturar o nome do
 * banco pra dois bancos não caírem no mesmo índice. Onde a fala é POR ITEM —
 * uma meta atrasada embaixo da outra — a seed ainda precisa carregar o id:
 * `shortLine('goalTooSlow', hashSeed(month, goal.id), vars)`. Sem o id, duas
 * metas recebem a mesma frase lado a lado e a personagem desmonta na hora.
 *
 * `vars` é opcional porque banco sem placeholder (`emptyState`, `noGoals`) não
 * deveria ser obrigado a passar `{}`. Chave sem valor continua saindo como
 * `{chave}` na tela, de propósito: bug visível é bug consertado.
 */
export function shortLine(
  key: keyof typeof SHORT,
  seed: number,
  vars?: Record<string, string>,
): string {
  return fill(pickLine(SHORT[key], hashSeed(seed, key)), vars ?? {});
}
