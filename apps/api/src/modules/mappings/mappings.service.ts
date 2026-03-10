import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  CreateMappingDto,
  UpdateMappingDto,
  PreviewMappingDto,
  AutoMapDto,
  LookupTableDto,
  MappingResponseDto,
  MappingRuleDto,
} from './dto/mapping.dto';

/** Aplatit un JSON Schema imbriqué en liste de champs dotnotation. */
function flattenSchema(schema: Record<string, unknown>, prefix = ''): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const props = (schema['properties'] as Record<string, unknown>) ?? schema;
  const fields: string[] = [];
  for (const [key, val] of Object.entries(props)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    fields.push(fullKey);
    if (val && typeof val === 'object') {
      const nested = (val as Record<string, unknown>)['properties'] as Record<string, unknown> | undefined;
      if (nested) {
        fields.push(...flattenSchema(nested, fullKey));
      }
    }
  }
  return fields;
}

/** Résout un champ dotnotation dans un objet source. */
function resolveField(record: Record<string, unknown>, field: string): unknown {
  const parts = field.replace(/^source\./, '').split('.');
  let current: unknown = record;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Moteur de mapping complet supportant tous les types de règles. */
function applyRules(
  record: Record<string, unknown>,
  rules: MappingRuleDto[],
  lookupTablesMap: Map<string, Record<string, Record<string, unknown>>>,
): { success: boolean; data?: Record<string, unknown>; fieldErrors?: Record<string, string> } {
  const result: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  for (const rule of rules) {
    try {
      let value: unknown = undefined;

      switch (rule.type) {
        case 'from': {
          if (!rule.sourceField) break;
          value = resolveField(record, rule.sourceField);
          break;
        }
        case 'value': {
          value = rule.value;
          break;
        }
        case 'concatenate': {
          const parts = (rule.parts ?? []).map((p) => {
            if (typeof p === 'string' && (p.startsWith('source.') || !p.includes(' '))) {
              return String(resolveField(record, p) ?? '');
            }
            return String(p);
          });
          value = parts.join(rule.separator ?? '');
          break;
        }
        case 'lookup': {
          if (!rule.lookupTable || !rule.lookupKey) break;
          const table = lookupTablesMap.get(rule.lookupTable);
          if (!table) break;
          const keyValue = String(resolveField(record, rule.lookupKey) ?? '');
          const row = table[keyValue];
          value = row && rule.lookupValue ? row[rule.lookupValue] : row;
          break;
        }
        case 'conditional': {
          if (!rule.condition) break;
          const condResult = evaluateCondition(record, rule.condition);
          value = condResult ? rule.valueIfTrue : rule.valueIfFalse;
          break;
        }
        case 'formula': {
          if (!rule.formula) break;
          value = evaluateFormula(record, rule.formula);
          break;
        }
      }

      if ((value === null || value === undefined) && rule.defaultValue !== undefined) {
        value = rule.defaultValue;
      }

      // Construit le champ destination (support dotnotation)
      const destParts = rule.destinationField.split('.');
      if (destParts.length === 1) {
        result[rule.destinationField] = value;
      } else {
        let obj = result;
        for (let i = 0; i < destParts.length - 1; i++) {
          if (!obj[destParts[i]] || typeof obj[destParts[i]] !== 'object') {
            obj[destParts[i]] = {};
          }
          obj = obj[destParts[i]] as Record<string, unknown>;
        }
        obj[destParts[destParts.length - 1]] = value;
      }
    } catch (err) {
      fieldErrors[rule.destinationField] = (err as Error).message;
    }
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;
  return { success: !hasErrors, data: result, fieldErrors: hasErrors ? fieldErrors : undefined };
}

function evaluateFormula(record: Record<string, unknown>, formula: string): unknown {
  const upperMatch = formula.match(/^UPPER\(([^)]+)\)$/i);
  if (upperMatch) return String(resolveField(record, upperMatch[1]) ?? '').toUpperCase();

  const lowerMatch = formula.match(/^LOWER\(([^)]+)\)$/i);
  if (lowerMatch) return String(resolveField(record, lowerMatch[1]) ?? '').toLowerCase();

  const trimMatch = formula.match(/^TRIM\(([^)]+)\)$/i);
  if (trimMatch) return String(resolveField(record, trimMatch[1]) ?? '').trim();

  const concatMatch = formula.match(/^CONCAT\((.+)\)$/i);
  if (concatMatch) {
    return splitArgs(concatMatch[1]).map((a) => {
      const cleaned = a.trim().replace(/^["'](.*)["']$/, '$1');
      if (cleaned.startsWith('source.') || (!cleaned.includes(' ') && !cleaned.includes('"'))) {
        return String(resolveField(record, cleaned) ?? '');
      }
      return cleaned;
    }).join('');
  }

  const dateMatch = formula.match(/^DATE_FORMAT\(([^,]+),\s*["']([^"']+)["']\)$/i);
  if (dateMatch) {
    const val = resolveField(record, dateMatch[1].trim());
    if (!val) return null;
    const d = new Date(String(val));
    if (isNaN(d.getTime())) return String(val);
    return formatDate(d, dateMatch[2]);
  }

  const numMatch = formula.match(/^NUMBER\(([^)]+)\)$/i);
  if (numMatch) return Number(resolveField(record, numMatch[1]) ?? 0);

  const roundMatch = formula.match(/^ROUND\(([^,]+),\s*(\d+)\)$/i);
  if (roundMatch) {
    const n = Number(resolveField(record, roundMatch[1].trim()) ?? 0);
    const dec = parseInt(roundMatch[2], 10);
    return Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
  }

  const ifMatch = formula.match(/^IF\((.+),\s*(.+),\s*(.+)\)$/i);
  if (ifMatch) {
    return evaluateCondition(record, ifMatch[1].trim())
      ? parseArg(record, ifMatch[2].trim())
      : parseArg(record, ifMatch[3].trim());
  }

  // Résolution directe
  return formula.replace(/source\.(\w+(?:\.\w+)*)/g, (_, field) => {
    const v = resolveField(record, field);
    return v === null || v === undefined ? '' : String(v);
  });
}

