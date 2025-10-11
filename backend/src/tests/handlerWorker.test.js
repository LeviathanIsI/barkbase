const { parseDuration } = require('../jobs/handlerWorker');

describe('handler worker utilities', () => {
  test('parseDuration handles minutes', () => {
    expect(parseDuration('PT5M')).toBe(5 * 60 * 1000);
  });

  test('parseDuration handles composite durations', () => {
    expect(parseDuration('P1DT2H')).toBe((24 * 60 * 60 + 2 * 60 * 60) * 1000);
  });

  test('parseDuration rejects invalid strings', () => {
    expect(() => parseDuration('invalid')).toThrow();
  });
});
