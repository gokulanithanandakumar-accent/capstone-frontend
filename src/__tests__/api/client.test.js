import { attachToken, handleUnauthorized } from '../../api/client';
import { readSession, writeSession } from '../../auth/session';

describe('api client interceptors', () => {
  beforeEach(() => sessionStorage.clear());

  test('attaches bearer token from the session', () => {
    writeSession({ accessToken: 'abc.def.ghi', expiresAt: new Date(Date.now() + 60000).toISOString() });
    const config = attachToken({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  test('does not attach a token when no session exists', () => {
    const config = attachToken({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  test('ignores an expired session', () => {
    writeSession({ accessToken: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString() });
    const config = attachToken({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
    expect(readSession()).toBeNull();
  });

  test('clears the session and redirects to login on 401 from protected endpoints', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { pathname: '/dashboard', assign: jest.fn() };
    try {
      writeSession({ accessToken: 'token' });
      const error = { config: { url: '/policies/me' }, response: { status: 401 } };
      await expect(handleUnauthorized(error)).rejects.toBe(error);
      expect(readSession()).toBeNull();
      expect(window.location.assign).toHaveBeenCalledWith('/login');
    } finally {
      window.location = originalLocation;
    }
  });

  test('keeps the session on 401 from the login endpoint', async () => {
    writeSession({ accessToken: 'token' });
    const error = { config: { url: '/auth/login' }, response: { status: 401 } };
    await expect(handleUnauthorized(error)).rejects.toBe(error);
    expect(readSession()).not.toBeNull();
  });
});

