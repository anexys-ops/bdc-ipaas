import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsUUID, MinLength } from 'class-validator';

export enum TriggerType {
  CRON = 'CRON',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
  FILE_WATCH = 'FILE_WATCH',
  AGENT_WATCH = 'AGENT_WATCH',
}

export class CreateFlowDto {
  @ApiProperty({ description: 'Nom du flux', example: 'Sync clients Sellsy → EBP' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ description: 'Description du flux', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID du connecteur source' })
  @IsUUID()
  sourceConnectorId!: string;

  @ApiProperty({ description: 'Type de déclencheur', enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @ApiProperty({
    description: 'Configuration du déclencheur (cron expression, webhook config, etc.)',
    example: { cron: '0 */6 * * *' },
  })
  @IsObject()
  triggerConfig!: Record<string, unknown>;
}
