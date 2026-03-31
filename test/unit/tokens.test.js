import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccessToken, exchangeAuthCode, GOOGLE_SCOPES } from '../../lib/tokens.js';

describe('GOOGLE_SCOPES', () => {
  it('includes calendar scopes only (no gmail)', () => {
    expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(GOOGLE_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events');
    expect(GOOGLE_SCOPES).not.toContain('gmail');
  });
});

describe('getAccessToken', () => {
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn(),
    };
  });

  it('returns cached token if present and not expired', async () => {
    mockKv.get.mockResolvedValue('cached-token-123');

    const token = await getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'refresh-xyz',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(token).toBe('cached-token-123');
    expect(mockKv.get).toHaveBeenCalledWith('token:ashley');
  });

  it('refreshes and caches token if cache is empty', async () => {
    mockKv.get.mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'fresh-token-456',
        expires_in: 3600,
      }),
    });

    const token = await getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'refresh-xyz',
      clientId: 'cid',
      clientSecret: 'csecret',
    });

    expect(token).toBe('fresh-token-456');
    expect(mockKv.put).toHaveBeenCalledWith('token:ashley', 'fresh-token-456', { expirationTtl: 3300 });
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('throws if Google token refresh fails', async () => {
    mockKv.get.mockResolvedValue(null);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid refresh token'),
    });

    await expect(getAccessToken({
      kv: mockKv,
      hostId: 'ashley',
      refreshToken: 'bad-token',
      clientId: 'cid',
      clientSecret: 'csecret',
    })).rejects.toThrow('Google token refresh failed: 401');
  });
});

describe('exchangeAuthCode', () => {
  it('exchanges auth code for tokens', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        expires_in: 3600,
      }),
    });

    const result = await exchangeAuthCode({
      code: 'auth-code-123',
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://agentical.com/auth/callback',
    });

    expect(result.accessToken).toBe('access-abc');
    expect(result.refreshToken).toBe('refresh-xyz');
  });
});
