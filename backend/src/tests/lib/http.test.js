const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockChild = jest.fn(() => ({ info: mockInfo, warn: mockWarn }));

jest.mock('../../lib/logger', () => ({
  logger: { child: mockChild },
}));

jest.mock('node-fetch', () => jest.fn());

const fetchMock = require('node-fetch');
const { request } = require('../../lib/http');

describe('lib/http request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends correlation id header and parses JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {},
      text: jest.fn().mockResolvedValue('{"ok":true}'),
    });

    const result = await request({
      method: 'POST',
      url: 'https://example.com',
      data: { hello: 'world' },
      correlationId: 'corr-1',
      maxRetries: 0,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-correlation-id': 'corr-1' }),
      }),
    );
    expect(mockChild).toHaveBeenCalledWith({ url: 'https://example.com', method: 'POST', correlationId: 'corr-1' });
    expect(result).toEqual({ status: 200, headers: {}, attempt: 1, data: { ok: true } });
  });

  it('retries once on server error', async () => {
    jest.useFakeTimers();

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {},
        text: jest.fn().mockResolvedValue('fail'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {},
        text: jest.fn().mockResolvedValue('ok'),
      });

    const requestPromise = request({
      method: 'GET',
      url: 'https://retry.test',
      maxRetries: 1,
      correlationId: 'retry',
    });

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    const result = await requestPromise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
    expect(mockWarn).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('rejects when request times out', async () => {
    fetchMock.mockImplementationOnce((_url, options) =>
      new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(options.signal.reason || new Error('Aborted'));
        });
      }),
    );

    await expect(request({
      method: 'GET',
      url: 'https://timeout.test',
      timeout: 5,
      maxRetries: 0,
    })).rejects.toThrow('Request timed out');
  });
});
