import { ApiProperty } from '@nestjs/swagger';

export class EdifactMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Type de message (ORDERS, INVOIC, DESADV, etc.)' })
  type!: string;

  @ApiProperty({ description: 'INBOUND ou OUTBOUND' })
  direction!: string;

  @ApiProperty()
  sender!: string;

  @ApiProperty()
  receiver!: string;

  @ApiProperty({ description: 'Contenu brut du message' })
  rawContent!: string;

  @ApiProperty({ description: 'Données parsées (JSON)', required: false })
  parsedData?: unknown;

  @ApiProperty({ required: false })
  reference?: string | null;

  @ApiProperty()
  receivedAt!: Date;

  @ApiProperty({ required: false })
  processedAt?: Date | null;

  @ApiProperty({ description: 'RECEIVED, PROCESSED, ERROR' })
  status!: string;

  @ApiProperty({ required: false })
  errorMessage?: string | null;
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

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
