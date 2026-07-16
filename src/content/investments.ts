/**
 * Conteúdo educativo sobre investimentos e antigolpe.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ LIMITE DURO: isto é EDUCAÇÃO, não recomendação.                       │
 * │ O Arrego explica COMO cada coisa funciona para a pessoa decidir       │
 * │ sozinha. Nunca "invista em X", nunca "a melhor opção é Y".            │
 * │ Quem lê aqui tem 20 anos e nenhum repertório — um app que aponta o    │
 * │ dedo para um produto específico faz estrago real na vida de alguém.   │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * NADA DE NÚMERO QUE MUDA. Taxa de hoje vira mentira daqui a um mês e o texto
 * fica no app. Só entram percentuais que são REGRA (tabela do IR, teto do
 * FGC), nunca cotação (Selic, CDI, "rende X% ao ano"). Ensine o mecanismo.
 *
 * Aqui a precisão vem antes da piada: esta é a parte do app onde uma frase mal
 * colocada custa dinheiro de verdade pra alguém.
 */

export type SafetyLevel = 'muito-seguro' | 'seguro' | 'depende' | 'perigoso';

export type Topic = {
  id: string;
  emoji: string;
  title: string;
  /** Uma frase que um jovem de 18 anos entende de primeira. */
  oneLiner: string;
  safety: SafetyLevel;
  /** Quem garante o dinheiro. `null` = ninguém garante. */
  protectedBy: string | null;
  /** Em quanto tempo o dinheiro volta pra mão. */
  liquidity: string;
  body: string[];
  /** SITUAÇÕES em que faz sentido — nunca recomendação. */
  goodFor: string[];
  /** O que realmente pode dar errado. */
  watchOut: string[];
};