function evaluateCondition(record: Record<string, unknown>, condition: string): boolean {
  const eqMatch = condition.match(/^([^\s!<>=]+)\s*(===|==|!==|!=|>=|<=|>|<)\s*(.+)$/);
  if (eqMatch) {
    const left = resolveField(record, eqMatch[1].trim());
    const op = eqMatch[2];
    const rightRaw = eqMatch[3].trim().replace(/^["'](.*)["']$/, '$1');
    const right = rightRaw === 'null' ? null : rightRaw === 'undefined' ? undefined
      : rightRaw === 'true' ? true : rightRaw === 'false' ? false
      : isNaN(Number(rightRaw)) ? rightRaw : Number(rightRaw);
    switch (op) {
      case '===': case '==': return left === right;
      case '!==': case '!=': return left !== right;
      case '>': return Number(left) > Number(right);
      case '<': return Number(left) < Number(right);
      case '>=': return Number(left) >= Number(right);
      case '<=': return Number(left) <= Number(right);
    }
  }
  if (condition.startsWith('source.') || condition.startsWith('!source.')) {
    const neg = condition.startsWith('!');
    const field = condition.replace(/^!?/, '');
    return neg ? !resolveField(record, field) : !!resolveField(record, field);
  }
  return false;
}

function parseArg(record: Record<string, unknown>, arg: string): unknown {
  const clean = arg.replace(/^["'](.*)["']$/, '$1');
  if (clean.startsWith('source.') || !clean.includes(' ')) {
    const v = resolveField(record, clean);
    if (v !== undefined) return v;
  }
  return clean;
}

function splitArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0, buf = '', inStr = false, strChar = '';
  for (const c of s) {
    if (inStr) { buf += c; if (c === strChar) inStr = false; }
    else if (c === '"' || c === "'") { inStr = true; strChar = c; buf += c; }
    else if (c === '(') { depth++; buf += c; }
    else if (c === ')') { depth--; buf += c; }
    else if (c === ',' && depth === 0) { args.push(buf.trim()); buf = ''; }
    else { buf += c; }
  }
  if (buf.trim()) args.push(buf.trim());
  return args;
}

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

@Injectable()
export class MappingsService {
  private readonly logger = new Logger(MappingsService.name);

  constructor(
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {}

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  async create(tenantId: string, dto: CreateMappingDto): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const mapping = await prisma.mapping.create({
      data: {
        name: dto.name,
        description: dto.description,
        sourceSchema: dto.sourceSchema as object,
        destinationSchema: dto.destinationSchema as object,
        rules: dto.rules as object,
        writeMode: dto.writeMode ?? 'CREATE',
        matchField: dto.matchField,
        filterConfig: dto.filterConfig as object | undefined,
        sourceConnectorId: dto.sourceConnectorId,
        sourceOperationId: dto.sourceOperationId,
        destinationConnectorId: dto.destinationConnectorId,
        destinationOperationId: dto.destinationOperationId,
      },
    });
    return this.mapToResponse(mapping);
  }

  async findAll(tenantId: string): Promise<MappingResponseDto[]> {
    try {
      const prisma = await this.getTenantClient(tenantId);
      const mappings = await prisma.mapping.findMany({ orderBy: { createdAt: 'desc' } });
      return mappings.map((m) => this.mapToResponse(m));
    } catch (err) {
      this.logger.error(`findAll(tenantId=${tenantId}) failed`, err);
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'Impossible d\'accéder à la base de données des mappings. Vérifiez que le schéma tenant a bien été appliqué (db push).',
      );
    }
  }

  async findOne(tenantId: string, id: string): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const mapping = await prisma.mapping.findUnique({ where: { id }, include: { lookupTables: true } });
    if (!mapping) throw new NotFoundException(`Mapping non trouvé: ${id}`);
    return this.mapToResponse(mapping);
  }

  async update(tenantId: string, id: string, dto: UpdateMappingDto): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);

    // Vérification: ne peut pas passer isProduction=true sans dryRunPassed
    if (dto.isProduction === true) {
      const existing = await prisma.mapping.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Mapping non trouvé: ${id}`);
      if (!existing.dryRunPassed && dto.dryRunPassed !== true) {
        throw new BadRequestException('Le dry-run doit être validé avant la mise en production.');
      }
    }

    const mapping = await prisma.mapping.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sourceSchema !== undefined && { sourceSchema: dto.sourceSchema as object }),
        ...(dto.destinationSchema !== undefined && { destinationSchema: dto.destinationSchema as object }),
        ...(dto.rules !== undefined && { rules: dto.rules as object }),
        ...(dto.writeMode !== undefined && { writeMode: dto.writeMode }),
        ...(dto.matchField !== undefined && { matchField: dto.matchField }),
        ...(dto.filterConfig !== undefined && { filterConfig: dto.filterConfig as object }),
        ...(dto.dryRunPassed !== undefined && { dryRunPassed: dto.dryRunPassed }),
        ...(dto.isProduction !== undefined && { isProduction: dto.isProduction }),
        ...(dto.sourceConnectorId !== undefined && { sourceConnectorId: dto.sourceConnectorId }),
        ...(dto.sourceOperationId !== undefined && { sourceOperationId: dto.sourceOperationId }),
        ...(dto.destinationConnectorId !== undefined && { destinationConnectorId: dto.destinationConnectorId }),
        ...(dto.destinationOperationId !== undefined && { destinationOperationId: dto.destinationOperationId }),
      },
    });
    return this.mapToResponse(mapping);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.mapping.delete({ where: { id } });
  }

  /** Auto-mapping : génère des règles pour les champs de même nom entre source et destination. */
  autoMap(dto: AutoMapDto): MappingRuleDto[] {
    const sourceFields = flattenSchema(dto.sourceSchema);
    const destFields = flattenSchema(dto.destinationSchema);
    const sourceSet = new Set(sourceFields);
    return destFields
      .filter((f) => sourceSet.has(f))
      .map((f) => ({ destinationField: f, type: 'from' as const, sourceField: f }));
  }

  /** Prévisualisation du mapping sur données échantillon (max 20 lignes). */
  async preview(dto: PreviewMappingDto): Promise<{
    results: Array<{ success: boolean; data?: Record<string, unknown>; error?: string; index: number }>;
    stats: { total: number; success: number; failed: number };
  }> {
    const lookupTablesMap = new Map<string, Record<string, Record<string, unknown>>>();
    if (dto.lookupTables) {
      for (const lt of dto.lookupTables) {
        lookupTablesMap.set(lt.name, lt.data);
      }
    }
    const sample = dto.sampleData.slice(0, 20);
    const results = sample.map((record, index) => {
      const r = applyRules(record, dto.rules, lookupTablesMap);
      return {
        success: r.success,
        data: r.data,
        error: r.fieldErrors ? Object.entries(r.fieldErrors).map(([f, e]) => `${f}: ${e}`).join('; ') : undefined,
        index,
      };
    });
    const successCount = results.filter((r) => r.success).length;
    return { results, stats: { total: results.length, success: successCount, failed: results.length - successCount } };
  }

  /** Dry-run : exécute le mapping sur des données de test et marque dryRunPassed si tout OK. */
  async dryRun(tenantId: string, id: string, sampleData: Record<string, unknown>[]): Promise<{
    passed: boolean;
    results: Array<{ success: boolean; data?: Record<string, unknown>; error?: string; index: number }>;
    stats: { total: number; success: number; failed: number };
  }> {
    const prisma = await this.getTenantClient(tenantId);
    const mapping = await prisma.mapping.findUnique({ where: { id }, include: { lookupTables: true } });
    if (!mapping) throw new NotFoundException(`Mapping non trouvé: ${id}`);

    const lookupTablesMap = new Map<string, Record<string, Record<string, unknown>>>();
    for (const lt of (mapping as { lookupTables?: Array<{ name: string; data: unknown }> }).lookupTables ?? []) {
      lookupTablesMap.set(lt.name, lt.data as Record<string, Record<string, unknown>>);
    }

    const rules = (Array.isArray(mapping.rules) ? mapping.rules : []) as unknown as MappingRuleDto[];
    const sample = sampleData.slice(0, 20);
    const results = sample.map((record, index) => {
      const r = applyRules(record, rules, lookupTablesMap);
      return { success: r.success, data: r.data, error: r.fieldErrors ? Object.entries(r.fieldErrors).map(([f, e]) => `${f}: ${e}`).join('; ') : undefined, index };
    });
    const successCount = results.filter((r) => r.success).length;
    const passed = successCount === results.length && results.length > 0;

    // Marque automatiquement dryRunPassed si 100% OK
    if (passed) {
      await prisma.mapping.update({ where: { id }, data: { dryRunPassed: true } });
    }

    return { passed, results, stats: { total: results.length, success: successCount, failed: results.length - successCount } };
  }

  /** Valide les règles (dry-run sans données). */
  async validateRules(rules: MappingRuleDto[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    for (const rule of rules) {
      if (!rule.destinationField) errors.push(`Règle sans champ destination`);
      if (rule.type === 'from' && !rule.sourceField) errors.push(`Règle 'from' sans sourceField pour ${rule.destinationField}`);
      if (rule.type === 'formula' && !rule.formula) errors.push(`Règle 'formula' sans formule pour ${rule.destinationField}`);
      if (rule.type === 'lookup' && (!rule.lookupTable || !rule.lookupKey)) errors.push(`Règle 'lookup' incomplète pour ${rule.destinationField}`);
      if (rule.type === 'concatenate' && (!rule.parts || rule.parts.length === 0)) errors.push(`Règle 'concatenate' sans parts pour ${rule.destinationField}`);
    }
    return { valid: errors.length === 0, errors };
  }

  flattenSchema(schema: Record<string, unknown>): string[] {
    return flattenSchema(schema);
  }

  async addLookupTable(tenantId: string, mappingId: string, dto: LookupTableDto): Promise<{ id: string; name: string }> {
    const prisma = await this.getTenantClient(tenantId);
    const table = await prisma.lookupTable.create({ data: { mappingId, name: dto.name, data: dto.data as object } });
    return { id: table.id, name: table.name };
  }

  async updateLookupTable(tenantId: string, mappingId: string, tableId: string, dto: LookupTableDto): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.lookupTable.updateMany({ where: { id: tableId, mappingId }, data: { name: dto.name, data: dto.data as object } });
  }

  async deleteLookupTable(tenantId: string, mappingId: string, tableId: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.lookupTable.deleteMany({ where: { id: tableId, mappingId } });
  }

  async getLookupTables(tenantId: string, mappingId: string): Promise<Array<{ id: string; name: string; data: Record<string, unknown> }>> {
    const prisma = await this.getTenantClient(tenantId);
    const tables = await prisma.lookupTable.findMany({ where: { mappingId } });
    return tables.map((t) => ({ id: t.id, name: t.name, data: t.data as Record<string, unknown> }));
  }

  async duplicate(tenantId: string, id: string): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const original = await prisma.mapping.findUnique({ where: { id }, include: { lookupTables: true } });
    if (!original) throw new NotFoundException(`Mapping non trouvé: ${id}`);
    const copy = await prisma.mapping.create({
      data: {
        name: `${original.name} (copie)`,
        sourceSchema: original.sourceSchema as object,
        destinationSchema: original.destinationSchema as object,
        rules: original.rules as object,
        writeMode: original.writeMode,
        matchField: original.matchField,
        filterConfig: original.filterConfig as object | undefined,
        sourceConnectorId: original.sourceConnectorId,
        sourceOperationId: original.sourceOperationId,
        destinationConnectorId: original.destinationConnectorId,
        destinationOperationId: original.destinationOperationId,
      },
    });
    for (const lt of (original as { lookupTables: Array<{ name: string; data: unknown }> }).lookupTables) {
      await prisma.lookupTable.create({ data: { mappingId: copy.id, name: lt.name, data: lt.data as object } });
    }
    return this.mapToResponse(copy);
  }

  private mapToResponse(m: Record<string, unknown>): MappingResponseDto {
    const rules = Array.isArray(m['rules']) ? m['rules'] : [];
    return {
      id: m['id'] as string,
      name: m['name'] as string,
      description: m['description'] as string | undefined,
      sourceSchema: m['sourceSchema'] as Record<string, unknown>,
      destinationSchema: m['destinationSchema'] as Record<string, unknown>,
      rules,
      rulesCount: rules.length,
      writeMode: (m['writeMode'] as string | undefined) ?? 'CREATE',
      matchField: m['matchField'] as string | undefined,
      filterConfig: m['filterConfig'] as Record<string, unknown> | undefined,
      dryRunPassed: (m['dryRunPassed'] as boolean | undefined) ?? false,
      isProduction: (m['isProduction'] as boolean | undefined) ?? false,
      sourceConnectorId: m['sourceConnectorId'] as string | undefined,
      sourceOperationId: m['sourceOperationId'] as string | undefined,
      destinationConnectorId: m['destinationConnectorId'] as string | undefined,
      destinationOperationId: m['destinationOperationId'] as string | undefined,
      createdAt: m['createdAt'] as Date,
      updatedAt: m['updatedAt'] as Date,
    };
  }
}
