const SESSION_KEY = 'healthdekho.session';

export function readSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw);
    if (!session.accessToken || (session.expiresAt && new Date(session.expiresAt) <= new Date())) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