export const TOPICS: readonly Topic[] = [
  {
    id: 'reserva-de-emergencia',
    emoji: '🛟',
    title: 'Reserva de emergência',
    oneLiner: 'O dinheiro que existe só para o dia em que tudo dá errado.',
    safety: 'muito-seguro',
    protectedBy: null,
    liquidity: 'No mesmo dia. Se demora, não é reserva.',
    body: [
      'A reserva não é um investimento. É um colchão. Ela não está ali para render, está ali para você não precisar de empréstimo quando o celular quebra, o dente dói ou o emprego acaba.',
      'O tamanho dela depende de quanto custa o SEU mês, não de quanto você ganha. Some tudo que sai todo mês por obrigação — aluguel, contas, mercado, transporte — e multiplique. Quem tem salário fixo e estável costuma mirar em uns três meses disso. Quem é autônomo, freela ou tem renda que balança mira mais alto, porque o mês ruim chega sem avisar.',
      'Uma reserva só serve se tiver duas coisas ao mesmo tempo: o dinheiro volta rápido pra sua mão e o valor não encolhe enquanto está guardado. Qualquer coisa que trave o dinheiro por meses, ou que possa valer menos amanhã, não serve de reserva. Pode até ser uma boa aplicação — só não é reserva.',
      'Existe uma ordem chata e verdadeira: dívida cara primeiro (rotativo do cartão, cheque especial), reserva depois, o resto por último. Não existe aplicação segura no Brasil que renda mais rápido do que a dívida do cartão cresce. Fazer os dois ao mesmo tempo é encher um balde furado.',
      'E ela é entediante de propósito. Reserva não é pra render, é pra existir. O rendimento dela é você dormir.',
    ],
    goodFor: [
      'Cobrir o mês inteiro se a renda sumir',
      'Pagar um imprevisto sem recorrer ao cartão',
      'Sair de um trabalho ruim sem depender do próximo salário',
      'Consertar carro, celular ou dente sem parcelar em 12x',
    ],
    watchOut: [
      'Deixar a reserva presa em algo com carência. A emergência não espera o vencimento.',
      'Guardar a reserva em algo que pode cair de preço bem no dia do saque.',
      'Usar a reserva pra viagem, presente ou promoção. Isso é meta, não emergência.',
      'Montar reserva enquanto paga rotativo do cartão. A dívida corre mais rápido que qualquer rendimento.',
    ],
  },

  {
    id: 'tesouro-selic',
    emoji: '🏛️',
    title: 'Tesouro Selic',
    oneLiner: 'Você empresta dinheiro pro governo e ele devolve com juros.',
    safety: 'muito-seguro',
    protectedBy: 'Tesouro Nacional',
    liquidity: 'O Tesouro recompra o título todo dia útil.',
    body: [
      'Título público é empréstimo ao contrário: em vez de você pegar dinheiro emprestado do banco, o governo pega emprestado de você e devolve com juros. Tesouro Direto é o nome do lugar onde uma pessoa física compra esses títulos.',
      'É considerado o investimento mais seguro do país porque o pagador é o governo federal, e a dívida é em reais. Não é fé nem propaganda: se esse pagamento falhar, o problema do país é bem maior que o seu investimento. Nenhum banco e nenhuma empresa dentro do Brasil é mais seguro que isso.',
      'O Tesouro Selic acompanha a taxa básica de juros do país: taxa sobe, ele rende mais; taxa cai, ele rende menos. Mas o detalhe que importa é outro — o preço dele sobe um pouquinho a cada dia útil e não faz curva. É o único título público em que vender antes do vencimento não costuma virar prejuízo.',
      'O Tesouro recompra o título todo dia útil, então o dinheiro volta rápido. Existe uma taxa de custódia da B3 sobre o valor guardado, e valores menores costumam ser isentos dela. Essa regra muda de tempos em tempos: confira na página oficial do Tesouro Direto, não neste texto.',
      'Imposto de renda: incide só sobre o RENDIMENTO, nunca sobre o que você colocou, e só na hora do resgate. Quanto mais tempo o dinheiro fica, menor a mordida — 22,5% até 180 dias, 20% de 181 a 360 dias, 17,5% de 361 a 720 dias e 15% acima de 720 dias. Isso se chama tabela regressiva e vale pra renda fixa em geral.',
      'Tem também o IOF, um imposto que come o rendimento de quem saca antes de 30 dias e some depois disso. Nos primeiros dias ele leva quase tudo. Traduzindo: dinheiro que entrou faz uma semana e já vai sair rende basicamente nada.',
    ],
    goodFor: [
      'Guardar a reserva de emergência',
      'Dinheiro que pode precisar sair a qualquer momento',
      'Começar do zero: dá pra comprar um pedaço de título com pouco dinheiro',
      'Objetivo sem data definida, quando travar o dinheiro não é opção',
    ],
    watchOut: [
      'Resgatar antes de 30 dias. O IOF come quase todo o rendimento do período.',
      'Achar que "seguro" quer dizer "rende muito". Segurança e rendimento alto não andam juntos — quando alguém promete os dois, um dos dois é mentira.',
      'Confundir com os outros títulos do Tesouro. Só o Selic é imune a susto de preço no meio do caminho.',
      'Esquecer que ele acompanha a taxa básica: se ela cair, o rendimento cai junto. Não é defeito, é o mecanismo.',
    ],
  },

  {
    id: 'cdb-liquidez-diaria',
    emoji: '🏦',
    title: 'CDB de liquidez diária',
    oneLiner: 'Em vez de emprestar pro governo, você empresta pro banco.',
    safety: 'seguro',
    protectedBy: 'FGC até R$ 250 mil por CPF e por instituição',
    liquidity: 'No mesmo dia, quando é de liquidez diária. E nem todo CDB é.',
    body: [
      'CDB quer dizer Certificado de Depósito Bancário. Tira o nome difícil e sobra isto: o banco pega seu dinheiro emprestado, empresta pra outra pessoa mais caro, e te devolve com juros. O banco não paga por bondade — ele está comprando matéria-prima.',
      '"Liquidez diária" quer dizer que você pede e o dinheiro volta no mesmo dia. Isso NÃO é padrão. Existe CDB que só devolve no vencimento, daqui a dois anos. O nome do produto quase sempre avisa e a tela de compra sempre informa — ler essa linha antes de clicar é a diferença entre ter dinheiro na emergência e não ter.',
      'A maioria dos CDBs rende um percentual do CDI, que é uma taxa que anda coladinha na taxa básica de juros. "100% do CDI" significa entregar tudo o que essa taxa rendeu no período; "90% do CDI" entrega nove décimos disso. É comparação relativa, e é por isso que ela não envelhece: o número acompanha a taxa, seja ela qual for.',
      'Aqui entra o FGC, o Fundo Garantidor de Créditos. É um fundo bancado pelos próprios bancos que devolve seu dinheiro se a instituição quebrar. A garantia é de R$ 250 mil por CPF e por instituição, contando o que você aplicou MAIS os juros que já correram. E tem um teto global: R$ 1 milhão no total, somando todas as instituições, que se renova a cada 4 anos.',
      'Entenda o que essa garantia faz na prática. Banco pequeno paga mais justamente porque tem mais risco de quebrar — o FGC é o que transforma esse risco em "vou tomar um susto e esperar" no lugar de "perdi tudo". Só que o FGC não paga no dia seguinte: o processo leva um tempo que ninguém sabe de antemão, e nesse meio-tempo o dinheiro não é seu pra usar.',
      'Imposto de renda igual ao da renda fixa em geral: só sobre o rendimento, pela tabela regressiva — 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias. O banco desconta sozinho no resgate; você não precisa fazer conta nenhuma.',
    ],
    goodFor: [
      'Guardar dinheiro que pode precisar sair rápido, quando é de liquidez diária',
      'Quem já usa o app do banco e não quer abrir conta em corretora',
      'Comparar quanto instituições diferentes pagam pelo mesmo dinheiro',
    ],
    watchOut: [
      'Comprar um CDB sem liquidez diária achando que tem. Aí o dinheiro fica preso até o vencimento, e acabou.',
      'Passar de R$ 250 mil na mesma instituição: o que passa disso não tem garantia do FGC.',
      'Esquecer que os juros contam dentro dos R$ 250 mil. O limite é sobre o total, não sobre o que você depositou.',
      'Achar que FGC é dinheiro na hora. Se o banco quebra você recebe, mas espera — e emergência não espera.',
      'CDB que paga muito acima dos outros está te pagando pelo risco. O prêmio não é generosidade, é preço.',
    ],
  },

  {
    id: 'poupanca',
    emoji: '🐷',
    title: 'Poupança',
    oneLiner: 'A mais fácil de todas — e é exatamente isso que ela cobra de você.',
    safety: 'seguro',
    protectedBy: 'FGC até R$ 250 mil por CPF e por instituição',
    liquidity: 'No mesmo dia. Mas sacar fora do aniversário custa o mês inteiro de rendimento.',
    body: [
      'A poupança é a conta de guardar dinheiro que existe em qualquer banco: sem taxa, sem tela difícil, sem ter que escolher nada. Essa simplicidade é real e é o motivo de ela ainda estar de pé.',
      'Por que ela rende menos: o rendimento da poupança é definido por uma fórmula em lei, não pelo mercado. E essa fórmula tem teto — a partir de certo nível da taxa básica de juros, a poupança para de acompanhar e trava. As outras aplicações de renda fixa continuam subindo junto com os juros; a poupança fica onde a lei mandou. Por isso a distância entre ela e o resto aumenta justamente quando os juros estão altos.',
      'A pegadinha que quase ninguém conta é o aniversário. A poupança só paga rendimento em datas mensais contadas a partir do dia em que você depositou. Depositou dia 10? O dinheiro só rende no dia 10 do mês seguinte. Sacou dia 9? Perdeu o mês inteiro de rendimento daquele valor. Não é multa nem taxa: o rendimento simplesmente não acontece.',
      'E cada depósito tem o próprio aniversário. Se você deposita todo mês em dias diferentes, tem vários aniversários rodando ao mesmo tempo dentro da mesma poupança — e um saque pode zerar o mês de um pedaço do dinheiro sem você perceber.',
      'Do lado bom: poupança é isenta de imposto de renda pra pessoa física, não tem IOF e não tem come-cotas. O que rendeu é seu. É um dos poucos lugares onde o número que você vê é o número que você leva.',
    ],
    goodFor: [
      'Quem está começando e quer pegar o hábito de guardar antes de entender produto',
      'Guardar dinheiro sem abrir conta em corretora nem instalar nada',
      'Separar dinheiro da conta corrente pra não gastar no automático',
    ],
    watchOut: [
      'Sacar antes do aniversário do depósito. O rendimento daquele mês simplesmente não vem.',
      'Depósitos em dias diferentes criam aniversários diferentes. Um saque pode acertar bem o pior deles.',
      'A fórmula dela tem teto. O tamanho da diferença pra outras opções você descobre comparando as taxas do dia — não neste texto.',
      'Confundir "todo mundo usa" com "é a melhor". Ela é a mais fácil. Fácil e melhor são coisas diferentes.',
    ],
  },

  {
    id: 'lci-lca',
    emoji: '🌾',
    title: 'LCI e LCA',
    oneLiner: 'Empréstimo pro banco sem mordida do leão — em troca de você não poder mexer.',
    safety: 'seguro',
    protectedBy: 'FGC até R$ 250 mil por CPF e por instituição',
    liquidity: 'Só depois da carência, e boa parte só devolve mesmo no vencimento.',
    body: [
      'LCI é Letra de Crédito Imobiliário e LCA é Letra de Crédito do Agronegócio. Funcionam como um CDB: você empresta pro banco e ele te paga juros. A diferença é o destino — esse dinheiro financia imóveis ou o agronegócio, e o governo quis incentivar esses setores.',
      'O incentivo é este: pra pessoa física, o rendimento de LCI e LCA é isento de imposto de renda. Zero. Sem tabela regressiva, sem desconto no resgate.',
      'Só que a isenção não é presente — ela é o preço de outra coisa. Toda LCI/LCA tem carência: um período mínimo em que o dinheiro não sai de jeito nenhum. Não tem multa, não tem "pago pra sair antes", simplesmente não dá. E muitas só devolvem no vencimento, que pode ser daqui a anos.',
      'Como não tem imposto, comparar com um CDB pelo número da taxa engana. O CDB precisa render mais pra chegar no mesmo lugar, porque uma fatia dele vai virar imposto. A comparação honesta é a do valor que sobra no seu bolso no fim, não a do percentual do anúncio.',
      'A garantia é a mesma dos CDBs: FGC, R$ 250 mil por CPF e por instituição, contando principal mais juros, dentro do teto global de R$ 1 milhão renovável a cada 4 anos.',
    ],
    goodFor: [
      'Dinheiro com data certa e distante, que você tem certeza que não vai precisar antes',
      'Objetivo de médio prazo, depois que a reserva de emergência já existe',
      'Comparar o que sobra no bolso contra uma aplicação que paga imposto',
    ],
    watchOut: [
      'Carência é carência. Durante ela o dinheiro não sai — nem com multa, nem com jeitinho.',
      'Reserva de emergência aqui dentro é reserva que não existe no dia em que você precisa dela.',
      'Vencimento longo trava o dinheiro numa taxa combinada hoje. Se os juros subirem, você assiste.',
      'Isento de IR não quer dizer que rende mais. Às vezes rende menos e a isenção só empata o jogo.',
    ],
  },

  {
    id: 'tesouro-ipca',
    emoji: '📈',
    title: 'Tesouro IPCA+',
    oneLiner: 'O título que devolve o seu poder de compra, e não só o seu dinheiro.',
    safety: 'depende',
    protectedBy: 'Tesouro Nacional (se você levar até o vencimento)',
    liquidity: 'Todo dia útil — mas pelo preço do dia, que pode ser menor do que você pagou.',
    body: [
      'IPCA é o índice oficial que mede a inflação no Brasil, ou seja, o quanto as coisas encareceram. Esse título paga a inflação MAIS uma taxa combinada no momento da compra. Daí o "+" no nome.',
      'Essa combinação resolve um problema específico: dinheiro parado perde poder de compra. Se tudo encarece e seu dinheiro rende menos que isso, você termina com mais reais comprando menos coisa. O IPCA+ existe pra que o dinheiro chegue lá na frente comprando o mesmo tanto, mais um pedaço.',
      'Agora a parte que derruba gente todo ano: marcação a mercado. Traduzindo — o preço do seu título muda todo dia, porque enquanto ele existe tem gente comprando e vendendo ele por aí. Se hoje passarem a oferecer títulos novos pagando mais que o seu, ninguém quer o seu pelo mesmo preço: ele fica mais barato pra compensar. Se os novos pagarem menos, o seu fica mais valioso.',
      'Pensa num ingresso de show. Você comprou por um valor. Se a banda estourar, seu ingresso vale mais do que custou; se ninguém quiser ir, você só repassa com desconto. O show é o mesmo, o assento é o mesmo — quem mudou foi a fila lá fora. O título funciona igual: o governo vai te pagar o combinado no vencimento, mas o preço de HOJE depende de quem está na fila hoje.',
      'Daí sai a regra inteira: segurou até o vencimento, recebe exatamente o combinado — a inflação do período mais a taxa, sem susto. Vendeu antes, recebe o preço do dia, que pode ser mais e pode ser bem menos do que você pagou. Não é golpe, não é bug, não é o Tesouro te devendo. É o mecanismo funcionando como foi desenhado.',
      'Imposto: a tabela regressiva normal da renda fixa, só sobre o rendimento — 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias. Como o vencimento costuma ser longo, quem segura até o fim cai na menor faixa.',
    ],
    goodFor: [
      'Dinheiro com data lá na frente, que você não vai precisar tocar até lá',
      'Objetivo de muitos anos, prazo em que a inflação teria tempo de corroer o valor',
      'Entender na prática o que é marcação a mercado, com pouco dinheiro em jogo',
    ],
    watchOut: [
      'Vender antes do vencimento pode dar prejuízo, mesmo sendo título público. A garantia do governo é sobre o vencimento, não sobre o preço de hoje.',
      'Reserva de emergência aqui é o erro clássico: a emergência sempre chega no dia em que o preço está ruim.',
      'Ver o valor caindo na tela e sacar no susto. Vender no vermelho é o que transforma variação em prejuízo de verdade.',
      'Existe a versão que paga juros semestrais e a que paga tudo no fim. A que paga no meio do caminho antecipa imposto a cada pagamento.',
    ],
  },

  {
    id: 'o-que-nao-e-investimento',
    emoji: '🎰',
    title: 'O que não é investimento',
    oneLiner: 'Coisas que parecem investimento, funcionam como aposta e são vendidas como certeza.',
    safety: 'perigoso',
    protectedBy: null,
    liquidity: 'Varia. Na pior das hipóteses, nunca.',
    body: [
      'Nada aqui é proibido nem pecado. O problema é de etiqueta: são coisas vendidas como "investimento" que não se comportam como investimento. Investimento tem regra conhecida e risco que dá pra medir. O que está nesta lista tem resultado que depende de sorte, de outra pessoa, ou de uma promessa que ninguém assinou.',
      'Cripto pra quem está começando: a tecnologia é real e o preço é livre. Livre quer dizer que ele pode cair 60% num mês sem que nada tenha "dado errado" — é assim que funciona, não é acidente. Não tem FGC, não tem Tesouro, não tem pra quem reclamar. Se cair, caiu. Quem entra aqui está comprando oscilação, não guardando dinheiro. São coisas diferentes e podem até coexistir na sua vida — só não no mesmo bolso.',
      'Day trade: comprar e vender no mesmo dia tentando acertar o movimento. Os estudos com dados reais da bolsa brasileira mostram que a esmagadora maioria das pessoas físicas que insistem nisso perde dinheiro, e quem ganha ganha pouco. O mecanismo é simples: você está do outro lado de robôs com dados melhores e custo por operação menor que o seu, e cada operação sua paga corretagem e imposto. É o único "investimento" em que o esforço aumenta o prejuízo.',
      '"Robô de trades" / "robô que rende sozinho": alguém promete um programa que opera por você e entrega lucro constante. Olha o que está sendo oferecido — se existisse um programa que ganha dinheiro sozinho, todo dia, sem risco, o dono não venderia acesso por R$ 200. Ele rodaria o robô e ficaria de bico calado. Vender o robô só faz sentido se o dinheiro vier de quem compra o robô, e não do mercado.',
      'Consórcio como investimento: consórcio é um jeito de comprar uma coisa (carro, casa) sem juros de financiamento, pagando taxa de administração e esperando sorteio ou lance. É compra parcelada, não aplicação. Seu dinheiro fica preso por anos, não rende pra você, e dá pra passar o consórcio inteiro sem ser contemplado. Chamar isso de investimento inverte o que está acontecendo: você não está juntando dinheiro, está pagando adiantado.',
      '"Renda garantida de 5% ao mês": esse é o mais importante de entender, porque é o que parece mais inofensivo. 5% ao mês, com juros sobre juros, dá cerca de 80% em um ano. Nenhum negócio legal no planeta entrega isso de forma constante e garantida — se entregasse, todo banco do mundo pegaria dinheiro emprestado a qualquer preço pra colocar lá. A palavra "garantido" é o sinal do golpe, não o argumento a favor dele: no mercado de verdade quem garante é o Tesouro ou o FGC. Fora deles, garantia é só uma frase que alguém falou.',
      'A regra que resume tudo: rendimento alto e risco baixo não coexistem. Quando os dois aparecem na mesma frase, um dos dois está mentindo — e não é o rendimento, porque é ele que está te vendendo a ideia.',
    ],
    goodFor: [
      'Entender por que a promessa boa demais precisa ser boa demais pra funcionar',
      'Reconhecer o padrão antes de alguém do seu grupo do WhatsApp cair nele',
      'Separar "quero apostar um dinheiro que posso perder" de "quero guardar dinheiro"',
    ],
    watchOut: [
      'Dinheiro da reserva de emergência aqui dentro. É a forma mais rápida de transformar um imprevisto em dívida.',
      'Entrar por indicação de alguém que "já ganhou". No começo sempre tem gente ganhando — é isso que atrai a próxima leva.',
      'Aumentar a aposta pra recuperar o que perdeu. É o mecanismo exato pelo qual um prejuízo pequeno vira um grande.',
      'Pegar empréstimo, usar limite do cartão ou entrar no cheque especial pra investir. A dívida é garantida; o rendimento não.',
    ],
  },
];

