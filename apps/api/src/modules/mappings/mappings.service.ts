import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '../../generated/tenant';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateMappingDto, UpdateMappingDto, PreviewMappingDto, LookupTableDto, MappingResponseDto } from './dto/mapping.dto';

interface MappingConfig {
  rules: Array<{ destinationField: string; type: 'from' | 'formula' | 'value' | 'lookup'; sourceField?: string; formula?: string; value?: unknown; lookupTable?: string; lookupKey?: string; lookupValue?: string; defaultValue?: unknown }>;
  lookupTables?: Array<{ name: string; data: Record<string, Record<string, unknown>> }>;
}

interface TransformResult {
  success: boolean;
  data?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

function createMappingEngine(config: MappingConfig) {
  return {
    transformBatch: (records: Record<string, unknown>[]): TransformResult[] => {
      return records.map(record => {
        try {
          const result: Record<string, unknown> = {};
          for (const rule of config.rules) {
            if (rule.type === 'from' && rule.sourceField) {
              result[rule.destinationField] = record[rule.sourceField];
            } else if (rule.type === 'value') {
              result[rule.destinationField] = rule.value;
            } else if (rule.type === 'formula' && rule.formula) {
              const match = rule.formula.match(/UPPER\(source\.(\w+)\)/);
              if (match) result[rule.destinationField] = String(record[match[1]] || '').toUpperCase();
              else result[rule.destinationField] = rule.formula;
            }
          }
          return { success: true, data: result };
        } catch {
          return { success: false, fieldErrors: { general: 'Transform error' } };
        }
      });
    },
  };
}

@Injectable()
export class MappingsService {

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
        sourceSchema: dto.sourceSchema as object,
        destinationSchema: dto.destinationSchema as object,
        rules: dto.rules as object,
      },
    });
    return this.mapToResponse(mapping);
  }

  async findAll(tenantId: string): Promise<MappingResponseDto[]> {
    const prisma = await this.getTenantClient(tenantId);
    const mappings = await prisma.mapping.findMany({ orderBy: { createdAt: 'desc' } });
    return mappings.map(m => this.mapToResponse(m));
  }

  async findOne(tenantId: string, id: string): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const mapping = await prisma.mapping.findUnique({ where: { id } });
    if (!mapping) throw new NotFoundException(`Mapping non trouvé: ${id}`);
    return this.mapToResponse(mapping);
  }

  async update(tenantId: string, id: string, dto: UpdateMappingDto): Promise<MappingResponseDto> {
    const prisma = await this.getTenantClient(tenantId);
    const mapping = await prisma.mapping.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.sourceSchema && { sourceSchema: dto.sourceSchema as object }),
        ...(dto.destinationSchema && { destinationSchema: dto.destinationSchema as object }),
        ...(dto.rules && { rules: dto.rules as object }),
      },
    });
    return this.mapToResponse(mapping);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.mapping.delete({ where: { id } });
  }

  /**
   * Prévisualisation du mapping sur des données échantillon.
   */
  async preview(dto: PreviewMappingDto): Promise<{ results: Array<{ success: boolean; data?: Record<string, unknown>; error?: string }> }> {
    const config: MappingConfig = {
      rules: dto.rules.map(r => ({
        destinationField: r.destinationField,
        type: r.type as 'from' | 'formula' | 'value' | 'lookup',
        sourceField: r.sourceField,
        formula: r.formula,
        value: r.value,
        lookupTable: r.lookupTable,
        lookupKey: r.lookupKey,
        lookupValue: r.lookupValue,
        defaultValue: r.defaultValue,
      })),
      lookupTables: dto.lookupTables?.map(lt => ({ name: lt.name, data: lt.data })),
    };

    const engine = createMappingEngine(config);
    const results = engine.transformBatch(dto.sampleData.slice(0, 10));

    return {
      results: results.map((r: TransformResult) => ({
        success: r.success,
        data: r.data,
        error: r.fieldErrors ? Object.values(r.fieldErrors).join(', ') : undefined,
      })),
    };
  }

  async addLookupTable(tenantId: string, mappingId: string, dto: LookupTableDto): Promise<void> {
    const prisma = await this.getTenantClient(tenantId);
    await prisma.lookupTable.create({
      data: { mappingId, name: dto.name, data: dto.data as object },
    });
  }

  async getLookupTables(tenantId: string, mappingId: string): Promise<Array<{ id: string; name: string; data: Record<string, unknown> }>> {
    const prisma = await this.getTenantClient(tenantId);
    const tables = await prisma.lookupTable.findMany({ where: { mappingId } });
    return tables.map(t => ({ id: t.id, name: t.name, data: t.data as Record<string, unknown> }));
  }

  private mapToResponse(m: { id: string; name: string; sourceSchema: unknown; destinationSchema: unknown; rules: unknown; createdAt: Date; updatedAt: Date }): MappingResponseDto {
    return {
      id: m.id,
      name: m.name,
      sourceSchema: m.sourceSchema as Record<string, unknown>,
      destinationSchema: m.destinationSchema as Record<string, unknown>,
      rules: m.rules as unknown[],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
