import { ApiProperty } from '@nestjs/swagger';

export class ConnectorOperationDto {
  @ApiProperty({ description: 'ID de l\'opération' })
  id!: string;

  @ApiProperty({ description: 'Libellé de l\'opération' })
  label!: string;

  @ApiProperty({ description: 'Type: source, destination ou trigger' })
  type!: string;

  @ApiProperty({ description: 'Méthode HTTP ou type de fichier' })
  method!: string;

  @ApiProperty({ description: 'Description de l\'opération', required: false })
  description?: string;
}

export class MarketplaceConnectorDto {
  @ApiProperty({ description: 'ID unique du connecteur' })
  id!: string;

  @ApiProperty({ description: 'Nom du connecteur' })
  name!: string;

  @ApiProperty({ description: 'Version' })
  version!: string;

  @ApiProperty({ description: 'Icône' })
  icon!: string;

  @ApiProperty({ description: 'Catégorie' })
  category!: string;

  @ApiProperty({ description: 'Type d\'authentification' })
  authType!: string;

  @ApiProperty({ description: 'URL de documentation', required: false })
  docsUrl?: string | null;

  @ApiProperty({ description: 'Nombre d\'opérations source' })
  sourceOperationsCount!: number;

  @ApiProperty({ description: 'Nombre d\'opérations destination' })
  destinationOperationsCount!: number;
}

export class MarketplaceConnectorDetailDto extends MarketplaceConnectorDto {
  @ApiProperty({ description: 'Configuration d\'authentification requise' })
  authConfig!: Record<string, unknown>;

  @ApiProperty({ description: 'Opérations source disponibles', type: [ConnectorOperationDto] })
  sourceOperations!: ConnectorOperationDto[];

  @ApiProperty({ description: 'Opérations destination disponibles', type: [ConnectorOperationDto] })
  destinationOperations!: ConnectorOperationDto[];

  @ApiProperty({ description: 'Opérations trigger disponibles', type: [ConnectorOperationDto] })
  triggerOperations!: ConnectorOperationDto[];
}

export class MarketplaceCategoryDto {
  @ApiProperty({ description: 'Nom de la catégorie' })
  name!: string;

  @ApiProperty({ description: 'Nombre de connecteurs dans la catégorie' })
  count!: number;

  @ApiProperty({ description: 'Connecteurs de la catégorie', type: [MarketplaceConnectorDto] })
  connectors!: MarketplaceConnectorDto[];
}
