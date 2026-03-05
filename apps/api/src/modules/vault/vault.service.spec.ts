import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VaultService } from './vault.service';

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<VaultService>(VaultService);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt/decrypt', () => {
    it('devrait chiffrer et déchiffrer correctement une chaîne', () => {
      const plaintext = 'Mon secret très important';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('devrait produire des résultats différents pour le même texte (IV aléatoire)', () => {
      const plaintext = 'Test';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('devrait gérer les caractères spéciaux et unicode', () => {
      const plaintext = 'Café ☕ émojis 🎉 et accents éàü';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('devrait gérer les chaînes vides', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('devrait gérer les très longues chaînes', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptObject/decryptObject', () => {
    it('devrait chiffrer et déchiffrer correctement un objet', () => {
      const obj = {
        apiKey: 'sk_live_123456',
        secretKey: 'secret_abcdef',
        nested: {
          value: 42,
        },
      };

      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('devrait gérer les objets avec différents types de valeurs', () => {
      const obj = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: 'b' },
      };

      const encrypted = service.encryptObject(obj);
      const decrypted = service.decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe('hash', () => {
    it('devrait produire un hash SHA-256 cohérent', () => {
      const data = 'test data';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('devrait produire des hash différents pour des données différentes', () => {
      const hash1 = service.hash('data1');
      const hash2 = service.hash('data2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('devrait générer un token de la longueur spécifiée', () => {
      const token = service.generateSecureToken(32);
      expect(token).toHaveLength(64);
    });

    it('devrait générer des tokens uniques', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });
});
