import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsOptional, ValidateNested, MinLength, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export type RuleType = 'from' | 'formula' | 'value' | 'lookup' | 'concatenate' | 'conditional';
export type WriteMode = 'CREATE' | 'UPDATE' | 'UPSERT' | 'SKIP';

export class MappingRuleDto {
  @ApiProperty({ description: 'Champ destination' })
  @IsString()
  destinationField!: string;

  @ApiProperty({ enum: ['from', 'formula', 'value', 'lookup', 'concatenate', 'conditional'], description: 'Type de transformation' })
  @IsIn(['from', 'formula', 'value', 'lookup', 'concatenate', 'conditional'])
  type!: RuleType;

  @ApiPropertyOptional({ description: 'Champ source (type: from)' })
  @IsOptional() @IsString() sourceField?: string;

  @ApiPropertyOptional({ description: 'Formule (type: formula). Ex: UPPER(source.name), CONCAT(source.first, " ", source.last), IF(source.active, "Oui", "Non")' })
  @IsOptional() @IsString() formula?: string;

  @ApiPropertyOptional({ description: 'Valeur fixe (type: value)' })
  @IsOptional() value?: unknown;

  @ApiPropertyOptional({ description: 'Nom de la lookup table (type: lookup)' })
  @IsOptional() @IsString() lookupTable?: string;

  @ApiPropertyOptional({ description: 'Clé de recherche dans la lookup table' })
  @IsOptional() @IsString() lookupKey?: string;

  @ApiPropertyOptional({ description: 'Champ valeur retourné par la lookup table' })
  @IsOptional() @IsString() lookupValue?: string;

  @ApiPropertyOptional({ description: 'Champs à concaténer (type: concatenate). Ex: ["source.first", " ", "source.last"]' })
  @IsOptional() @IsArray() parts?: (string | unknown)[];

  @ApiPropertyOptional({ description: 'Séparateur pour concatenate (défaut: "")' })
  @IsOptional() @IsString() separator?: string;

  @ApiPropertyOptional({ description: 'Condition (type: conditional). Ex: source.status === "active"' })
  @IsOptional() @IsString() condition?: string;

  @ApiPropertyOptional({ description: 'Valeur si condition vraie' })
  @IsOptional() valueIfTrue?: unknown;

  @ApiPropertyOptional({ description: 'Valeur si condition fausse' })
  @IsOptional() valueIfFalse?: unknown;

  @ApiPropertyOptional({ description: 'Valeur par défaut si résultat null/undefined' })
  @IsOptional() defaultValue?: unknown;

  @ApiPropertyOptional({ description: 'Format de date (type: formula avec DATE_FORMAT). Ex: DD/MM/YYYY' })
  @IsOptional() @IsString() dateFormat?: string;
}

export class CreateMappingDto {
  @ApiProperty({ description: 'Nom du mapping. Ex: Sellsy → EBP Clients' })
  @IsString() @MinLength(2) name!: string;

  @ApiPropertyOptional({ description: 'Description optionnelle' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ description: 'ID du connecteur source' })
  @IsOptional() @IsString() sourceConnectorId?: string;

  @ApiPropertyOptional({ description: 'ID de l opération source' })
  @IsOptional() @IsString() sourceOperationId?: string;

  @ApiPropertyOptional({ description: 'ID du connecteur destination' })
  @IsOptional() @IsString() destinationConnectorId?: string;

  @ApiPropertyOptional({ description: 'ID de l opération destination' })
  @IsOptional() @IsString() destinationOperationId?: string;

  @ApiProperty({ description: 'Schema JSON des champs source' })
  @IsObject() sourceSchema!: Record<string, unknown>;

  @ApiProperty({ description: 'Schema JSON des champs destination' })
  @IsObject() destinationSchema!: Record<string, unknown>;

