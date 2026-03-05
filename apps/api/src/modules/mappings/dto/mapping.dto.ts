import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsOptional, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class MappingRuleDto {
  @ApiProperty() destinationField!: string;
  @ApiProperty() type!: string;
  @IsOptional() sourceField?: string;
  @IsOptional() formula?: string;
  @IsOptional() value?: unknown;
  @IsOptional() lookupTable?: string;
  @IsOptional() lookupKey?: string;
  @IsOptional() lookupValue?: string;
  @IsOptional() defaultValue?: unknown;
}

export class CreateMappingDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty() @IsObject() sourceSchema!: Record<string, unknown>;
  @ApiProperty() @IsObject() destinationSchema!: Record<string, unknown>;
  @ApiProperty({ type: [MappingRuleDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => MappingRuleDto) rules!: MappingRuleDto[];
}

export class UpdateMappingDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() sourceSchema?: Record<string, unknown>;
  @IsOptional() @IsObject() destinationSchema?: Record<string, unknown>;
  @IsOptional() @IsArray() rules?: MappingRuleDto[];
}

export class PreviewMappingDto {
  @ApiProperty({ type: [MappingRuleDto] }) @IsArray() rules!: MappingRuleDto[];
  @ApiProperty() @IsArray() sampleData!: Record<string, unknown>[];
  @IsOptional() @IsArray() lookupTables?: Array<{ name: string; data: Record<string, Record<string, unknown>> }>;
}

export class LookupTableDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsObject() data!: Record<string, Record<string, unknown>>;
}

export class MappingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sourceSchema!: Record<string, unknown>;
  @ApiProperty() destinationSchema!: Record<string, unknown>;
  @ApiProperty() rules!: unknown[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
