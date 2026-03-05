import { createMappingEngine } from './mapping-engine';
import type { MappingConfig } from './types';

describe('MappingEngine', () => {
  describe('règles from', () => {
    it('devrait copier un champ simple', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'name', type: 'from', sourceField: 'firstName' },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ firstName: 'Jean' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Jean');
    });

    it('devrait copier un champ imbriqué', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'city', type: 'from', sourceField: 'address.city' },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ address: { city: 'Paris' } });

      expect(result.success).toBe(true);
      expect(result.data?.city).toBe('Paris');
    });

    it('devrait utiliser la valeur par défaut si champ absent', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'country', type: 'from', sourceField: 'pays', defaultValue: 'France' },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({});

      expect(result.success).toBe(true);
      expect(result.data?.country).toBe('France');
    });
  });

  describe('règles value', () => {
    it('devrait assigner une valeur constante', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'type', type: 'value', value: 'CLIENT' },
          { destinationField: 'active', type: 'value', value: true },
          { destinationField: 'count', type: 'value', value: 42 },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({});

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('CLIENT');
      expect(result.data?.active).toBe(true);
      expect(result.data?.count).toBe(42);
    });
  });

  describe('règles formula', () => {
    it('devrait évaluer UPPER', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'upperName', type: 'formula', formula: 'UPPER(source.name)' },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ name: 'jean' });

      expect(result.success).toBe(true);
      expect(result.data?.upperName).toBe('JEAN');
    });

    it('devrait évaluer CONCAT', () => {
      const config: MappingConfig = {
        rules: [
          {
            destinationField: 'fullName',
            type: 'formula',
            formula: 'CONCAT(source.firstName, " ", source.lastName)',
          },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ firstName: 'Jean', lastName: 'Dupont' });

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe('Jean Dupont');
    });

    it('devrait évaluer IF', () => {
      const config: MappingConfig = {
        rules: [
          {
            destinationField: 'status',
            type: 'formula',
            formula: 'IF(source.active, "ACTIF", "INACTIF")',
          },
        ],
      };
      const engine = createMappingEngine(config);

      expect(engine.transform({ active: true }).data?.status).toBe('ACTIF');
      expect(engine.transform({ active: false }).data?.status).toBe('INACTIF');
    });

    it('devrait évaluer des formules imbriquées', () => {
      const config: MappingConfig = {
        rules: [
          {
            destinationField: 'result',
            type: 'formula',
            formula: 'UPPER(TRIM(source.name))',
          },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ name: '  jean  ' });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe('JEAN');
    });
  });

  describe('règles lookup', () => {
    it('devrait chercher dans une table de lookup', () => {
      const config: MappingConfig = {
        rules: [
          {
            destinationField: 'countryName',
            type: 'lookup',
            sourceField: 'countryCode',
            lookupTable: 'countries',
            lookupKey: 'code',
            lookupValue: 'name',
          },
        ],
        lookupTables: [
          {
            name: 'countries',
            data: {
              FR: { code: 'FR', name: 'France' },
              DE: { code: 'DE', name: 'Allemagne' },
              ES: { code: 'ES', name: 'Espagne' },
            },
          },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ countryCode: 'FR' });

      expect(result.success).toBe(true);
      expect(result.data?.countryName).toBe('France');
    });

    it('devrait utiliser la valeur par défaut si lookup échoue', () => {
      const config: MappingConfig = {
        rules: [
          {
            destinationField: 'countryName',
            type: 'lookup',
            sourceField: 'countryCode',
            lookupTable: 'countries',
            lookupKey: 'code',
            lookupValue: 'name',
            defaultValue: 'Inconnu',
          },
        ],
        lookupTables: [
          {
            name: 'countries',
            data: {
              FR: { code: 'FR', name: 'France' },
            },
          },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ countryCode: 'XX' });

      expect(result.success).toBe(true);
      expect(result.data?.countryName).toBe('Inconnu');
    });
  });

  describe('transformBatch', () => {
    it('devrait transformer un tableau de records', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'name', type: 'from', sourceField: 'firstName' },
        ],
      };
      const engine = createMappingEngine(config);

      const results = engine.transformBatch([
        { firstName: 'Jean' },
        { firstName: 'Marie' },
        { firstName: 'Pierre' },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].data?.name).toBe('Jean');
      expect(results[1].data?.name).toBe('Marie');
      expect(results[2].data?.name).toBe('Pierre');
    });
  });

  describe('transformStream', () => {
    it('devrait transformer un flux de records', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'upper', type: 'formula', formula: 'UPPER(source.name)' },
        ],
      };
      const engine = createMappingEngine(config);

      const records = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
      const results = [...engine.transformStream(records)];

      expect(results).toHaveLength(3);
      expect(results[0].data?.upper).toBe('A');
      expect(results[1].data?.upper).toBe('B');
      expect(results[2].data?.upper).toBe('C');
    });
  });

  describe('gestion des erreurs', () => {
    it('devrait capturer les erreurs par champ', () => {
      const config: MappingConfig = {
        rules: [
          { destinationField: 'name', type: 'from', sourceField: 'firstName' },
          { destinationField: 'bad', type: 'lookup', lookupTable: 'inexistant', lookupKey: 'x', lookupValue: 'y' },
        ],
      };
      const engine = createMappingEngine(config);

      const result = engine.transform({ firstName: 'Jean' });

      expect(result.success).toBe(false);
      expect(result.data?.name).toBe('Jean');
      expect(result.fieldErrors?.bad).toBeDefined();
    });
  });
});
