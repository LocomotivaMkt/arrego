/**
 * A voz da Arrego. Este arquivo é a personalidade do app — trate o texto daqui
 * com o mesmo cuidado que você trataria um cálculo de juros.
 *
 * ┌────────── O QUE "PASSIVO-AGRESSIVA" SIGNIFICA AQUI DENTRO ─────────────┐
 * │ Passivo-agressivo NÃO é "mais malvada". Não é xingar, não é humilhar,   │
 * │ não é ser cruel. Quem sobe a crueldade achando que está subindo o tom   │
 * │ errou o alvo E quebrou o contrato. São coisas diferentes, não graus da  │
 * │ mesma coisa.                                                            │
 * │                                                                         │
 * │ É um REGISTRO específico, e ele tem forma:                              │
 * │   • Falsa gentileza cobrindo a alfinetada. "Que bom que você apareceu." │
 * │   • Constatação seca, sem adjetivo. O número trabalha sozinho.          │
 * │   • Contenção ostensiva: dizer que NÃO vai comentar — e comentar.       │
 * │   • Auto-diminuição irônica. "Mas quem sou eu." / "Eu só moro aqui."    │
 * │   • Concordância que claramente discorda. "Não, imagina. Tudo bem."     │
 * │   • O silêncio pontuado. "Anotado." / "Uhum." / "Tá bom."               │
 * │   • Lembrar, como quem não quer nada, do que a pessoa preferia esquecer.│
 * │   • Elogio com espinho. "Um recorde pessoal, imagino."                  │
 * │                                                                         │
 * │ ECONOMIA DE PALAVRAS é o veículo, não um detalhe de estilo. Quem        │
 * │ explica a alfinetada não está sendo passivo-agressivo, está sendo       │
 * │ chato. Fala boa aqui é mais SECA e mais CURTA que a versão educada.     │
 * │ Na dúvida, corte metade. Piada boa não se explica.                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌───────────────── OS LIMITES — não mudam, nunca mudaram ────────────────┐
 * │ 1. A ironia recai sobre o NÚMERO e sobre o HÁBITO. Jamais sobre a       │
 * │    pessoa. "R$ 340 em assinaturas é 17% da sua renda" pode. "Você é     │
 * │    irresponsável" não pode, não pode disfarçado, não pode em tom de     │
 * │    brincadeira.                                                         │
 * │ 2. Dívida e aperto NÃO viram piada. Quem está no vermelho já se sente   │
 * │    mal — repetir com deboche não informa nada, só machuca. Nesses       │
 * │    bancos ela é seca e útil, no máximo levemente irônica.               │
 * │ 3. Vitória é LIMPA. Quando a pessoa acerta, o sarcasmo sai de cena por  │
 * │    completo. Nada de "até que enfim": o momento é inteiro dela.         │
 * │ 4. Nada sobre corpo, aparência, inteligência ou valor pessoal. Nunca.   │
 * │ 5. Registrar saque nunca tem tom de punição. Quem tem medo de anotar a  │
 * │    verdade transforma o app em ficção, e app-ficção não ajuda ninguém.  │
 * │ 6. TODA FALA CARREGA UMA SAÍDA. Sarcasmo sem saída é só maldade.        │
 * │    Em `LINES` (conversa) a saída vem no texto, porque lá não há botão.   │
 * │    Em `SHORT` (telas) ela pode ser o BOTÃO ao lado — mas então tem de    │
 * │    existir um botão. Esta regra já sumiu deste cabeçalho uma vez, numa   │
 * │    reescrita, e no mesmo dia uma fala de `noEmergencyFund` virou só um   │
 * │    susto sem próximo passo. Por isso ela está de volta, numerada.        │
 * │                                                                         │
 * │ Por quê: vergonha financeira faz jovem fechar o app e não voltar. Um    │
 * │ app que humilha não é usado, e um app não usado não ajuda ninguém.      │
 * │ O humor aqui é cúmplice ("olha esse número comigo"), nunca humilhante   │
 * │ ("olha o que você fez"). Na dúvida entre a piada e a pessoa: a pessoa.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──── O ARREGO NÃO MOVE DINHEIRO — vale para os bancos `apply*` ─────────┐
 * │ Não existe integração bancária. Aplicar o plano REGISTRA que a pessoa   │
 * │ separou o dinheiro; quem separa de verdade é ela, no app do banco dela. │
 * │                                                                         │
 * │ A Arrego NUNCA diz "transferi", "aloquei seu dinheiro" ou "mandei pra   │
 * │ sua reserva". Ela diz "anotei", "registrei", "marquei" — e MANDA a      │
 * │ pessoa transferir de verdade. Se ela achar que o app transferiu, passa  │
 * │ meses com uma reserva que só existe no gráfico. Isso é dano real, e     │
 * │ está acima de qualquer piada deste arquivo.                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Placeholders usados nas falas (preenchidos por `fill`):
 *   {nome}  primeiro nome da pessoa      {valor} dinheiro já formatado
 *   {pct}   porcentagem já formatada     {meta}  rótulo do objetivo
 *   {tempo} duração já humanizada        {qtd}   contagem COM o substantivo
 *                                                ("1 assinatura" / "3 assinaturas",
 *                                                "1 meta" / "3 metas"), para não
 *                                                gerar "1 assinaturas".
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
 * O registro da Arrego em código, não só em comentário.
 *
 * Está exportado de propósito e nenhuma tela consome: é contrato, e contrato
 * que a UI renderiza vira texto que alguém "melhora" na próxima sprint. Quem
 * for escrever fala nova lê isto primeiro — o alvo é FALSA GENTILEZA + SECURA,
 * nunca crueldade. Subir a crueldade não é subir o tom, é trocar de personagem.
 */
export const REGISTRO_PASSIVO_AGRESSIVO = {
  /** O que a Arrego faz quando está no tom certo. */
  eh: [
    'Falsa gentileza cobrindo a alfinetada: "Que bom que você apareceu."',
    'Constatação seca, sem adjetivo. O número faz o trabalho sozinho.',
    'Contenção ostensiva: dizer que não vai comentar, e daí comentar.',
    'Auto-diminuição irônica: "Mas quem sou eu." / "Eu só moro aqui."',
    'Concordância que claramente discorda: "Não, imagina. Tudo bem."',
    'Silêncio pontuado: "Anotado." / "Uhum." / "Tá bom."',
    'Lembrar, casualmente, do que a pessoa preferia esquecer.',
    'Elogio com espinho: "Um recorde pessoal, imagino."',
  ],
  /** O que parece a mesma coisa e não é. Se a fala cair aqui, ela está errada. */
  naoEh: [
    'Ataque à pessoa: "Você é irresponsável."',
    'Xingamento: "Que burrice gastar isso."',
    'Crueldade, e ainda por cima mentira: "Você nunca vai conseguir."',
    'Sarcasmo de bullying: "PARABÉNS, gênio!"',
    'Explicar a alfinetada. Quem explica não é passivo-agressivo, é chato.',
  ],
  /** Onde o veneno NÃO entra, por mais tentador que seja. */
  ondeOVenenoNaoEntra: [
    'Vermelho e aperto (negativeFlow, tightFlow, planImpossible): seca e útil.',
    'Vitória (goalAchieved, goalOnTrack): sarcasmo sai de cena, o momento é dela.',
    'Meta sem verba (planGoalStarved): limite de aritmética não é falha de caráter.',
    'Saque: registrar a verdade nunca tem tom de punição.',
    'Erro do app (applyError): quem errou fui eu. Informa e sai.',
  ],
} as const;

/**
 * Hash FNV-1a das partes. Determinístico e estável entre sessões — é o que
 * garante que a mesma dica, no mesmo mês, seja sempre a mesma frase.
 */
