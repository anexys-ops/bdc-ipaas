import { ApiProperty } from '@nestjs/swagger';

export class ConfigFieldDto {
  @ApiProperty({ description: 'Clé du champ (ex: base_url, api_key)' })
  key!: string;

  @ApiProperty({ description: 'Libellé affiché' })
  label!: string;

  @ApiProperty({ description: 'Type de champ: text ou password', enum: ['text', 'password'] })
  type!: 'text' | 'password';

  @ApiProperty({ description: 'Champ obligatoire' })
  required!: boolean;

  @ApiProperty({ description: 'Placeholder', required: false })
  placeholder?: string;

  @ApiProperty({ description: 'Description ou aide', required: false })
  description?: string;
}

export class ConnectorOperationDto {
  @ApiProperty({ description: 'ID de l\'opération' })
  id!: string;

  @ApiProperty({ description: 'Libellé de l\'opération' })
  label!: string;

  @ApiProperty({ description: 'Type: source, destination ou trigger' })
  type!: string;

  @ApiProperty({ description: 'Méthode HTTP ou type de fichier' })
  method!: string;

  @ApiProperty({ description: 'Endpoint (chemin API), ex: /thirdparties, /wp-json/wc/v3/customers', required: false })
  path?: string;

  @ApiProperty({ description: 'Description de l\'opération', required: false })
  description?: string;

  @ApiProperty({
    description: 'Schéma de sortie (source) : champs retournés par l\'API. properties + required',
    required: false,
  })
  outputSchema?: Record<string, unknown>;

  @ApiProperty({
    description: 'Schéma d\'entrée (destination) : champs à remplir pour l\'appel. properties + required',
    required: false,
  })
  inputSchema?: Record<string, unknown>;

  @ApiProperty({ description: 'Schéma de config spécifique à l\'opération', required: false })
  configSchema?: Record<string, unknown>;

  @ApiProperty({ description: 'Format fichier (FILE)', required: false })
  fileFormat?: string;
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

  @ApiProperty({ description: 'Note en étoiles (1-5), gérée en admin', required: false })
  stars?: number;

  @ApiProperty({ description: 'Tarif affiché (ex: 99€ HT), géré en admin', required: false })
  priceLabel?: string;

  @ApiProperty({ description: 'Texte/description complémentaire, géré en admin', required: false })
  description?: string | null;

  @ApiProperty({ description: 'Chemin du fichier API JSON (ex: connectors/dolibarr/openapi.json)', required: false })
  apiJsonPath?: string | null;

  @ApiProperty({ description: 'Connecteur visible dans la marketplace (admin uniquement)', required: false })
  enabled?: boolean;
}

export class AgentDownloadsDto {
  @ApiProperty({ description: 'Package ou URL Windows (agent)', required: false })
  windows?: string;

  @ApiProperty({ description: 'Package ou URL macOS (agent)', required: false })
  mac?: string;
}

export class MarketplaceConnectorDetailDto extends MarketplaceConnectorDto {
  @ApiProperty({ description: 'Configuration d\'authentification requise' })
  authConfig!: Record<string, unknown>;

  @ApiProperty({
    description: 'Champs du formulaire de configuration (URL, clé API, secret, etc.)',
    type: [ConfigFieldDto],
  })
  configFields!: ConfigFieldDto[];

  @ApiProperty({
    description: 'Pour connecteur agent : liens de téléchargement Windows / Mac',
    type: AgentDownloadsDto,
    required: false,
  })
  agentDownloads?: AgentDownloadsDto;

  @ApiProperty({
    description: 'Instructions pour configurer ce connecteur (par module/logiciel)',
    required: false,
  })
  configInstructions?: string;

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
