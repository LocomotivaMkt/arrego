import { getDb } from '@/db/client';
import type { Profile } from '@/types/models';
import { clampDayOrNull, nowISO, pick } from './_shared';

type ProfileRow = {
  id: number;
  name: string;
  photo_uri: string | null;
  avatar_emoji: string;
  payday: number | null;
  created_at: string;
  onboarded_at: string | null;
};

/**
 * Vazio, e não uma carinha: o avatar virou INICIAIS (ver `ui/Avatar.tsx`) e a UI
 * não lê mais este campo. Um default com emoji gravaria hoje um dado que nasce
 * morto.
 *
 * Por que a coluna sobreviveu: SQLite não dropa coluna sem recriar a tabela, ou
 * seja, apagar `avatar_emoji` custaria uma migração — e uma migração que copia a
 * tabela inteira, com o risco que isso tem, para não mudar comportamento nenhum.
 * O campo simplesmente parou de ser usado. Quem já tem uma carinha gravada
 * continua com ela no banco; ela só não aparece em lugar nenhum.
 */
const DEFAULT_EMOJI = '';

export type ProfileInput = {
  name: string;
  photoUri?: string | null;
  avatarEmoji?: string;
  payday?: number | null;
};

function mapRow(row: ProfileRow): Profile {
  return {
    id: 1,
    name: row.name,
    photoUri: row.photo_uri,
    avatarEmoji: row.avatar_emoji,
    payday: row.payday,
    createdAt: row.created_at,
    onboardedAt: row.onboarded_at,
  };
}

async function get(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1;');
  return row ? mapRow(row) : null;
}

/**
 * Perfil é singleton (id = 1). Campos ausentes no input preservam o que já
 * estava — trocar a foto não pode apagar o payday.
 */
async function upsert(input: ProfileInput): Promise<Profile> {
  const db = await getDb();
  const current = await get();

  const next: Profile = {
    id: 1,
    name: input.name,
    photoUri: pick(input.photoUri, current?.photoUri ?? null),
    avatarEmoji: pick(input.avatarEmoji, current?.avatarEmoji ?? DEFAULT_EMOJI),
    payday: clampDayOrNull(pick(input.payday, current?.payday ?? null)),
    createdAt: current?.createdAt ?? nowISO(),
    onboardedAt: current?.onboardedAt ?? null,
  };

  // O DO UPDATE não toca em created_at nem onboarded_at: editar o perfil não
  // rejuvenesce a conta nem desfaz o onboarding.
  await db.runAsync(
    `INSERT INTO profile (id, name, photo_uri, avatar_emoji, payday, created_at, onboarded_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       photo_uri = excluded.photo_uri,
       avatar_emoji = excluded.avatar_emoji,
       payday = excluded.payday;`,
    [next.name, next.photoUri, next.avatarEmoji, next.payday, next.createdAt, next.onboardedAt],
  );

  return next;
}

async function markOnboarded(): Promise<void> {
  const db = await getDb();
  // Só marca uma vez: reabrir o onboarding não reescreve a data original.
  await db.runAsync('UPDATE profile SET onboarded_at = ? WHERE id = 1 AND onboarded_at IS NULL;', [
    nowISO(),
  ]);
}

async function clear(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM profile WHERE id = 1;');
}

export const profileRepo = { get, upsert, markOnboarded, clear };