export const ORDER_MATTERS =
  'A ordem desta lista não é enfeite — é a ordem em que as coisas funcionam. A reserva de ' +
  'emergência vem primeiro porque, sem ela, qualquer imprevisto vira dívida de cartão, e não ' +
  'existe aplicação segura que renda mais rápido do que o rotativo cresce. Depois vêm as opções ' +
  'mais simples e das quais o dinheiro sai rápido. Só no fim aparecem as que prendem o dinheiro ou ' +
  'que variam de preço no caminho. Quem começa pelo fim da lista costuma voltar pro começo dela — ' +
  'só que com menos dinheiro do que tinha.';

export const DISCLAIMER =
  'O Arrego não é consultor financeiro e não recomenda investimento nenhum. O que está aqui é ' +
  'explicação de como cada coisa funciona, pra você decidir sozinho e saber o que está perguntando ' +
  'na hora de perguntar. Nenhum texto deste app diz onde colocar o seu dinheiro: quem faz isso ou ' +
  'está sendo pago pra isso, ou não sabe nada da sua vida. Taxas, regras e limites mudam com o ' +
  'tempo — confirme na fonte oficial (Tesouro Direto, FGC, Banco Central, o próprio banco) antes ' +
  'de decidir qualquer coisa.';

export type Scam = {
  id: string;
  emoji: string;
  title: string;
  /** O sinal que denuncia o golpe. */
  sign: string;
  /** Por que a conta não fecha. */
  truth: string;
};

