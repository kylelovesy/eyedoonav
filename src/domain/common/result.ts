/*---------------------------------------
File: src/domain/common/result.ts
Description: Railway-Oriented Programming pattern implementation for type-safe error handling.
Provides Result<T, E> type that represents operation outcomes, eliminating try/catch blocks
and making error handling explicit and composable.

Key Features:
- Type-safe Result<T, E> union type
- Railway-oriented programming pattern
- Type guards for pattern matching
- Generic error handling with AppError as default
- Functional programming approach to error handling

Author: Kyle Lovesy
Date: 27/10-2025 - 09.45
Version: 1.1.0
---------------------------------------*/

import { AppError } from '@/domain/common/errors';

// =================================================================================
// MARK: - Core Result Type
// =================================================================================

/**
 * Result Type - Railway-Oriented Programming Pattern
 *
 * Represents the result of an operation that can either succeed or fail.
 * This makes error handling explicit and type-safe, eliminating the need
 * for try/catch blocks and making control flow visible in the type system.
 *
 * Benefits:
 * - Explicit error handling (no silent failures)
 * - Type-safe error propagation
 * - Composable error handling chains
 * - Railway-oriented programming support
 *
 * @template T - The type of the success value
 * @template E - The type of the error value (defaults to AppError)
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return err("Division by zero");
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error); // "Division by zero"
 * }
 * ```
 */
export type Result<T, E = AppError> = Ok<T> | Err<E>;

// =================================================================================
// MARK: - Result Variants
// =================================================================================

/**
 * Represents a successful operation result
 * Contains the success value of type T
 */
export interface Ok<T> {
  /** Discriminant property for type narrowing */
  readonly success: true;
  /** The successful result value */
  readonly value: T;
}

/**
 * Represents a failed operation result
 * Contains the error details of type E
 */
export interface Err<E> {
  /** Discriminant property for type narrowing */
  readonly success: false;
  /** The error details */
  readonly error: E;
}

// =================================================================================
// MARK: - Result Constructors
// =================================================================================

/**
 * Creates a successful Result containing the provided value
 *
 * @template T - The type of the success value
 * @param value - The successful result value
 * @returns An Ok result containing the value
 *
 * @example
 * ```typescript
 * const success = ok(42);
 * // { success: true, value: 42 }
 * ```
 */
export const ok = <T>(value: T): Ok<T> => ({
  success: true,
  value,
});

/**
 * Creates a failed Result containing the provided error
 *
 * @template E - The type of the error value
 * @param error - The error details
 * @returns An Err result containing the error
 *
 * @example
 * ```typescript
 * const failure = err("Something went wrong");
 * // { success: false, error: "Something went wrong" }
 * ```
 */
export const err = <E>(error: E): Err<E> => ({
  success: false,
  error,
});

// =================================================================================
// MARK: - Type Guards & Utilities
// =================================================================================

/**
 * Type guard to check if a Result is successful (Ok)
 * Enables type narrowing in TypeScript
 *
 * @template T - The success value type
 * @template E - The error value type
 * @param result - The Result to check
 * @returns True if the result is Ok, false if Err
 *
 * @example
 * ```typescript
 * const result = someOperation();
 * if (isOk(result)) {
 *   // TypeScript knows result.value exists here
 *   console.log(result.value);
 * }
 * ```
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.success === true;

/**
 * Type guard to check if a Result is failed (Err)
 * Enables type narrowing in TypeScript
 *
 * @template T - The success value type
 * @template E - The error value type
 * @param result - The Result to check
 * @returns True if the result is Err, false if Ok
 *
 * @example
 * ```typescript
 * const result = someOperation();
 * if (isErr(result)) {
 *   // TypeScript knows result.error exists here
 *   console.error(result.error);
 * }
 * ```
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result.success === false;
