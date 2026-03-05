import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsBoolean, MinLength } from 'class-validator';
import { TriggerType } from './create-flow.dto';

export enum Environment {
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

export class UpdateFlowDto {
  @ApiProperty({ description: 'Nom du flux', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({ description: 'Description du flux', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Type de déclencheur', enum: TriggerType, required: false })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiProperty({ description: 'Configuration du déclencheur', required: false })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @ApiProperty({ description: 'Environnement', enum: Environment, required: false })
  @IsOptional()
  @IsEnum(Environment)
  environment?: Environment;

  @ApiProperty({ description: 'Flux actif', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
