import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RunRetrievalTestDto {
  @ApiProperty({ description: 'Type de connecteur (ex: dolibarr, woocommerce)', example: 'dolibarr' })
  @IsString()
  connectorType!: string;

  @ApiProperty({ description: 'ID de l\'opération source (ex: list_thirdparties, list_customers)', example: 'list_thirdparties' })
  @IsString()
  operationId!: string;

  @ApiProperty({
    description: 'Configuration du connecteur (base_url, api_key, etc.)',
    example: { base_url: 'https://votre-dolibarr.fr/api/index.php', api_key: 'DOLAPIKEY_xxx' },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Nombre max d\'enregistrements à récupérer', default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
