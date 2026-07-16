# Arrego: Seu Sincero Gestor Financeiro

App mobile que ajuda jovens a entender e organizar o próprio dinheiro, com uma IA amiga que é
sincera até doer um pouquinho.

Salário, contas, assinaturas, parcelas do cartão e objetivos entram no app. Ele calcula o que sobra,
projeta quanto tempo falta para cada meta no ritmo atual e comenta tudo isso com um sarcasmo que
tenta ser útil em vez de cruel.

---

## Rodando o projeto

Precisa de [Node.js](https://nodejs.org) 20 ou superior. O app roda no seu celular pelo **Expo Go**,
sem Android Studio nem Xcode.

```bash
npm install
npx expo install --fix   # alinha as versões nativas com o SDK do Expo instalado
npx expo start
```

Abra o **Expo Go** no celular e leia o QR code que aparecer no terminal. Celular e computador
precisam estar na mesma rede Wi-Fi.

> `npx expo install --fix` não é opcional. O `package.json` fixa versões que podem não bater com o SDK
> resolvido na sua máquina; esse comando as corrige para as versões que o SDK espera. Rode antes do
> primeiro `expo start`.

Checagem de tipos:

```bash
npm run typecheck
```

---

## Arquitetura

```
app/                      Rotas (expo-router, file-based)
  _layout.tsx             Stack raiz, hidratação, porta de onboarding
  onboarding.tsx          Cadastro local: nome, foto, quanto entra por mês
  (tabs)/                 Início · Grana · Cartão · Metas · Aprender
  perfil.tsx              Conta local e "apagar tudo"
  conversa.tsx            Conversa guiada com a Arrego

src/
  types/models.ts         Modelo de domínio — o contrato de tudo
  theme/                  Design tokens e hook de tema
  db/                     SQLite: schema versionado, client, repositórios
  engine/
    analysis.ts           Matemática financeira pura (sem I/O, sem React)
    insights.ts           Regras que viram observações da Arrego
    persona.ts            A voz dela: bancos de falas e o contrato de tom
  content/investments.ts  Conteúdo educativo e antigolpe
  store/useArrego.ts      Estado global (zustand) ligando banco e motor
  ui/                     Componentes burros e tematizados
  utils/                  Dinheiro em centavos, datas sem bug de fuso
```

---

## Regras do projeto

Estas não são preferências de estilo. São decisões que, se quebradas, causam dano real.

**Nenhum dado de cartão. Nunca.**
O app jamais pede ou guarda número, CVV, validade, titular ou senha. Um "cartão" aqui é um apelido e
dois dias do mês (fechamento e vencimento) — só o suficiente para saber em que mês a parcela cai.
Não existe campo para isso no schema, e não deve passar a existir.

**Dinheiro é sempre centavo inteiro.**
Float com dinheiro erra: `0.1 + 0.2 !== 0.3`. Num app que projeta metas de anos, esse erro acumula.
Todo valor trafega como `Cents` (inteiro) e só vira string na borda da UI. Use `src/utils/money.ts`.

**Datas nunca passam por `new Date(string)`.**
`new Date('2026-07-01')` é lido como UTC e, no Brasil, volta como 30/06 às 21h — o mês inteiro sai
errado por um dia. Use `parseISODate` de `src/utils/date.ts`.

**O amarelo é superfície, nunca tinta.**
Contraste medido do `#FFC53D`: preto por cima dá 13.3:1; branco por cima dá 1.58:1, ilegível.
Sobre amarelo, use `colors.ink.onBrand`. Texto amarelo em fundo claro tem o mesmo problema, invertido.

**Cor de gráfico não é cor de marca.**
As cores de série vêm de uma paleta já validada para daltonismo (pior ΔE adjacente de 24.2 no modo
claro), em ordem fixa, com teto de 8 — a nona categoria vira "Outros", nunca uma cor nova. Como alguns
slots ficam abaixo de 3:1 no fundo claro, todo gráfico carrega rótulo visível: identidade nunca é só cor.

**O app educa sobre investimento; não recomenda.**
`content/investments.ts` explica como cada coisa funciona para a pessoa decidir sozinha. Não existe
"invista em X". Também não existe número de mercado cravado (taxa de Selic, "rende X% ao ano") — isso
desatualiza e vira mentira dentro do app. Só regra estrutural entra, como a tabela regressiva de IR e o
teto do FGC. O público é jovem e sem repertório: apontar o dedo para um produto específico faz estrago
de verdade.

**O sarcasmo tem limite.**
A Arrego é passivo-agressiva com o *número* e com o *hábito*, nunca com a pessoa. Toda fala termina com
uma saída prática — sarcasmo sem saída é só maldade. Quando a pessoa acerta, a ironia sai de cena e a
comemoração é limpa. Vergonha financeira faz jovem fechar o app e não voltar; o humor é cúmplice.
O contrato de tom está no topo de `src/engine/persona.ts`.

---

## Onde os dados ficam

No aparelho, em SQLite, e em lugar nenhum além disso. Não há servidor, não há login, não há conta na
nuvem, não há telemetria. A "conta" do onboarding é um perfil local: nome, foto e emoji.

A contrapartida é real e o app diz isso na cara do usuário, na tela de perfil: **trocou de celular,
perdeu os dados.** Não é um bug a ser escondido, é o preço de não ter servidor.

---

## Aviso

O Arrego é uma ferramenta de organização e educação financeira. Ele não é consultor de investimentos,
não faz recomendação personalizada e não substitui um profissional certificado.
