import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '7d';

export interface JWTPayload {
  walletAddress: string;
  userId: string;
  iat: number;
  exp: number;
}

export function generateNonce(): string {
  const randomBytes = nacl.randomBytes(32);
  const nonce = bs58.encode(randomBytes);
  return `Sign this message to authenticate with shipmint: ${nonce}`;
}

export function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export function createToken(walletAddress: string, userId: string): string {
  return jwt.sign({ walletAddress, userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