  @ApiProperty({ type: [MappingRuleDto], description: 'Règles de transformation champ par champ' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingRuleDto)
  rules!: MappingRuleDto[];

  @ApiPropertyOptional({
    enum: ['CREATE', 'UPDATE', 'UPSERT', 'SKIP'],
    description: 'Mode d\'écriture : CREATE (toujours créer), UPDATE (mettre à jour si trouvé), UPSERT (créer ou mettre à jour), SKIP (ignorer si trouvé)',
  })
  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'UPSERT', 'SKIP'])
  writeMode?: WriteMode;

  @ApiPropertyOptional({ description: 'Champ utilisé pour identifier un doublon (obligatoire si writeMode != CREATE). Ex: email, externalId' })
  @IsOptional() @IsString() matchField?: string;

  @ApiPropertyOptional({ description: 'Configuration du filtre historique. Ex: { field: "createdAt", since: "2024-01-01" }' })
  @IsOptional() @IsObject() filterConfig?: Record<string, unknown>;
}

export class UpdateMappingDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() sourceSchema?: Record<string, unknown>;
  @IsOptional() @IsObject() destinationSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [MappingRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingRuleDto)
  rules?: MappingRuleDto[];

  @IsOptional() @IsString() sourceConnectorId?: string;
  @IsOptional() @IsString() sourceOperationId?: string;
  @IsOptional() @IsString() destinationConnectorId?: string;
  @IsOptional() @IsString() destinationOperationId?: string;

  @ApiPropertyOptional({ enum: ['CREATE', 'UPDATE', 'UPSERT', 'SKIP'] })
  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'UPSERT', 'SKIP'])
  writeMode?: WriteMode;

  @IsOptional() @IsString() matchField?: string;
  @IsOptional() @IsObject() filterConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Marquer comme validé en dry-run' })
  @IsOptional() @IsBoolean() dryRunPassed?: boolean;

  @ApiPropertyOptional({ description: 'Mise en production (nécessite dryRunPassed = true)' })
  @IsOptional() @IsBoolean() isProduction?: boolean;
}

export class PreviewMappingDto {
  @ApiProperty({ type: [MappingRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingRuleDto)
  rules!: MappingRuleDto[];

  @ApiProperty({ description: 'Données échantillon (max 20 lignes)' })
  @IsArray() sampleData!: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional() @IsArray()
  lookupTables?: Array<{ name: string; data: Record<string, Record<string, unknown>> }>;
}

export class AutoMapDto {
  @ApiProperty({ description: 'Schema JSON source' })
  @IsObject() sourceSchema!: Record<string, unknown>;

  @ApiProperty({ description: 'Schema JSON destination' })
  @IsObject() destinationSchema!: Record<string, unknown>;
}

export class LookupTableDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsObject() data!: Record<string, Record<string, unknown>>;
}

export class MappingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() sourceSchema!: Record<string, unknown>;
  @ApiProperty() destinationSchema!: Record<string, unknown>;
  @ApiProperty() rules!: unknown[];
  @ApiPropertyOptional() sourceConnectorId?: string;
  @ApiPropertyOptional() sourceOperationId?: string;
  @ApiPropertyOptional() destinationConnectorId?: string;
  @ApiPropertyOptional() destinationOperationId?: string;
  @ApiProperty() rulesCount!: number;
  @ApiPropertyOptional({ enum: ['CREATE', 'UPDATE', 'UPSERT', 'SKIP'] }) writeMode?: string;
  @ApiPropertyOptional() matchField?: string;
  @ApiPropertyOptional() filterConfig?: Record<string, unknown>;
  @ApiPropertyOptional() dryRunPassed?: boolean;
  @ApiPropertyOptional() isProduction?: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PreviewResultDto {
  @ApiProperty() success!: boolean;
  @ApiPropertyOptional() data?: Record<string, unknown>;
  @ApiPropertyOptional() error?: string;
  @ApiPropertyOptional() fieldErrors?: Record<string, string>;
  @ApiProperty() index!: number;
}
