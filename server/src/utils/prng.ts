import crypto from 'node:crypto';

/**
 * Creates a seeded random number generator (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function seededRandom(seed: string): () => number {
  // Convert string seed to a 32-bit integer via SHA-256
  const hash = crypto.createHash('sha256').update(seed).digest();
  let state = hash.readUInt32BE(0);

  return function mulberry32(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
