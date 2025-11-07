/*---------------------------------------
File: src/utils/rate-limiter.ts
Description: Rate limiting utility for controlling operation frequency and preventing abuse.
Provides configurable rate limiting with attempt tracking, blocking, and automatic cleanup.

Author: Kyle Lovesy
Date: 29/10-2025 - 15.00
Version: 1.0.0
---------------------------------------*/

/**
 * Configuration for rate limiting behavior
 */
interface RateLimitConfig {
  /** Maximum number of attempts allowed within the time window */
  maxAttempts: number;
  /** Time window in milliseconds for counting attempts */
  windowMs: number;
  /** Optional duration to block after exceeding limit (in milliseconds) */
  blockDurationMs?: number;
}

/**
 * RateLimiter class provides rate limiting functionality with attempt tracking and blocking.
 * Tracks attempts per key within a configurable time window and can block keys after exceeding limits.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   maxAttempts: 5,
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
 * });
 *
 * if (limiter.canAttempt('user-123')) {
 *   // Perform operation
 * } else {
 *   // Rate limited
 * }
 * ```
 */
export class RateLimiter {
  /** Map of keys to their attempt timestamps */
  private attempts = new Map<string, number[]>();

  /** Map of blocked keys to their unblock timestamp */
  private blocked = new Map<string, number>();

  /**
   * Creates a new RateLimiter instance
   * @param config - Rate limiting configuration
   */
  constructor(private config: RateLimitConfig) {}

  /**
   * Checks if operation is allowed for given key
   * Automatically records the attempt if allowed
   *
   * @param key - Unique identifier for the rate limit (e.g., email, userId, IP)
   * @returns true if allowed, false if rate limited
   *
   * @example
   * ```typescript
   * if (limiter.canAttempt('user@example.com')) {
   *   // Proceed with operation
   * } else {
   *   // Rate limited - show error
   * }
   * ```
   */
  canAttempt(key: string): boolean {
    const now = Date.now();

    // Check if currently blocked
    const blockedUntil = this.blocked.get(key);
    if (blockedUntil && now < blockedUntil) {
      return false;
    }

    // Clean up expired block
    if (blockedUntil) {
      this.blocked.delete(key);
    }

    // Get recent attempts
    const attempts = this.attempts.get(key) || [];

    // Filter out old attempts (outside the time window)
    const recentAttempts = attempts.filter(timestamp => now - timestamp < this.config.windowMs);

    // Check if under limit
    if (recentAttempts.length >= this.config.maxAttempts) {
      // Block if configured
      if (this.config.blockDurationMs) {
        this.blocked.set(key, now + this.config.blockDurationMs);
      }
      return false;
    }

    // Record attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Gets remaining attempts for a given key within the current time window
   *
   * @param key - Unique identifier for the rate limit
   * @returns Number of remaining attempts (0 if at or over limit)
   *
   * @example
   * ```typescript
   * const remaining = limiter.getRemainingAttempts('user@example.com');
   * console.log(`You have ${remaining} attempts remaining`);
   * ```
   */
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(timestamp => now - timestamp < this.config.windowMs);
    return Math.max(0, this.config.maxAttempts - recentAttempts.length);
  }

  /**
   * Gets time until unblocked (in milliseconds)
   *
   * @param key - Unique identifier for the rate limit
   * @returns Time remaining in milliseconds until unblocked, or 0 if not blocked
   *
   * @example
   * ```typescript
   * const timeUntilUnblocked = limiter.getTimeUntilUnblocked('user@example.com');
   * const minutes = Math.ceil(timeUntilUnblocked / 60000);
   * console.log(`Try again in ${minutes} minutes`);
   * ```
   */
  getTimeUntilUnblocked(key: string): number {
    const blockedUntil = this.blocked.get(key);
    if (!blockedUntil) return 0;

    const now = Date.now();
    return Math.max(0, blockedUntil - now);
  }

  /**
   * Resets attempts and blocking for a given key
   * Useful after successful operations or manual resets
   *
   * @param key - Unique identifier for the rate limit
   *
   * @example
   * ```typescript
   * // After successful sign-in, reset the limiter
   * signInRateLimiter.reset(userEmail);
   * ```
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.blocked.delete(key);
  }

  /**
   * Clears all rate limiting data
   * Useful for testing or emergency resets
   *
   * @example
   * ```typescript
   * // Emergency reset (use with caution)
   * rateLimiter.clear();
   * ```
   */
  clear(): void {
    this.attempts.clear();
    this.blocked.clear();
  }
}

// ============================================================================
// Pre-configured Rate Limiters
// ============================================================================

/**
 * Rate limiter for sign-in operations
 * - Max 5 attempts per 15 minutes
 * - Blocks for 15 minutes after exceeding limit
 */
export const signInRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
});

/**
 * Rate limiter for sign-up operations
 * - Max 3 attempts per hour
 * - Blocks for 1 hour after exceeding limit
 */
export const signUpRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
});

/**
 * Rate limiter for password reset operations
 * - Max 3 attempts per hour
 * - No blocking (relies on time window only)
 */
export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Rate limiter for email verification operations
 * - Max 5 attempts per hour
 * - No blocking (relies on time window only)
 */
export const emailVerificationRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});