export const SCAMS: readonly Scam[] = [
  {
    id: 'piramide',
    emoji: '🔺',
    title: 'Pirâmide (mesmo quando não se chama assim)',
    sign: 'O dinheiro entra quando você traz gente nova, não quando o negócio vende alguma coisa. Se a maior parte do ganho vem de indicação, o produto é decoração.',
    truth: 'A conta não fecha por matemática, não por azar. Cada pessoa precisa trazer outras, que precisam trazer outras. Em pouco mais de uma dúzia de rodadas seria preciso mais gente do que existe no Brasil inteiro. Quando o recrutamento para, o dinheiro para no mesmo dia — e quem entrou por último paga a conta de todo mundo que entrou antes.',
  },
  {
    id: 'robo-que-rende-todo-dia',
    emoji: '🤖',
    title: 'O robô que rende todo dia',
    sign: 'Rendimento diário, sempre igualzinho, sem nenhum dia negativo — e um painel bonito mostrando o número subir.',
    truth: 'Mercado nenhum sobe todo dia. Um resultado que nunca fica negativo não é um investimento excepcional, é uma tela. O saldo que você vê é um número num banco de dados que eles controlam, e ele sobe porque alguém programou pra subir. Os primeiros saques são pagos com o depósito dos novatos, e é isso que te convence a colocar mais. Quando os depósitos param de crescer, o saque começa a "demorar por causa de uma manutenção".',
  },
  {
    id: 'falso-consultor',
    emoji: '🎭',
    title: 'Falso consultor / perfil clonado',
    sign: 'Alguém te chama primeiro. Foto de sucesso, muitos seguidores, print de lucro e uma pressa que não combina nem um pouco com quem já é rico.',
    truth: 'Clonar um perfil leva dez minutos e print de lucro se faz no editor de imagem. Repara no que está acontecendo: uma pessoa que ganha muito dinheiro no mercado não tem motivo nenhum pra te procurar no direct pra cuidar dos seus R$ 500. O produto é você. Assessor de verdade é registrado, atende vinculado a uma instituição, e dá pra conferir o registro dele na CVM antes de mandar qualquer centavo.',
  },
  {
    id: 'renda-garantida',
    emoji: '🍬',
    title: '"Renda garantida"',
    sign: 'A palavra "garantido" colada num número alto. Quanto mais alto o número, mais insistente fica a garantia.',
    truth: 'No Brasil, só duas coisas garantem dinheiro: o Tesouro Nacional e o FGC, dentro dos limites dele. Qualquer outra "garantia" é uma frase que alguém falou — não tem fundo, não tem lei, não tem a quem cobrar depois. E o número se entrega sozinho: rendimento alto existe pra pagar pelo risco. Se o risco fosse zero, ninguém precisaria te pagar tanto pra você entrar.',
  },
  {
    id: 'grupo-de-sinais',
    emoji: '📲',
    title: 'Grupo de sinais pago',
    sign: 'Mensalidade pra receber "as entradas do dia". Print de acerto todo santo dia no grupo — e nenhum print de erro, nunca.',
    truth: 'O ganho deles é a mensalidade, não o mercado. E mensalidade rende igual com você acertando ou errando, então o incentivo é te manter inscrito, não te fazer ganhar. Print de acerto é de graça: dá pra dar dez palpites, apagar os sete que erraram e postar os três que acertaram. Em alguns grupos tem coisa pior — eles compram antes, mandam o "sinal" pro grupo e vendem no movimento que a entrada de vocês criou.',
  },
  {
    id: 'falso-app',
    emoji: '📱',
    title: 'App de investimento falso',
    sign: 'O link chegou por WhatsApp, direct ou anúncio. O app é bonito, o depósito é por Pix pra uma chave de pessoa física, e o primeiro saque, pequeno, cai rapidinho.',
    truth: 'O primeiro saque é o investimento deles em você: ele existe pra te dar confiança de depositar o valor grande. Repara no Pix — instituição de verdade recebe em conta da própria instituição, com CNPJ que bate com o nome, e é autorizada pelo Banco Central. Pix pra CPF de terceiro não tem nem onde reclamar depois. Antes de depositar em qualquer lugar: procure o nome na lista de instituições autorizadas do Banco Central e baixe o app só pela loja oficial, jamais pelo link que te mandaram.',
  },
];

