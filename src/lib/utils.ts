export const conditions = {
  MT: 'Mint',
  NM: 'Near Mint',
  EX: 'Excelente',
  GD: 'Bom',
  LP: 'Pouco jogada',
  PL: 'Jogada',
  PO: 'Danificada',
};
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || 'D'
  );
}
export function cardImage(id: number) {
  return `/api/card-image/${id}`;
}
export function frameLabel(type: string) {
  if (/spell/i.test(type)) return 'Magia';
  if (/trap/i.test(type)) return 'Armadilha';
  if (/fusion/i.test(type)) return 'Fusão';
  if (/synchro/i.test(type)) return 'Sincro';
  if (/xyz/i.test(type)) return 'Xyz';
  if (/link/i.test(type)) return 'Link';
  if (/ritual/i.test(type)) return 'Ritual';
  return 'Monstro';
}
export function friendlyError(message: string) {
  if (/not authorized|smtp|sending confirmation email|sending recovery email/i.test(message))
    return 'O envio de e-mail está indisponível. Tente novamente em instantes.';
  if (/muito rápido|Limite de propostas/.test(message)) return message;
  if (/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered|already been registered/i.test(message))
    return 'Este e-mail já está cadastrado.';
  if (/rate limit|too many requests/i.test(message))
    return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (/duplicate key|unique constraint/i.test(message))
    return 'Este nome de usuário ou carta já está na sua lista.';
  if (/Failed to fetch|NetworkError/i.test(message))
    return 'Não foi possível conectar. Verifique sua conexão.';
  return 'Não foi possível concluir a ação. Tente novamente.';
}
export function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
}
