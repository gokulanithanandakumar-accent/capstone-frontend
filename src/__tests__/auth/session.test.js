import {
  clearSession,
  readSession,
  writeSession,
} from '../../auth/session';

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('FE-AUTH-01 writes and reads valid session', () => {
    const session = {
      accessToken: 'token',
      expiresAt: new Date(
        Date.now() + 60000,
      ).toISOString(),
      customer: {
        customerId: 1,
        fullName: 'Demo Customer',
      },
    };

    writeSession(session);

    expect(readSession()).toEqual(session);
  });

  test('FE-AUTH-02 returns null when session is absent', () => {
    expect(readSession()).toBeNull();
  });

  test('FE-AUTH-03 removes expired session', () => {
    writeSession({
      accessToken: 'expired-token',
      expiresAt: new Date(
        Date.now() - 60000,
      ).toISOString(),
    });

    expect(readSession()).toBeNull();
    expect(
      sessionStorage.getItem('healthdekho.session'),
    ).toBeNull();
  });

  test('FE-AUTH-04 removes session with no token', () => {
    writeSession({
      expiresAt: new Date(
        Date.now() + 60000,
      ).toISOString(),
    });

    expect(readSession()).toBeNull();
  });

  test('FE-AUTH-05 removes malformed session', () => {
    sessionStorage.setItem(
      'healthdekho.session',
      '{bad-json',
    );

    expect(readSession()).toBeNull();
    expect(
      sessionStorage.getItem('healthdekho.session'),
    ).toBeNull();
  });

  test('FE-AUTH-06 clears session', () => {
    writeSession({ accessToken: 'token' });

    clearSession();

    expect(readSession()).toBeNull();
  });
});