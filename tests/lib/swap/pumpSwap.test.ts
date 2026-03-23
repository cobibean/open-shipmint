import { describe, expect, it } from 'vitest';
import {
  calculateExecutableSwapAmount,
  getRequiredTreasuryFloor,
  validateSwapConfig,
} from '@/lib/swap/pumpSwap';
import type { SwapConfig } from '@/types/swap';

const baseConfig: SwapConfig = {
  enabled: true,
  percentage: 90,
  tokenMint: '4KWDP6DpqrhB7Cm1fgFZFC1JYyikdo4oCKyiZ56xpump',
  slippage: 10,
  priorityFee: 50_000,
  maxRetries: 3,
  treasuryReserveSol: 0.02,
  treasuryBufferSol: 0.01,
};

describe('pumpSwap treasury reserve logic', () => {
  it('calculates required treasury floor from reserve + buffer', () => {
    expect(getRequiredTreasuryFloor(baseConfig)).toBeCloseTo(0.03, 8);
  });

  it('uses requested amount when treasury has enough spendable SOL', () => {
    const executable = calculateExecutableSwapAmount(0.015, 0.08, 0.03);
    expect(executable).toBeCloseTo(0.015, 8);
  });

  it('clamps swap amount to spendable SOL when request is too large', () => {
    const executable = calculateExecutableSwapAmount(0.05, 0.07, 0.03);
    expect(executable).toBeCloseTo(0.04, 8);
  });

  it('returns zero when treasury is below required floor', () => {
    const executable = calculateExecutableSwapAmount(0.01, 0.025, 0.03);
    expect(executable).toBe(0);
  });

  it('rejects negative reserve settings', () => {
    const validation = validateSwapConfig({
      ...baseConfig,
      treasuryReserveSol: -0.001,
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('reserve');
  });
});
