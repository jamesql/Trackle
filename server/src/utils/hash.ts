/** SHA-256 hashing for answer validation. Includes gameId to prevent rainbow-table attacks. */
import crypto from 'node:crypto';

export function hashAnswer(trackId: string, gameId: string): string {
  return crypto.createHash('sha256').update(trackId + gameId).digest('hex');
}
