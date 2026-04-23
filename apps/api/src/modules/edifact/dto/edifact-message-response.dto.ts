import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EdifactEnrichmentViewDto {
  @ApiProperty()
  unhType!: string;

  @ApiProperty()
  bgm!: { documentNameCode: string; documentNameLabel: string; messageNumber: string };

  @ApiProperty()
  interchange!: { sender: string; receiver: string; unbReference: string };

  @ApiProperty({ type: [Object] })
  dtm!: Array<{ qualifier: string; value: string; format?: string; dateIso: string }>;

  @ApiPropertyOptional()
  documentDate?: string | null;

  @ApiProperty({ type: [Object] })
  nads!: Array<{ role: string; roleLabel: string; partyId: string; name?: string }>;

  @ApiProperty({ type: [Object] })
  rff!: Array<{ qualifier: string; reference: string }>;

  @ApiProperty({ type: [Object] })
  moa!: Array<{ qualifier: string; amount: number; currency?: string }>;

  @ApiPropertyOptional()
  totalAmount?: number | null;

  @ApiPropertyOptional()
  currency?: string | null;

  @ApiProperty({ type: [Object] })
  segmentLines!: Array<{ position: number; tag: string; line: string }>;
}

export class EdifactMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Type de message UNH (ORDERS, INVOIC, DESADV, HANMOV, etc.)' })
  type!: string;

  @ApiProperty({ description: 'INBOUND ou OUTBOUND' })
  direction!: string;

  @ApiProperty()
  sender!: string;

  @ApiProperty()
  receiver!: string;

  @ApiProperty({ description: 'Contenu brut (omis en liste si includeRaw=false)', required: false })
  rawContent?: string;

  @ApiProperty({ description: 'Métadonnées JSON (enregistrement réception)', required: false })
  parsedData?: unknown;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional({ description: 'Code BGM 1001 (ex. 220, 380)' })
  bgmCode?: string | null;

  @ApiPropertyOptional()
  documentDate?: string | null;

  @ApiPropertyOptional()
  totalAmount?: number | null;

  @ApiPropertyOptional()
  currency?: string | null;

  @ApiProperty()
  billed!: boolean;

  @ApiPropertyOptional()
  billedAt?: string | null;

  @ApiProperty()
  receivedAt!: Date;

  @ApiPropertyOptional()
  processedAt?: Date | null;

  @ApiProperty({ description: 'RECEIVED, PROCESSED, ERROR' })
  status!: string;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiPropertyOptional({ description: 'Aperçu structuré (NAD, BGM, segments) — surtout sur le détail' })
  enrichment?: EdifactEnrichmentViewDto;

  @ApiPropertyOptional()
  enrichError?: string;
}

export class EdifactReceiveResultDto {
  @ApiProperty({ description: 'Message enregistré' })
  message!: EdifactMessageResponseDto;

  @ApiProperty({ description: 'Données parsées (interchange + premier message)' })
  parsed!: {
    sender: string;
    receiver: string;
    type: string;
    reference: string;
    data?: unknown;
  };
}

export class EdifactValidateResultDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty({ type: [Object], description: 'Erreurs de validation' })
  errors!: Array<{ segment: string; position: number; message: string; severity: string }>;

  @ApiProperty({ type: [Object], description: 'Avertissements' })
  warnings!: Array<{ segment: string; position: number; message: string; severity: string }>;
}

export class EdifactMessagesListDto {
  @ApiProperty({ type: [EdifactMessageResponseDto] })
  items!: EdifactMessageResponseDto[];

  @ApiProperty({ description: 'Alias pour intégrations front (même contenu que items)' })
  messages?: EdifactMessageResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
