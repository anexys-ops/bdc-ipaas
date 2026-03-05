import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Service de chiffrement AES-256-GCM pour les secrets sensibles.
 * La clé de chiffrement (VAULT_KEY) doit être exactement 32 bytes en hexadécimal.
 */
@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const vaultKey = this.configService.get<string>('VAULT_KEY');

    if (!vaultKey) {
      this.logger.warn('VAULT_KEY non définie - utilisation d\'une clé temporaire (dev only)');
      this.key = crypto.randomBytes(32);
    } else {
      if (vaultKey.length !== 64) {
        throw new Error('VAULT_KEY doit être exactement 64 caractères hexadécimaux (32 bytes)');
      }
      this.key = Buffer.from(vaultKey, 'hex');
    }
  }

  /**
   * Chiffre une chaîne de caractères en utilisant AES-256-GCM.
   * Retourne : base64(iv + authTag + ciphertext)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      const result = Buffer.concat([iv, authTag, encrypted]);
      return result.toString('base64');
    } catch (error) {
      this.logger.error('Erreur lors du chiffrement', error);
      throw new InternalServerErrorException('Erreur de chiffrement');
    }
  }

  /**
   * Déchiffre une chaîne chiffrée en base64.
   * Format attendu : base64(iv + authTag + ciphertext)
   */
  decrypt(ciphertext: string): string {
    try {
      const data = Buffer.from(ciphertext, 'base64');

      const iv = data.subarray(0, this.ivLength);
      const authTag = data.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = data.subarray(this.ivLength + this.authTagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Erreur lors du déchiffrement', error);
      throw new InternalServerErrorException('Erreur de déchiffrement - données corrompues ou clé invalide');
    }
  }

  /**
   * Chiffre un objet JSON.
   */
  encryptObject(obj: Record<string, unknown>): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Déchiffre un objet JSON.
   */
  decryptObject<T = Record<string, unknown>>(ciphertext: string): T {
    const json = this.decrypt(ciphertext);
    return JSON.parse(json) as T;
  }

  /**
   * Génère un hash SHA-256 pour identifier de manière unique une configuration.
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Génère un token aléatoire sécurisé.
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
