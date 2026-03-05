import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { Plan } from './create-tenant.dto';

export class UpdateTenantDto {
  @ApiProperty({
    description: 'Nom affiché du tenant',
    example: 'Ma Nouvelle Société SAS',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({
    description: 'Plan de facturation',
    enum: Plan,
    required: false,
  })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiProperty({
    description: 'Tenant actif ou désactivé',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
