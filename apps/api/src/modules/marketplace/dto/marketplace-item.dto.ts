import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateMarketplaceItemDto {
  @ApiProperty({ description: 'ID du connecteur (ex: dolibarr, taskit, isales)' })
  @IsString()
  connectorId!: string;

  @ApiProperty({ description: 'Note en étoiles (1-5)', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @ApiProperty({ description: 'Tarif affiché (ex: 99€ HT)', default: '99€ HT' })
  @IsOptional()
  @IsString()
  priceLabel?: string;

  @ApiProperty({ description: 'Texte/description complémentaire', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Chemin du fichier API JSON (ex: connectors/dolibarr/openapi.json)',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiJsonPath?: string;

  @ApiProperty({ description: 'Connecteur visible dans la marketplace publique', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateMarketplaceItemDto {
  @ApiProperty({ description: 'Note en étoiles (1-5)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @ApiProperty({ description: 'Tarif affiché (ex: 99€ HT)', required: false })
  @IsOptional()
  @IsString()
  priceLabel?: string;

  @ApiProperty({ description: 'Texte/description complémentaire', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Chemin du fichier API JSON (ex: connectors/dolibarr/openapi.json)',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiJsonPath?: string;

  @ApiProperty({ description: 'Connecteur visible dans la marketplace publique', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MarketplaceItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  connectorId!: string;

  @ApiProperty()
  stars!: number;

  @ApiProperty()
  priceLabel!: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ required: false })
  apiJsonPath?: string | null;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
