/**
 * Porta de entrada do banco. Telas e stores importam daqui:
 * `import { incomesRepo } from '@/db/repositories'`.
 *
 * Cada repo é a única coisa que sabe SQL da sua tabela — nenhum SELECT solto
 * espalhado pela UI, e nenhum valor de usuário interpolado em string.
 */

export { profileRepo } from './profile';
export type { ProfileInput } from './profile';

export { incomesRepo } from './incomes';
export type { IncomeInput, IncomePatch } from './incomes';

export { expensesRepo } from './expenses';
export type { ExpenseInput, ExpensePatch } from './expenses';

export { subscriptionsRepo } from './subscriptions';
export type { SubscriptionInput, SubscriptionPatch } from './subscriptions';

export { cardsRepo } from './cards';
export type { CardInput, CardPatch, CardPurchaseInput } from './cards';

export { goalsRepo } from './goals';
export type { GoalInput, GoalPatch, GoalDepositInput } from './goals';