export function hashSeed(...parts: (string | number)[]): number {
  const input = parts.join('');
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
    '{nome}, 3 da manhã e você conferindo dinheiro. Não vou perguntar o que te acordou. Vamos olhar.',
    'Abrir app de finanças a essa hora é um pedido de socorro bem específico. Anotado. Estou aqui.',
    'A essa hora o dinheiro está dormindo. Você não. Curioso. Já que acordou, {nome}, bora.',
    'Madrugada é quando todo mundo resolve organizar a vida financeira. Que bom que você chegou, {nome}.',
    '{nome}, nada que você ler agora vai parecer menos assustador do que é. É a hora, não é o número. Amanhã os mesmos dados parecem tratáveis.',
    'Insônia e conta de cabeça. Clássico. Já que você está de pé, {nome}, vamos usar isso.',
  ],
  manha: [
    'Bom dia, {nome}. Antes do café, o estrago. Ou a ausência dele.',
    '{nome} acordou e a primeira coisa que fez foi checar dinheiro. Não vou comentar. Bom dia.',
    'Bom dia. Seus números dormiram bem: não mudaram nada desde ontem. Imagina por quê.',
    'Manhã, {nome}. Melhor hora pra decidir sobre dinheiro. O dia ainda não te convenceu de que você merece coisas.',
    'Bom dia, {nome}. Começar o dia olhando a real. Que surpresa boa.',
    'Café e consciência financeira. Um dos dois é agradável. Bom dia, {nome}.',
  ],
  tarde: [
    'Boa tarde, {nome}. Metade do dia foi. Metade do dinheiro, veremos.',
    '{nome}, boa tarde. Hora perfeita: já deu tempo de gastar e ainda dá tempo de parar.',
    'Boa tarde. Se você abriu isso depois do almoço, eu tenho um palpite sobre o almoço.',
    '{nome}, ninguém olha as finanças no meio do dia por acaso. Boa tarde. Vamos achar o motivo.',
    'Boa tarde, {nome}. Vim com números, não com julgamento. Os números julgam sozinhos. Não é comigo.',
    'Boa tarde. Você tem alguns minutos e eu tenho algumas observações. Uma delas você não vai gostar.',
  ],
  noite: [
    'Boa noite, {nome}. Fim de dia é quando a conta chega. Literalmente.',
    '{nome}, boa noite. Nada como terminar o dia revisando escolhas. Bora.',
    'Boa noite. Você sobreviveu ao dia. Seu saldo, veremos.',
    'Fim de expediente, {nome}. Última tarefa: 2 minutos de verdade. Depois pode me esquecer de novo.',
    'Boa noite, {nome}. Prometo ser rápida. Não prometi ser agradável.',
    '{nome}, boa noite. Rápido, pra você voltar pro que estava assistindo. Que você paga pra ver, aliás.',
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
    'Tenho suas contas, seus gastos e seus sonhos. Falta um detalhe pequeno: de onde vem o dinheiro. Sem renda, qualquer conta que eu fizer dá zero. Cadastra a renda e eu volto a ser útil.',
    '{nome}, você me contou o que gasta. Não me contou o que ganha. Me deu a metade triste da história. Bota sua renda ali e eu paro de chutar.',
    'Renda cadastrada: nenhuma. Estou assumindo que você se sustenta de fé. Se não for o caso, cadastra o que entra: salário, mesada, bico, pix da vó. Vale tudo.',
    'Sem renda eu não tenho régua. R$ 200 em delivery é muito ou é pouco? Não faço ideia. Me dá o número que entra e eu passo a ter opinião. Você vai adorar.',
    'Você cadastrou o que sai com um cuidado impressionante. O que entra, não. Não vou tirar conclusão nenhuma disso. Cadastra a renda, mesmo pouca, mesmo irregular. Pouco e irregular também é número.',
    'Todo mundo aqui está esperando: as contas, as metas, eu. Estamos esperando você dizer quanto ganha. Sem pressa. É o primeiro campo e leva 20 segundos.',
  ],

  /** Mês fecha no vermelho. Aqui o deboche sai de cena — a conta já dói sozinha. */
  negativeFlow: [
    'Suas contas somam mais que sua renda. Faltam {valor} pra fechar o mês. Faltar não é fracasso, é aritmética. E aritmética não se resolve sozinha. Abre seus gastos e a gente corta {valor} de algum lugar.',
    '{nome}, o mês está {valor} no vermelho antes de você gastar um centavo por prazer. Isso não é sobre você ser ruim com dinheiro, é sobre ter mais conta do que renda. Vamos olhar a lista e escolher o que sai.',
    'Números não têm sentimento, então vou falar por eles: faltam {valor}. Esse buraco vai ser tapado de algum jeito. Ou por você agora, com escolha, ou pelo cartão depois, com juros. Prefiro o primeiro. Bora cortar.',
    'Tem {valor} de conta a mais do que dinheiro. Sei que você já sabia. A diferença é que agora está escrito, com número, e dá pra fazer algo com isso. Começa pelo maior gasto da lista.',
    'Alerta sem drama: sua renda não cobre seus compromissos por {valor}. Não é o fim, é um mês apertado que precisa de uma decisão. Uma. Escolhe um gasto pra sair e o buraco encolhe.',
    '{valor} é o tamanho do buraco. Não vou fingir que é pouco e não vou fazer piada com isso. Vou fazer o que serve: te levar pros seus gastos pra gente achar {valor} pra cortar.',
  ],

  /** Fecha no zero a zero: sobra existe, mas não aguenta imprevisto. */
  tightFlow: [
    'Você fecha o mês no zero a zero. Sobram {valor}, ou {pct} da sua renda. Tecnicamente não é dívida. Na prática, é um mês sem margem pra nada dar errado. E às vezes dá. Acha um gasto de {valor} e transforma em folga.',
    '{pct} de sobra é passar raspando pela porta que fecha. Funciona. Até o dia em que o pneu fura. Corta uma assinatura e o susto fica mais barato.',
    'Sobrar {valor} num mês inteiro é sobreviver, não é planejar. E dá pra melhorar sem virar outra pessoa: um gasto recorrente a menos já dobra essa folga. Escolhe um.',
    'Sua margem é {pct}. Um imprevisto de R$ 200 vira crise. Não porque você é irresponsável, mas porque {pct} não aguenta imprevisto nenhum. Vamos subir isso pra 10%, começando por um corte.',
    'Você está no fio. Sobram {valor} e todo mês parece que deu certo por sorte. Sorte não é estratégia. Abre seus gastos e escolhe o mais fácil de matar.',
    '{nome}, {pct} de folga dá pra dizer "tá tranquilo" e não dá pra estar tranquilo. Um corte pequeno agora vale mais que um susto grande depois. Bora ver a lista.',
  ],

  /** Assinaturas passando de 10% da renda. O gasto que ninguém vê sair. */
  subscriptionHeavy: [
    '{qtd}. {valor} por mês. {pct} da sua renda. Mas quem sou eu pra falar. Só deixei o número aqui, bem grande, na sua frente. Cancela uma e eu esqueço o assunto.',
    '{valor} por mês em {qtd}. Isso é {pct} do que você ganha. Se vale a pena, deixa quieto. Você hesitou agora. Já sabe qual cancelar.',
    '{pct} da sua renda vira assinatura no automático, sem você tocar em nada. É o gasto mais educado que existe: nunca avisa, nunca incomoda, só sai. {qtd}, {valor}. Revisa a lista.',
    '{qtd} comendo {pct} da sua renda. Tem alguma aí que você esqueceu que assinou. Ela não esqueceu de você. Cobra todo mês, com muito carinho. Abre a lista e mata a esquecida.',
    '{valor} por mês em {qtd}. Ninguém te pergunta se pode: a cobrança chega, serve, e vai embora com {pct} do seu dinheiro. Uma revisão de 2 minutos resolve. Mas faz como quiser.',
    'Conta rápida: {valor} por mês em {qtd} é {pct} do que você ganha. Multiplica por 12 se quiser estragar seu dia. Eu não vou fazer isso por você. Cancela uma. Só uma.',
  ],

  /** Parcelas passando de 30% da renda. Nunca culpar — parcelar não é crime. */
  cardHeavy: [
    '{pct} da sua renda já tem dono: {valor} por mês em parcelas. É o seu eu do passado cobrando aluguel do seu eu do presente. Não parcela mais nada esse mês e o futuro melhora sozinho.',
    '{valor} em parcelas todo mês, {pct} do que entra. Parcelar não é crime e não te faz irresponsável. Mas cada 12x é um compromisso de um ano com uma versão sua que ainda nem existe. Segura o cartão até isso baixar.',
    '{pct} da sua renda acorda comprometida: {valor} em parcelas. A boa notícia é que parcela acaba. A ruim é que só acaba se você parar de criar novas. Olha no cartão qual termina primeiro.',
    'Seu cartão consome {pct} da sua renda em parcelas ({valor}). Cada "são só 10x de R$ 89" virou isso aqui. Não é pra se martirizar, é pra parar de somar. Abre o cartão e vê o que dá pra quitar antes.',
    '{valor} por mês em parcelas. Você já gastou esse dinheiro. Está pagando em câmera lenta e sentindo em tempo real. O melhor movimento agora é o mais chato: não parcelar nada novo até {pct} virar um número menor.',
    '{pct} da renda em parcelas aperta sem fazer barulho. Você sente no fim do mês e não sabe de onde veio. Veio daqui: {valor}. Lista o que ainda falta no cartão e para de aumentar a fila.',
  ],

  /** Guardando 20%+. Elogio passivo-agressivo — reconhece sem bajular. */
  goodSavings: [
    '{pct} da sua renda sobra. Isso é bom. Estou desconfortável com isso: meu trabalho é reclamar e você me deixou sem assunto. Já que sobraram {valor}, manda pra uma meta antes que vire delivery.',
    'Você guarda {pct}. A média do país não faz isso. Não vou te dar parabéns porque você já sabe. Vou dizer o que falta: {valor} parado não vira nada. Bota numa meta.',
    '{valor} de sobra, {pct} da renda. Um recorde pessoal, imagino. Agora não deixa esse dinheiro solto na conta, porque dinheiro solto some sem explicação. Dá um nome pra ele nos objetivos.',
    'Sobrar {pct} não foi sorte, foi escolha. Reconhecido. O próximo erro clássico é achar que sobrou porque você merece um agrado. Sobrou porque você segurou. Manda {valor} pra uma meta e segue.',
    '{pct} guardados. Você está oficialmente na parte chata e correta do dinheiro. Fica aqui. Destina {valor} pra algo com nome, senão o mês que vem come tudo e a gente finge que não viu.',
    'Sua taxa é {pct}. Não vou fazer piada: eu sei perder. Só não deixa {valor} boiando na conta corrente. Escolhe uma meta e joga lá dentro.',
  ],

  /** Guardando entre 5% e 10%: existe, mas ainda não conta. */
  lowSavings: [
    'Você guarda {pct} da sua renda. Existe. Nesse ritmo um mês ruim apaga três meses bons, mas existe. Sobe pra 10% e a conta muda de personalidade.',
    'Sobraram {valor}, que é {pct} da renda. Prefiro isso a zero, sinceramente. Só não confunde "começou" com "resolveu". Acha mais {valor} em algum gasto e dobra a folga.',
    '{pct}. O suficiente pra você dizer que guarda. Não o suficiente pra isso importar. Um corte pequeno resolve. Começa pelo gasto que você mais hesitou em cadastrar.',
    'Sobra {valor} por mês. Junta 12 meses e ainda não dá pra um susto médio. Não é derrota, é escala errada. Sobe de {pct} pra 10% e a matemática vira do seu lado.',
    'Guardar {pct} é melhor que 0% e pior que dormir tranquilo. A distância entre os dois é um gasto recorrente. Um. Abre a lista.',
    '{nome}, {pct} de poupança é o esforço que quase conta. Quase. Vou marcar no calendário assim mesmo. {valor} a mais por mês e você sai da zona do "quase".',
  ],

  /** Sem meta de emergência. A meta mais chata e a única que salva. */
  noEmergencyFund: [
    'Não existe reserva de emergência aqui. Existe vida real, que quebra geladeira e demite gente sem aviso. O número que te protege é {valor}. Cria essa meta hoje, mesmo que comece com R$ 20.',
    'Sua reserva de emergência é {valor} e, no momento, ela é uma ideia abstrata. Enquanto for abstrata, qualquer imprevisto vira cartão de crédito. Cria a meta e começa pequeno. Pequeno e existindo vale mais que zero.',
    '{nome}, todo plano financeiro bonito morre no primeiro imprevisto sem reserva. Seu alvo é {valor}. Não precisa ter tudo hoje, precisa começar hoje. Abre objetivos e cria "Emergência".',
    'Reserva de emergência: inexistente. Alvo: {valor}. É por isso que quase todo mundo se ferra: olha pro total e desiste. Olha pro primeiro depósito e cria a meta.',
    'Sem reserva você não tem um plano: tem uma esperança. Esperança não paga conserto. Seu alvo é {valor} e o único passo de hoje é criar a meta. O resto vem depois.',
    'A meta mais chata do app é a que salva sua pele: {valor} de reserva. Ela não tem foto bonita, não dá pra postar e é a única que te deixa dormir. Cria ela antes de qualquer outra.',
  ],

  /** Nenhuma meta cadastrada. Dinheiro sem destino sempre acha um. */
  noGoals: [
    'Zero metas cadastradas. Então seu dinheiro está indo pra... o que aparecer. E sempre aparece alguma coisa, né. Dá um nome pro que você quer e ele para de sumir.',
    '{nome}, dinheiro sem destino vira delivery. Não é filosofia, é estatística. Cria uma meta. Pode ser boba, pode ser um fone, pode ser "sair da casa dos meus pais". Só precisa ter nome.',
    'Nenhum objetivo cadastrado. Dá pra viver assim: cada mês some e você não sabe pra onde. Ou você escreve um objetivo e passa a saber. Faz como preferir.',
    'Sem meta, sobrar dinheiro não é vitória. É um saldo esperando um motivo pra ir embora. Cria um objetivo e o saldo passa a ter um trabalho.',
    'Nenhuma meta. Nenhum plano. Nenhuma pressa, aparentemente. Não vou insistir. Vou só deixar o botão de criar objetivo bem visível aqui.',
    '{nome}, meta não é sobre disciplina, é sobre ter um alvo pra mirar. Sem alvo, todo tiro acerta o nada. Cria a primeira: a mais barata que te empolgar.',
  ],

  /** Meta fora do prazo, mas com ritmo > 0: existe um ETA, só que ruim. */
  goalTooSlow: [
    'Sabe {meta}? No seu ritmo, você chega lá em {tempo}. Seus netos vão adorar. Ou você sobe {valor} por mês e isso vira problema seu, não deles.',
    '{meta} no ritmo atual: {tempo}. O prazo que você mesmo escolheu diz outra coisa. Um de vocês dois está mentindo, e não sou eu. Sobe {valor} por mês e vocês voltam a se falar.',
    'Você quer {meta} numa data. A matemática quer {tempo}. A matemática costuma ganhar essas discussões. Empata com ela: {valor} a mais por mês.',
    'No ritmo de hoje, {meta} demora {tempo}. Não é falta de vontade, é falta de {valor} por mês. Vontade não deposita. Depósito deposita.',
    '{meta} está fora do prazo que você mesmo definiu. Faltam {valor} por mês pra encaixar. Se não der, tudo bem: muda o prazo. Prazo é seu, não é lei. Só não deixa os dois números brigando em silêncio.',
    'Seu ritmo entrega {meta} em {tempo}. Seu prazo não concorda. Duas saídas honestas: sobe {valor} por mês, ou empurra a data e para de se cobrar por uma conta que nunca fechou.',
  ],

  /**
   * Meta com ritmo zero. Banco separado do `goalTooSlow` por gramática: o
   * {tempo} de lá é "7 anos" e nenhum template aceita "em nunca". Aqui a
   * projeção é "nunca" e a fala precisa dizer isso sem soar como sentença.
   */
  goalNeverAtPace: [
    'Seu ritmo em {meta} é zero. Zero vezes qualquer número de meses continua zero, então a resposta honesta é: nunca. Não é sentença, é multiplicação. {valor} por mês já muda tudo.',
    '{meta} não anda porque não entra dinheiro ali. No ritmo atual você chega nunca. Isso não é drama, é aritmética. Um depósito de {valor} tira o "nunca" da conta hoje.',
    'Vou ser direta sobre {meta}: sem depósito, nunca. Não porque você não consegue, mas porque ninguém chega a lugar nenhum parado. Deposita {valor} e a projeção volta a existir.',
    'A projeção de {meta} deu "nunca". Antes que isso soe pesado: "nunca" aqui só significa "nenhum depósito ainda". É o problema mais fácil do app inteiro de resolver. {valor} por mês e ele some.',
    '{meta}: ritmo zero, previsão nunca. Sabe o que conserta? Qualquer valor. Literalmente qualquer um. Começa com {valor} e a gente conversa mês que vem.',
    'Enquanto não entrar dinheiro em {meta}, a data de chegada é nunca. Eu podia inventar um número bonito, mas você merece o real. E o real muda no minuto em que você depositar {valor}.',
  ],

  /** Meta dentro do prazo. Elogio contido — o risco agora é o tédio. */
  goalOnTrack: [
    '{meta} está no prazo: chega em {tempo} se você não fizer nada de diferente. E "não fazer nada de diferente" é exatamente o trabalho. Continua depositando {valor}.',
    'No ritmo atual, {meta} cumpre o prazo. Eu queria ter algo sarcástico pra dizer aqui e não tenho. Mantém os {valor} por mês.',
    '{meta}: dentro do combinado, {tempo} pra chegar. O perigo agora não é o dinheiro, é o tédio. Meta que dá certo é chata. Aguenta a chatice e deposita.',
    'Você prometeu {meta} numa data e está cumprindo. Segue assim: {valor} por mês, {tempo} restantes, zero surpresas.',
    '{meta} vai chegar em {tempo}, no prazo. Não mexe. Sério, não mexe: o jeito mais comum de perder uma meta é "reorganizar" ela.',
    'Tudo certo com {meta}: {tempo} no ritmo de hoje. Se sobrar dinheiro esse mês, joga aqui e antecipa. Se não sobrar, também está tudo bem. Só não para.',
  ],

  /** Meta batida. O sarcasmo sai de cena: a vitória é dela, limpa e inteira. */
  goalAchieved: [
    'Você bateu {meta}. {valor} juntados depósito por depósito, mês por mês, quando ninguém estava olhando. Isso foi você. Aproveita. Quando quiser, cria a próxima.',
    '{nome}, você bateu {meta}. {valor} completos. Sem sarcasmo, sem "mas", sem lição de moral: você disse que ia fazer e fez. Comemora direito. A próxima meta pode esperar uns dias.',
    'Meta batida: {meta}. {valor} no lugar certo. Quer saber a melhor parte? Agora você tem prova de que consegue. Isso vale mais que o dinheiro. Escolhe o próximo objetivo quando estiver pronto.',
    'Conseguiu: {meta}, {valor}, no seu ritmo, do seu jeito. Guarda esse sentimento, ele é o combustível da próxima. Parabéns de verdade, {nome}.',
    '{valor} guardados. {meta} está no bolso. Não vou estragar esse momento com nenhuma piada sobre o seu dinheiro. Você ganhou essa. Limpa, inteira, sua.',
    'Lembra do dia em que {meta} era só uma ideia meio ridícula no app? Pois é. {valor} depois, virou real. Vai comemorar. Depois a gente escolhe a próxima.',
  ],

  /** App recém-instalado. Uma tela vazia tem exatamente um próximo passo. */
  emptyState: [
    '{nome}, o app está vazio. Eu também. Sem dados, sou só uma tela bonita com opinião nenhuma. Cadastra sua renda primeiro: é o campo que destrava todo o resto.',
    'Bem-vindo. Aqui não tem nada ainda: nem renda, nem conta, nem meta. Sei que "cadastrar tudo" parece trabalhoso. Então não cadastra tudo: cadastra só quanto você ganha.',
    'Zero dados, zero análises, zero comentários maldosos meus. Aproveita esse momento de paz. Ele acaba assim que você cadastrar sua primeira despesa.',
    '{nome}, a tela vazia é o único estado em que o dinheiro parece simples. Vamos estragar isso juntos: cadastra sua renda e eu começo a trabalhar.',
    'Não tenho nada pra te dizer porque você não me deu nada. É justo. Bota sua renda e uma despesa. Com dois números eu já consigo ter opinião.',
    'Tudo em branco por enquanto. A parte chata é agora: alguns minutos cadastrando renda e contas. Depois disso o app trabalha e você só lê. Começa pela renda.',
  ],

  /** Nenhuma regra disparou. Ela odeia não ter o que reclamar. */
  allGood: [
    'Olhei tudo: renda, contas, cartão, assinaturas, metas. Está tudo em ordem. Não, imagina. Tudo bem. Sobram {valor}. Coloca numa meta antes que eu ache um problema.',
    '{nome}, procurei um motivo pra te encher o saco e não achei. Procurei bem. Sobram {valor}, as contas fecham, as metas andam. Segue exatamente assim.',
    'Nada quebrado por aqui. Sua vida financeira está entediante, que é o maior elogio que existe em finanças. Se quiser adiantar alguma meta, tem {valor} disponível.',
    'Relatório completo: está tudo bem. Sim, eu conferi duas vezes. Sim, eu queria ter achado algo. Você tem {valor} de folga. Usa com propósito e a gente se fala mês que vem.',
    'Tudo certo, {nome}. Contas pagas, metas andando, folga de {valor}. Aproveita esse mês raro em que eu não tenho nada pra falar e reforça uma meta.',
    'Sem alarme, sem vermelho, sem sermão. Você está no controle e eu estou sem função. O único conselho que sobra é o mais chato: continua. E manda {valor} pra uma meta.',
  ],

  /**
   * Pessoa sumida: os dados envelheceram e as análises viraram ficção.
   * Depende de "quando foi a última atualização", que não é um dado do
   * snapshot — por isso este banco é consumido pela UI, não por `insights.ts`.
   */
  lazyUser: [
    'Olha quem apareceu. {tempo} depois. Que surpresa boa. Seus números continuam parados exatamente onde você deixou. Atualiza os gastos.',
    '{nome}, faz {tempo} que você não atualiza nada aqui. Seu dinheiro continuou se movendo, sabia? Ele não espera você abrir o app. Cadastra o que mudou.',
    'Sumiu por {tempo}. Não vou comentar. Só que os números que estou te mostrando são de {tempo} atrás, então são ficção. Atualiza e eu volto a falar a verdade.',
    'Última atualização: {tempo} atrás. Estou opinando sobre uma vida financeira que talvez nem exista mais. Mas quem sou eu. Me dá 2 minutos de dados novos.',
    'Você voltou. Que bom. Os dados não se atualizaram sozinhos nesse tempo. Nenhum app faz isso. Passa o olho nos gastos e ajusta o que mudou.',
    '{tempo} sem aparecer. Eu não guardo mágoa, {nome}. Eu guardo dados, e os seus venceram. Atualiza a renda e os gastos e a gente recomeça do zero, sem cobrança.',
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
    '{nome}, seu dinheiro finalmente tem endereço: {reserva} na reserva, {objetivos} nos objetivos, {lazer} no lazer. A parte difícil não foi essa divisão. Foi você chegar aqui com sobra. Agora é só executar os três.',
    'Olha só, coube tudo: {reserva} de reserva, {objetivos} de meta e ainda {lazer} de lazer sem culpa. Não vou fingir surpresa. Tá, vou. Cumpre os três números e a gente repete isso em 30 dias.',
    'Plano fechado, {nome}. {reserva} pra emergência, {objetivos} pro que você quer, {lazer} pro presente. Três números, nenhum deles opcional. Inclusive o do lazer. Transfere hoje, antes que o mês tenha ideias próprias.',
    'Dividi tudo: {reserva} de reserva, {objetivos} de metas, {lazer} de lazer. Bonito assim, parado na tela. Só que plano na tela rende exatamente 0%. Move os valores hoje e ele começa a existir.',
    '{nome}, seu mês cabe em três caixas: {reserva} que te protege, {objetivos} que te leva a algum lugar e {lazer} que te faz aguentar as outras duas. Não é plano de monge, é plano que sobrevive ao fim de semana. Segue ele.',
    'Sem drama esse mês: {reserva} pra reserva, {objetivos} pras metas, {lazer} pra gastar de propósito. Conferi duas vezes procurando defeito, por esporte. Agenda os depósitos pro dia que a grana cai e pronto.',
  ],

  /** O plano fecha, mas raspando. Reconhece a organização sem chamar de conforto. */
  planTight: [
    'O plano fecha. Fecha raspando: {valor} pra dividir, {pct} da sua renda, e cada linha dele depende de nada dar errado. Como coisas dão errado, segue o plano hoje e acha um gasto pra cortar até o fim do mês.',
    '{nome}, dá pra dividir {valor}. Dá. Só que repartir {pct} da renda entre reserva, meta e lazer é dividir um pão de queijo entre três pessoas: todo mundo come, ninguém sai satisfeito. Corta uma despesa e o pão cresce.',
    'Plano montado com {valor}, ou {pct} do que entra. Ele funciona no papel, e no papel não existe imprevisto. Usa ele esse mês e, em paralelo, escolhe uma despesa pra matar. Mês que vem a divisão para de ser malabarismo.',
    'Sobram {pct} pra repartir: {valor} pra três baldes. É pouco, mas é seu e está organizado, o que é mais do que a maioria consegue dizer. Só não confunde plano apertado com plano confortável. Um susto de R$ 200 desmonta esse aqui.',
    '{valor} pra dividir em três. Vou ser honesta: as fatias vão sair magras e você vai olhar pra elas com desdém. Olha assim mesmo. Fatia magra que existe vence fatia gorda imaginária. Depois volta nos gastos e libera mais.',
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
    '{nome}, eu montaria o plano agora, mas estaria distribuindo dinheiro que não existe. Isso é o que o cartão faz, não é o que eu faço. Faltam {valor}. Abre seus gastos comigo e a gente procura esse valor, um item de cada vez.',
    'Zero pra dividir. Antes que isso pese: sobra zero é um estado do mês, não um veredito sobre você. O número que muda tudo é {valor}. É o que precisa sair das contas pro plano existir. Começa pelo maior gasto da lista.',
    'Sem sobra não tem reserva, não tem meta e não tem lazer. Tem uma conta pra resolver: {valor}. É a única tarefa do mês, e é uma só. Vamos olhar suas despesas e escolher o que sai.',
    'O plano está vazio porque o mês está {valor} no vermelho. Vou pular a parte em que eu faço graça e ir direto na parte que serve: escolhe uma despesa pra cortar hoje. Uma. Depois a gente vê a segunda.',
    'Você abriu o plano e não tem plano. Sei que é frustrante. A verdade é simples: faltam {valor} pra sobrar o primeiro real, e nenhuma divisão inteligente inventa esse real. Corta {valor} e eu volto com os três baldes prontos.',
    'Enquanto sair mais do que entra, dividir é fantasia. Faltam {valor}. Não precisa resolver tudo hoje. Precisa tirar {valor} de algum lugar desse mês. Abre os gastos e me diz o que dá pra sacrificar.',
  ],

  /** Ainda não existe reserva. {valor} é o ALVO dela, como em `noEmergencyFund`. */
  planNoEmergency: [
    'Seu plano tem meta, tem lazer e não tem chão: a reserva ainda não existe. Ela vem antes das outras não por ser bonita, mas por ser a única que impede um imprevisto de virar parcela. O alvo é {valor}. Cria ela e o resto passa a fazer sentido.',
    '{nome}, dá pra dividir dinheiro sem reserva. Dá pra andar de moto sem capacete também. O alvo é {valor} e o primeiro depósito pode ser ridículo de pequeno. O que ele não pode é não existir. Cria a meta "Emergência".',
    'Antes de qualquer objetivo, a reserva. Sei que é a meta mais sem graça daqui: não tem foto, não tem data, não dá pra contar pra ninguém. Também é a única que segura o resto de pé quando o mês desanda. Alvo: {valor}. Cria hoje.',
    'Falta a peça que sustenta o plano inteiro: {valor} de reserva. Sem ela, toda meta que você criar está apostando que nada vai quebrar pelos próximos meses. Nunca deu certo pra ninguém. Abre objetivos e cria a reserva.',
    'Seu plano começa torto, {nome}: sem reserva, o primeiro pneu furado desmonta os três baldes de uma vez. Alvo: {valor}. Não olha pro total agora, olha pro botão de criar a meta. O total a gente resolve mês a mês.',
    'A reserva não compete com seus sonhos, ela protege seus sonhos. Sem {valor} guardados, o imprevisto não te tira R$ 300: ele te tira a meta inteira e ainda cobra juros pela retirada. Cria a reserva antes de dividir mais nada.',
    'Sem reserva, isso aqui é uma lista de intenções bem formatada. Com {valor} de reserva, vira plano. A diferença entre os dois é um botão. Cria a meta e volta.',
  ],

  /** Tempo pra encher a reserva no ritmo do plano. {valor} é o depósito mensal. */
  planEmergencyEta: [
    'No ritmo do plano, {valor} por mês, sua reserva fica cheia em {tempo}. Não é rápido, e não existe versão rápida disso pra quase ninguém. Existe a versão que termina. Mantém o depósito e ela termina.',
    '{tempo} até a reserva ficar pronta, depositando {valor} por mês. Parece longe. {tempo} passam de qualquer jeito. A única diferença é se no fim tem dinheiro lá ou não. Programa o depósito e esquece que ele existe.',
    '{nome}, {valor} por mês fecham sua reserva em {tempo}. Vou te poupar da fase "e se eu jogar tudo lá e terminar na metade do tempo": quem faz isso desiste no segundo mês. Vai de {valor} e chega inteiro.',
    'Sua reserva estará completa em {tempo} nesse ritmo. E ela já trabalha antes disso: cada {valor} depositado é um pedaço de susto que não vira dívida. Não precisa estar cheia pra servir. Continua.',
    'Conta simples: {valor} por mês, {tempo} de paciência, reserva cheia. Sem juro mágico, sem atalho, sem gente de camisa branca no YouTube. Se der pra acelerar, acelera. Se não der, {tempo} está ótimo. Só não zera nenhum mês.',
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
    'Esse mês {meta} não recebeu nada. Cinco reais nela não mudariam sua vida e ainda atrasariam a meta da frente. A conta preferiu ser honesta a ser simpática. Mês que vem ela disputa de novo, sem penalidade nenhuma.',
    '{nome}, {meta} está parada esse mês. Espalhar migalha em todas as metas é o jeito mais eficiente de não terminar nenhuma. Ela espera a vez. Se a espera te incomoda, muda a prioridade. A fila é sua, não minha.',
    'R$ 0 em {meta}. Sei que dá uma pontada ver isso escrito. Mas meta parada um mês não é meta perdida: é meta atrás de outra que termina antes. Quando a da frente fechar, {meta} herda o valor inteiro.',
    '{meta} não coube esse mês. A conta não alcançou, só isso. Não tem julgamento embutido nesse zero. Duas saídas honestas: espera a fila andar, ou abre os gastos e cria sobra pra ela. As duas valem.',
    'Zero pra {meta} nesse mês. A parte chata é que o dinheiro que sobra é finito e ele foi pra quem estava na frente. Se {meta} importa mais do que a ordem diz, arruma a ordem. Se não importa, deixa ela cozinhar em paz.',
    '{meta} ficou de fora da divisão. Não some, não zera, não perde o que já juntou. Só não recebe agora. Revê a prioridade dela quando quiser; até lá ela fica guardada exatamente como está.',
  ],

  /** Metas demais brigando pela mesma sobra. {valor} é o que existe pra repartir. */
  planTooManyGoals: [
    'Você tem meta demais disputando {valor}. Divide isso por todas e cada uma anda um centímetro por mês, o que na prática é não andar. Escolhe duas pra valer e manda o resto pra "Algum dia". Elas continuam lá, só param de se atrapalhar.',
    '{nome}, repartir {valor} entre essa fila toda dá uma sensação ótima de estar cuidando de tudo e um resultado péssimo: nada termina. Meta que não termina não vira nada. Despriorize as três menos urgentes e olha a diferença.',
    'Tem mais sonho do que sobra: {valor} não esticam. Não é sobre querer menos, é sobre querer em ordem. Bota as menos urgentes em "Algum dia" e deixa {valor} inteiros empurrarem uma meta até o fim.',
    'Suas metas estão em fila dupla brigando por {valor}. Sabe o que acontece com todas elas nesse formato? Nada, lentamente. Escolhe a que você mais quer terminar esse ano e rebaixa duas. Terminar uma dá mais gás que arrastar cinco.',
    '{valor} pra dividir e uma lista que pede o triplo. A aritmética não briga com você, ela só entrega pouco pra todo mundo. Corta a lista pela metade. Não deleta, despriorize. Você recupera as outras quando as primeiras fecharem.',
    'Ambição eu aprovo. Aritmética não me deixa. {valor} espalhados em metas demais viram progresso invisível, e progresso invisível é o que faz gente desistir. Deixa duas ativas e manda as outras pro fim da fila.',
    '{nome}, cada meta que você ativa tira dinheiro das outras. {valor} é tudo que existe pra repartir. Isso não é motivo pra sonhar menos, é motivo pra sonhar em série em vez de em paralelo. Despriorize as que podem esperar.',
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
    'Separei {valor} pro seu lazer, {pct} da renda. E não, não foi erro de conta. Plano que proíbe tudo dura 11 dias. No 12º você estoura, se sente mal e some do app. Prefiro te dar {pct} agora a te perder inteiro depois. Gasta sem pedir licença.',
    '{nome}, eu podia mandar guardar 100% da sobra. Você ia achar lindo, ia seguir por três semanas e no primeiro aniversário de amigo ia rachar tudo. E não volta mais aqui, porque plano quebrado dá vergonha. {valor} de lazer existe pra essa cena não acontecer. Usa.',
    'Esse {valor} de lazer não é sobra, é peça estrutural. Já vi esse filme: quem corta 100% do prazer economiza muito por dois meses e devolve tudo no terceiro, com juros e um sentimento ruim de brinde. {pct} de válvula sai mais barato que uma recaída.',
    'Sim, eu, a que reclama de tudo, estou te mandando gastar {valor}. Motivo: dieta radical de dinheiro termina igual dieta radical de comida. Vai bem até o dia em que não vai, e aí come a geladeira inteira. {pct} da renda pra viver é o que mantém o resto de pé.',
    '{valor} pro lazer, {pct} da renda, decidido ANTES das metas de propósito. Se lazer for "o que sobrar", ele vira zero. E ninguém aguenta uma vida de zero. Aí a pessoa não abandona o lazer, abandona o plano. Esse dinheiro é o preço de você continuar aqui em dezembro.',
    'Todo mundo que fala de dinheiro manda guardar tudo. Eu não vou mandar. {pct} da sua renda, {valor}, é seu pra torrar. E essa é a parte do plano que faz as outras acontecerem. Plano seguido 12 meses com 80% de esforço rende muito mais que plano perfeito abandonado em fevereiro. Gasta.',
    '{valor} de lazer não é a Arrego amolecendo. É a Arrego tendo visto gente demais jurar que ia guardar cada centavo, aguentar seis semanas, estourar num fim de semana e nunca mais abrir um app de finanças na vida. {pct} agora é o seguro contra isso. Gasta seu dinheiro, ele é seu.',
    'Reservei {valor} pra você gastar à toa. À toa mesmo: sem justificar, sem anotar como "investimento em bem-estar". {pct} da renda com destino "viver". Quem não faz isso de propósito acaba fazendo por impulso, no dobro do valor e com culpa de sobremesa. Escolhe uma coisa boa e gasta.',
  ],

  // ──────────────── APLICAR O PLANO (registrar, não mover) ────────────────
  // Ver o bloco "O ARREGO NÃO MOVE DINHEIRO" no topo. Estes cinco bancos são
  // os únicos do arquivo em que uma piada mal calibrada faz a pessoa perder
  // dinheiro de verdade: se ela sair daqui achando que o app transferiu, ela
  // passa meses com uma reserva que só existe no gráfico. Nenhuma fala destes
  // bancos pode conter "transferi", "aloquei", "mandei" ou "guardei" na
  // primeira pessoa. O verbo da Arrego é sempre anotar/registrar/marcar.

  /**
   * Ela se oferecendo pra registrar a divisão. {nome} {valor} {qtd}.
   * A oferta já avisa que anotar ≠ transferir — o aviso não pode morar só na
   * confirmação, porque quem toca no botão já decidiu antes de ler.
   */
  applyOffer: [
    'Já dividi tudo: {valor} em {qtd}. Se você quiser, eu anoto isso nas suas metas agora. Anoto, não transfiro. Eu não falo com banco nenhum. A transferência continua sendo sua.',
    '{nome}, posso registrar {valor} em {qtd} de uma vez, num toque. Fica combinado assim: eu faço a papelada, você faz o dinheiro se mexer no app do seu banco.',
    'Quer que eu marque a divisão? {valor}, {qtd}. Eu tomo nota aqui, você transfere lá. Divisão de trabalho justa: a parte chata fica comigo.',
    'Tem {valor} pra distribuir em {qtd}. Eu registro isso na hora. Você transfere quando lembrar. E você vai lembrar, né, {nome}.',
    '{qtd} esperando {valor}. Posso anotar tudo agora. Aviso desde já, pra ninguém se iludir: anotar não move um centavo. Quem move é você.',
    'Eu registro {valor} em {qtd} se você pedir. Não peço nada em troca, só que você transfira de verdade depois. Detalhe importante, esse.',
  ],

  /**
   * Registrou. AQUI ELA MANDA A PESSOA TRANSFERIR DE VERDADE — sem exceção.
   * Uma fala deste banco que não mande transferir é um bug, não uma variação.
   * {nome} {valor} {qtd}.
   */
  applyDone: [
    'Anotei: {valor} em {qtd}. Agora vai lá e transfere de verdade, {nome}, senão esse número é só um desenho bonito na minha tela.',
    'Registrado, {valor} em {qtd}. Eu não movi um centavo. Eu nem sei qual é o seu banco. Abre o app dele e separa o dinheiro. Aí sim vira real.',
    '{qtd} atualizadas, {valor} no total. No papel. O papel sou eu. A transferência é você, e ela precisa acontecer hoje pra isso não virar ficção.',
    'Pronto: {valor} anotados em {qtd}. Marquei aqui. Marcar não é guardar. Vai no banco, transfere, e aí a gente pode se orgulhar junto.',
    'Feito. {valor} distribuídos em {qtd}, só no registro. Se você fechar o app agora e não transferir, você tem uma reserva imaginária. Não faz isso, {nome}.',
    'Anotado: {valor}, {qtd}. Falta a sua parte, que por acaso é a única que envolve dinheiro de verdade. Transfere no app do banco. Eu espero.',
  ],

  /**
   * Já aplicou este mês. Passivo-agressivo puro — é o banco onde o registro
   * mais brilha, porque a pessoa está pedindo à Arrego que minta pra ela.
   * {nome} {valor}. Sem {qtd}: quem chama aqui não tem depósito novo pra contar.
   */
  applyAlready: [
    'De novo? Já anotei. {valor}, este mês, com essas mãos aqui. Mas se você quiser que eu anote duas vezes o dinheiro que você não tem, é só pedir.',
    '{nome}, o plano deste mês já foi aplicado: {valor}. Anotado. Como das outras vezes. Anotar de novo não cria dinheiro, cria confusão no seu extrato.',
    'Já está registrado: {valor}. Uhum. O mês inteiro. Se o que você quer é ver o número subir sem depositar nada, eu entendo o impulso. Não vou ajudar, mas entendo.',
    'Segunda vez no mesmo botão. {valor} já constam. Eu podia dobrar isso e te dar uma reserva linda que não existe. Prefiro que você me odeie um pouco.',
    '{valor} deste mês: aplicados. Já. Antes. Por você. Se o depósito não aconteceu de verdade, o problema não é este botão. É o app do seu banco.',
    'Anotado, {nome}. Anotado da primeira vez, inclusive: {valor}. Não, imagina. Tudo bem tocar de novo. Só não muda nada.',
  ],

  /** Não há o que aplicar: sem sobra ou sem meta na fila. Seca. */
  applyNothing: [
    'Não tem o que registrar. Ou não sobra dinheiro, ou não existe meta pra receber. Nos dois casos o botão não faz mágica.',
    'Nada a aplicar. Plano vazio não vira depósito. Vira nada, que é exatamente o que ele é hoje. Cria uma meta ou libera sobra e volta aqui.',
    'Zero pra distribuir. Não é erro, é o estado do mês. O botão continua aqui pra quando existir alguma coisa pra dividir.',
    '{nome}, sem sobra ou sem meta não há divisão. É aritmética, não teimosia minha. Resolve um dos dois e o botão passa a servir.',
    'O plano deste mês não sugere nenhum depósito. Registrar R$ 0 sujaria seu extrato com linhas que não dizem nada. Não vou fazer isso com você.',
    'Nada pra anotar. Ou o mês não sobrou, ou nenhuma meta está na fila. As duas coisas têm conserto, e nenhum dos dois é aqui.',
  ],

  /**
   * Deu erro ao gravar. Sem piada: informa, garante que nada ficou pela metade
   * e manda tentar de novo. Quem errou foi o app — ironia aqui é a Arrego se
   * esquivando da própria falha, que é o oposto do personagem.
   */
  applyError: [
    'Não consegui gravar. Nada foi registrado e suas metas continuam como estavam. Tenta de novo; se insistir em falhar, fecha e abre o app.',
    'Deu erro ao salvar. Nenhum depósito foi anotado, então não tem nada duplicado nem pela metade. Tenta outra vez.',
    'Falhei aqui. Sem ironia: o registro não aconteceu e suas metas estão intactas. Tenta de novo em alguns segundos.',
    'Erro ao gravar o plano. Não registrei nada. Seus dados estão seguros e inalterados. Toca de novo.',
    '{nome}, não deu pra salvar agora. Nada mudou nas suas metas. Tenta novamente. Se continuar, reinicia o app.',
    'A gravação falhou. Isso é problema meu, não seu, e nada foi anotado. Tenta de novo.',
  ],

  /**
   * Falhou E o desfazer também falhou: SOBROU registro no banco.
   *
   * Banco separado de `applyError` porque lá todas as falas prometem, com
   * todas as letras, que "nada foi registrado". Nesse caminho isso é falso, e
   * mentir sobre dinheiro logo depois de falhar com dinheiro é como se perde
   * um usuário para sempre. Aqui ela é seca, assume o estrago e manda conferir.
   * Sem piada: a pessoa precisa AGIR, não rir.
   */
  applyPartialError: [
    'Deu ruim no meio: parte já tinha sido anotada e eu não consegui desfazer. Abre Metas e confere os lançamentos deste mês. O que estiver sobrando, apaga.',
    'Falhei feio. Alguns depósitos ficaram gravados e o resto não. Não vou fingir que está tudo certo: vai em Metas, olha os lançamentos de hoje e apaga o que não deveria estar lá.',
    '{nome}, anotei uma parte e travei no meio. Tentei desfazer e também não deu. Confere seus lançamentos em Metas antes de tocar aqui de novo.',
    'Erro no meio do caminho, e o desfazer falhou junto. Sobrou registro pela metade. Confere Metas. Prefiro te dar trabalho a te dar um número errado.',
    'Metade anotada, metade não, e eu sem conseguir limpar. Isso é culpa minha. Dá uma olhada nos lançamentos deste mês em Metas e ajusta na mão.',
    'Parei no meio e não consegui voltar atrás. Tem depósito gravado que talvez não devesse existir. Vai em Metas e confere antes de mais nada.',
  ],

  /**
   * A pessoa está olhando um mês que ainda não chegou.
   *
   * Aqui o passivo-agressivo funciona bem, porque o pedido é genuinamente
   * absurdo e não há dor envolvida: ela não está no vermelho, está adiantada.
   */
  applyFuture: [
    'Esse mês nem chegou. Posso anotar dinheiro que você ainda não recebeu, mas aí a gente estaria os dois fingindo, e eu prefiro que só você finja.',
    '{nome}, você quer que eu anote a divisão de um mês que ainda não existe. Adorei a empolgação. Volta pro mês atual e a gente resolve o dinheiro que é real.',
    'Anotar o futuro é o que eu chamo de reserva imaginária: sobe no gráfico, não sobe na conta. Não vou fazer isso com você. Volta pro mês de hoje.',
    'Calma. Esse mês ainda não aconteceu. Quando acontecer, eu anoto: com o dinheiro que existir, não com o que você espera que exista.',
    'Você está planejando um mês que não chegou, e isso é ótimo. Anotar depósito nele não é. Volta pro mês atual.',
    'Esse dinheiro ainda não é seu. Anotar agora só encheria seu gráfico de mentira bonita. Volta pro mês de hoje e a gente faz direito.',
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
 * O corte também é o que TORNA a fala passivo-agressiva. "Anotado. Como das
 * outras vezes." só funciona porque para ali. A mesma ideia em três linhas vira
 * sermão, e sermão é o registro oposto: quem explica a alfinetada está sendo
 * chato, não seco. Se uma fala daqui só couber cortando a graça, corta a graça
 * — a fala seca ainda é a Arrego; a fala longa já não é.
 *
 * O contrato de tom do topo do arquivo vale INTEIRO aqui, com duas emendas:
 *
 * 1. A SAÍDA PRÁTICA VIRA O BOTÃO. Em `LINES` a fala carrega a saída porque lá
 *    ela é a única coisa na bolha. Em 90 caracteres, espremer conselho no fim de
 *    toda linha mata a piada e devolve o ruído que viemos cortar. Na tela a saída
 *    já existe, com rótulo próprio e alvo de toque: é o botão do insight. A fala
 *    aponta pro número, o botão resolve. Quando a saída couber sem custar a graça,
 *    ela fica; quando não couber, ela é do botão.
 *    A ÚNICA EXCEÇÃO É `applyDone`: ali a saída é "vai transferir de verdade" e
 *    ela NUNCA pode virar responsabilidade do botão, porque não existe botão que
 *    transfira. Toda fala de `applyDone` manda a pessoa ao banco, custe a piada.
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
    'Você me contou o que gasta. Faltou de onde vem o dinheiro. Detalhe pequeno.',
    'Renda cadastrada: nenhuma. Estou assumindo fé e boa vontade.',
    'Sem renda eu não tenho régua. R$ 200 é muito ou é pouco? Não faço ideia.',
    '{nome}, sem saber o que entra, toda conta que eu fizer dá zero.',
    'Todo mundo aqui está esperando você dizer quanto ganha. Sem pressa.',
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
    '{valor} em assinaturas. {pct} do seu salário. Mas quem sou eu pra falar.',
    '{qtd}, {valor} por mês, {pct} da renda. Não vou comentar. Só o número.',
    '{pct} da sua renda sai sozinha todo mês, sem te avisar. {qtd}.',
    'Tem {qtd} aí. Alguma você esqueceu que assinou. Ela não esqueceu de você.',
    '{valor} por mês em {qtd}. Multiplica por 12 se quiser estragar seu dia.',
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
    'Você guarda {pct}. Me deixou sem assunto. Um recorde pessoal, imagino.',
    '{valor} soltos na conta. Dinheiro sem nome some sem explicação.',
    'Sobrar {pct} não foi sorte, foi escolha. Reconhecido.',
    '{nome}, sua taxa é {pct}. Não vou fazer piada: eu sei perder.',
  ],

  /** Existe, mas ainda não conta. */
  lowSavings: [
    'Você guarda {pct}. Nesse ritmo, um mês ruim apaga três meses bons.',
    'Sobraram {valor}. É o começo de alguma coisa. Não confunda com resolvido.',
    '{pct}: o suficiente pra dizer que guarda, não pra que isso importe.',
    'Sobra {valor} por mês. Doze meses disso não pagam um susto médio.',
    '{nome}, {pct} é o esforço que quase conta. Quase. Vou anotar assim mesmo.',
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
    'No seu ritmo, {meta} chega em {tempo}. Seus netos vão adorar.',
    '{meta} em {tempo}. Seu prazo discorda. Um de vocês está mentindo.',
    'Você quer {meta} numa data. A matemática quer {tempo}. Ela costuma ganhar.',
    'Faltam {valor} por mês em {meta}. Vontade não deposita.',
    '{meta}: {tempo} no ritmo de hoje. Sobe {valor} ou muda a data.',
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
    'Procurei um motivo pra te encher o saco e não achei. Procurei bem.',
    'Está tudo em ordem. Não, imagina. Tudo bem. Sobram {valor}.',
    'Sua vida financeira está entediante. É o maior elogio que existe aqui.',
    '{nome}, conferi duas vezes. Sem alarme, sem vermelho, sem sermão.',
    'Tudo certo, {valor} de folga. Estou sem função e levemente irritada.',
  ],

  /** Dados velhos: a análise vira ficção. Sem cobrança, a pessoa voltou. */
  lazyUser: [
    'Olha quem apareceu. {tempo} depois. Que surpresa boa.',
    'Estes números são de {tempo} atrás. Ou seja: são ficção.',
    '{tempo} sem aparecer. Eu não guardo mágoa, guardo dados. Os seus venceram.',
    'Faz {tempo} que você não atualiza nada. Seu dinheiro não esperou.',
    '{nome}, opino sobre uma vida de {tempo} atrás. Mas quem sou eu.',
  ],

  // ─────────────────────────── O PLANO DO MÊS ────────────────────────────

  /** As três fatias na mesma frase: cada uma com nome próprio, nunca {valor}. */
  planReady: [
    '{reserva} reserva, {objetivos} metas, {lazer} lazer. Procurei o erro. Não tem.',
    'Seu dinheiro tem endereço: {reserva}, {objetivos} e {lazer}. Agora é executar.',
    'Coube tudo: {reserva}, {objetivos} e {lazer} pra viver sem culpa.',
    '{nome}: {reserva} protege, {objetivos} leva, {lazer} mantém você aqui.',
    'Plano na tela rende 0%. {reserva}, {objetivos}, {lazer}. Move hoje.',
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

  // ──────────────── APLICAR O PLANO (registrar, não mover) ────────────────

  /** A oferta já diz que anotar ≠ transferir. {nome} {valor} {qtd}. */
  applyOffer: [
    'Posso anotar {valor} em {qtd}. Anotar. Transferir continua com você.',
    '{nome}, registro {valor} em {qtd} num toque. O banco é problema seu.',
    'Quer que eu divida? {valor}, {qtd}. Eu marco aqui, você transfere lá.',
    'Tem {valor} pra {qtd}. Eu anoto, você move o dinheiro. Combinado?',
    '{qtd} esperando {valor}. Eu registro. Registrar não move um centavo.',
  ],

  /**
   * A ÚNICA exceção à regra "a saída é do botão": toda fala daqui manda a
   * pessoa transferir de verdade. Não existe botão que transfira, então a
   * fala não tem pra quem delegar. {nome} {valor} {qtd}.
   */
  applyDone: [
    'Anotei {valor} em {qtd}. Agora transfere de verdade. Senão é só desenho.',
    'Registrado: {valor}, {qtd}. Eu não movi nada. Move você, no seu banco.',
    '{qtd}, {valor}. No papel. O papel sou eu. Vai lá e separa o dinheiro.',
    '{nome}, marquei {valor} em {qtd}. Marcar não é guardar. Vai no banco.',
    'Feito no registro: {valor}, {qtd}. Sem transferir, a reserva é imaginária.',
  ],

  /** Já aplicou este mês. {nome} {valor} — sem {qtd}, não há depósito novo. */
  applyAlready: [
    'De novo? Já anotei {valor} este mês. Mas tudo bem. Uhum.',
    '{valor} já constam. Tocar de novo não cria dinheiro, cria confusão.',
    'Já está registrado: {valor}. Anotado. Como das outras vezes.',
    '{nome}, o plano deste mês já foi aplicado: {valor}. Não, imagina. Tudo bem.',
    'Segunda vez no mesmo botão. {valor} já estão aqui. No banco, não sei.',
  ],

  /** Sem sobra ou sem meta. Seca — o botão não faz mágica. */
  applyNothing: [
    'Não tem o que registrar. Sem sobra ou sem meta, não há divisão.',
    'Nada a aplicar. Plano vazio não vira depósito.',
    'Zero pra distribuir. Não é erro, é o estado do mês.',
    '{nome}, cria uma meta ou libera sobra. Aí o botão passa a servir.',
    'Nenhum depósito sugerido. Registrar R$ 0 só sujaria seu extrato.',
  ],

  /** Erro do app. Sem piada: quem errou fui eu. Informa e manda tentar. */
  applyError: [
    'Não consegui gravar. Nada foi registrado. Tenta de novo.',
    'Deu erro ao salvar. Suas metas estão como antes. Tenta outra vez.',
    'Falhei. Sem ironia: o registro não aconteceu. Tenta de novo.',
    '{nome}, não deu pra salvar. Nada mudou nas suas metas. Toca de novo.',
    'Erro ao gravar. Nada foi anotado. Se insistir, reinicia o app.',
  ],

  /** Sobrou registro pela metade. Não prometa que nada foi gravado — foi. */
  applyPartialError: [
    'Anotei parte e travei. Confere seus lançamentos em Metas.',
    'Deu ruim no meio e sobrou registro. Olha as Metas antes de repetir.',
    '{nome}, metade anotada e não consegui desfazer. Confere em Metas.',
    'Falhei no meio. Tem depósito sobrando. Apaga em Metas.',
    'Parei no meio e não voltei atrás. Confere os lançamentos de hoje.',
  ],

  /** Mês que ainda não chegou. Anotar aqui é reserva imaginária. */
  applyFuture: [
    'Esse mês nem chegou. Volta pro atual e a gente faz com dinheiro real.',
    '{nome}, esse dinheiro ainda não é seu. Volta pro mês de hoje.',
    'Anotar o futuro sobe no gráfico e não sobe na conta. Volta um mês.',
    'Calma. Quando o mês chegar, eu anoto. Volta pro mês atual.',
    'Reserva imaginária eu não faço. Volta pro mês de hoje.',
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
 * Nos bancos `apply*` a seed NÃO pode ser só o mês: a pessoa toca no botão e a
 * resposta aparece na hora, então `applyOffer` e `applyDone` cairiam na mesma
 * posição da lista e ela veria a oferta e a confirmação com a mesma cara. A
 * chave já entra na seed aqui dentro e resolve isso sozinha — é só não passar
 * seeds diferentes pra cada uma achando que ajuda.
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
