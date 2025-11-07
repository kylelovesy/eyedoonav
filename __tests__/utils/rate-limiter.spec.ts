import {
  RateLimiter,
  signInRateLimiter, // We can test the exported instance too
} from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  const config = {
    maxAttempts: 3,
    windowMs: 10000, // 10 seconds
    blockDurationMs: 5000, // 5 seconds
  };
  let limiter: RateLimiter;
  const key = 'test-key';

  // Use fake timers to control Date.now()
  beforeEach(() => {
    jest.useFakeTimers();
    limiter = new RateLimiter(config);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow attempts under the limit', () => {
    expect(limiter.canAttempt(key)).toBe(true); // 1
    expect(limiter.canAttempt(key)).toBe(true); // 2
    expect(limiter.canAttempt(key)).toBe(true); // 3
    expect(limiter.getRemainingAttempts(key)).toBe(0);
  });

  it('should block attempts over the limit', () => {
    limiter.canAttempt(key); // 1
    limiter.canAttempt(key); // 2
    limiter.canAttempt(key); // 3
    expect(limiter.canAttempt(key)).toBe(false); // 4 - blocked
  });

  it('should unblock after blockDurationMs', () => {
    limiter.canAttempt(key);
    limiter.canAttempt(key);
    limiter.canAttempt(key);
    expect(limiter.canAttempt(key)).toBe(false); // Blocked

    // Advance time by 3 seconds (still blocked)
    jest.advanceTimersByTime(3000);
    expect(limiter.canAttempt(key)).toBe(false);
    expect(limiter.getTimeUntilUnblocked(key)).toBe(2000);

    // Advance time past the block duration
    jest.advanceTimersByTime(2001);
    expect(limiter.getTimeUntilUnblocked(key)).toBe(0);

    // Still can't attempt because window hasn't cleared
    expect(limiter.canAttempt(key)).toBe(false);
  });

  it('should allow attempts again after windowMs expires', () => {
    jest.setSystemTime(0);
    limiter.canAttempt(key); // 1 at 0ms
    jest.advanceTimersByTime(1000);
    limiter.canAttempt(key); // 2 at 1000ms
    jest.advanceTimersByTime(1000);
    limiter.canAttempt(key); // 3 at 2000ms

    expect(limiter.canAttempt(key)).toBe(false); // Blocked at 2000ms

    // Advance time past windowMs for first attempt
    jest.setSystemTime(10001); // 10001ms
    expect(limiter.getRemainingAttempts(key)).toBe(1); // First attempt expired
    expect(limiter.canAttempt(key)).toBe(true); // 4 at 10001ms
    expect(limiter.canAttempt(key)).toBe(false); // 5 - blocked again
  });

  it('should reset attempts and blocks for a key', () => {
    limiter.canAttempt(key);
    limiter.canAttempt(key);
    limiter.canAttempt(key);
    expect(limiter.canAttempt(key)).toBe(false); // Blocked

    limiter.reset(key);

    expect(limiter.getRemainingAttempts(key)).toBe(3);
    expect(limiter.getTimeUntilUnblocked(key)).toBe(0);
    expect(limiter.canAttempt(key)).toBe(true);
  });

  it('should clear all keys', () => {
    limiter.canAttempt('key1');
    limiter.canAttempt('key2');
    limiter.clear();
    expect(limiter.getRemainingAttempts('key1')).toBe(3);
    expect(limiter.getRemainingAttempts('key2')).toBe(3);
  });

  it('should handle rate limiting without blockDurationMs', () => {
    const noBlockLimiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 10000,
    });
    noBlockLimiter.canAttempt(key); // 1
    noBlockLimiter.canAttempt(key); // 2
    expect(noBlockLimiter.canAttempt(key)).toBe(false); // 3 - limited
    expect(noBlockLimiter.getTimeUntilUnblocked(key)).toBe(0); // Not blocked
  });
});
