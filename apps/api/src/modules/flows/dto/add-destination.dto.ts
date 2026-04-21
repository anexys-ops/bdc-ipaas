import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsNumber, IsObject, IsArray, ValidateNested, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export type DestinationWriteMode = 'CREATE' | 'UPDATE';

export class MappingRuleDto {
  @ApiProperty({ description: 'Champ destination' })
  destinationField!: string;

  @ApiProperty({ description: 'Type de règle: from, formula, value, lookup' })
  type!: string;

  @ApiProperty({ description: 'Champ source (pour type from)', required: false })
  @IsOptional()
  sourceField?: string;

  @ApiProperty({ description: 'Formule (pour type formula)', required: false })
  @IsOptional()
  formula?: string;

  @ApiProperty({ description: 'Valeur constante (pour type value)', required: false })
  @IsOptional()
  value?: unknown;

  @ApiProperty({ description: 'Table de lookup (pour type lookup)', required: false })
  @IsOptional()
  lookupTable?: string;

  @ApiProperty({ description: 'Valeur par défaut', required: false })
  @IsOptional()
  defaultValue?: unknown;
}

export class AddDestinationDto {
  @ApiProperty({ description: 'ID du connecteur destination' })
  @IsUUID()
  connectorId!: string;

  @ApiPropertyOptional({ description: 'ID du mapping existant à utiliser (ex. pour une planification)' })
  @IsOptional()
  @IsUUID()
  mappingId?: string;

  @ApiProperty({ description: 'Ordre dans le flux (0 = premier)', required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @ApiProperty({ description: 'Règles de mapping', type: [MappingRuleDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingRuleDto)
  mappingRules?: MappingRuleDto[];

  @ApiProperty({ description: 'Configuration du mapping complet', required: false })
  @IsOptional()
  @IsObject()
  mappingConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['CREATE', 'UPDATE'], description: 'CREATE = toujours créer ; UPDATE = chercher par searchFields puis PATCH si trouvé' })
  @IsOptional()
  @IsEnum(['CREATE', 'UPDATE'])
  writeMode?: DestinationWriteMode;

  @ApiPropertyOptional({ description: 'Champs pour rechercher un enregistrement existant (mode UPDATE). Ex: ["email", "externalId"]', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchFields?: string[];
}
