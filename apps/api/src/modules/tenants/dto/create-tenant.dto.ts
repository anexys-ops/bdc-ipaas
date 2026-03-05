import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength, Matches } from 'class-validator';

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateTenantDto {
  @ApiProperty({
    description: 'Slug unique du tenant (utilisé dans les URLs)',
    example: 'ma-societe',
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets',
  })
  slug!: string;

  @ApiProperty({
    description: 'Nom affiché du tenant',
    example: 'Ma Société SAS',
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Plan de facturation',
    enum: Plan,
    default: Plan.FREE,
  })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
