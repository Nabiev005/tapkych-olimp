/** Only allow same-site relative redirects after login (no open redirects) */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
