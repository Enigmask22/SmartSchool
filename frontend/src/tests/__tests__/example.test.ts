/**
 * Example test file to verify Vitest setup
 * This demonstrates basic test patterns
 * 
 * File: src/tests/__tests__/example.test.ts
 * Purpose: Verify Vitest is working correctly
 * Expected: All tests should pass
 */

import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });

  it('should handle string operations', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
    expect(greeting.length).toBe(13);
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect([...arr, 6]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should work with objects', () => {
    const user = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };
    expect(user).toHaveProperty('email');
    expect(user.role).toBe('admin');
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  it('should handle rejections', async () => {
    const promise = Promise.reject(new Error('failed'));
    await expect(promise).rejects.toThrow('failed');
  });
});

/**
 * Run this test with:
 * npm run test -- src/tests/__tests__/example.test.ts
 * 
 * Or run all tests with:
 * npm run test
 * 
 * Or run with UI:
 * npm run test:ui
 * 
 * Expected output:
 * ✓ src/tests/__tests__/example.test.ts (6 tests)
 */
