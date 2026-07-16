const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Id local ordenável por tempo: prefixo de timestamp em base36 + sufixo
 * aleatório. Não é criptográfico e não precisa ser — nada aqui sai do
 * aparelho nem é adivinhável por terceiros. O prefixo temporal só serve para
 * `ORDER BY id` sair em ordem de criação sem índice extra.
 */
export function newId(): string {
  const time = Date.now().toString(36).padStart(9, '0');
  let random = '';
  for (let i = 0; i < 8; i++) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${time}${random}`;
}