export const GLOSSARY: readonly { term: string; plain: string }[] = [
  {
    term: 'liquidez',
    plain: 'Quanto tempo o dinheiro leva pra voltar pra sua mão sem que você perca valor no caminho.',
  },
  {
    term: 'rendimento',
    plain: 'O que o dinheiro ganhou por estar guardado — o que apareceu além do que você colocou.',
  },
  {
    term: 'IR regressivo',
    plain: 'O imposto sobre o rendimento da renda fixa, que diminui quanto mais tempo o dinheiro fica: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720 dias.',
  },
  {
    term: 'FGC',
    plain: 'Fundo bancado pelos próprios bancos que devolve até R$ 250 mil por CPF e por instituição se ela quebrar, com teto global de R$ 1 milhão renovável a cada 4 anos.',
  },
  {
    term: 'CDI',
    plain: 'A taxa que os bancos usam pra emprestar dinheiro entre eles de um dia pro outro; ela anda colada na Selic e virou a régua de comparação da renda fixa.',
  },
  {
    term: 'Selic',
    plain: 'A taxa básica de juros do país, definida pelo Banco Central — é o preço do dinheiro no Brasil, e quase toda a renda fixa se mexe atrás dela.',
  },
  {
    term: 'inflação',
    plain: 'A alta geral dos preços: é por isso que o mesmo dinheiro compra menos coisa hoje do que comprava no ano passado.',
  },
  {
    term: 'marcação a mercado',
    plain: 'O preço do seu título mudando todo dia conforme o quanto os títulos novos estão pagando — só te afeta se você vender antes do vencimento.',
  },
  {
    term: 'carência',
    plain: 'O período em que o dinheiro fica trancado e não sai de jeito nenhum, nem pagando multa.',
  },
  {
    term: 'come-cotas',
    plain: 'Imposto que alguns fundos descontam sozinhos duas vezes por ano, em maio e novembro, comendo um pedaço das suas cotas antes mesmo de você sacar.',
  },
  {
    term: 'aporte',
    plain: 'Cada vez que você coloca dinheiro numa aplicação — é só o nome chique de "depósito".',
  },
];
