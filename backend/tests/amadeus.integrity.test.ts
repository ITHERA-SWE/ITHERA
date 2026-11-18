import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getAmadeusAccessToken } from '../src/infrastructure/external-apis/amadeus.service';

describe('Amadeus API Integrity Test', () => {
  const envKeys = ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET', 'AMADEUS_AUTH_URL'] as const;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    process.env.AMADEUS_CLIENT_ID = 'test_id';
    process.env.AMADEUS_CLIENT_SECRET = 'test_secret';
    process.env.AMADEUS_AUTH_URL = 'https://amadeus.example.test/v1/security/oauth2/token';
    // Todas las solicitudes son simuladas: la suite no depende de una API externa.
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Solicitud no simulada'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('rechaza credenciales invalidas cuando Amadeus responde 401', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(new Response('invalid_client', { status: 401 }));

    await expect(getAmadeusAccessToken()).rejects.toThrow(
      'No se pudo autenticar con Amadeus: 401 invalid_client',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(process.env.AMADEUS_AUTH_URL, expect.objectContaining({
      method: 'POST',
      body: 'grant_type=client_credentials&client_id=test_id&client_secret=test_secret',
      signal: expect.any(AbortSignal),
    }));
  });

  it('propaga los errores de red sin confundirlos con credenciales invalidas', async () => {
    const networkError = new TypeError('fetch failed');
    jest.mocked(fetch).mockRejectedValueOnce(networkError);

    await expect(getAmadeusAccessToken()).rejects.toBe(networkError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
