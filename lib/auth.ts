export const AUTH_COOKIE = 'auth_token';
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'qwerty';

export function validateCredentials(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
