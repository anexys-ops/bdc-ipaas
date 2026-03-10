import { ApiProperty } from '@nestjs/swagger';

export class FlowDestinationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  connectorId!: string;

  @ApiProperty()
  connectorName!: string;

  @ApiProperty()
  connectorType!: string;

  @ApiProperty({ required: false })
  mappingId?: string | null;

  @ApiProperty()
  orderIndex!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: ['CREATE', 'UPDATE'], description: 'Mode d\'écriture : CREATE ou UPDATE (recherche par searchFields)' })
  writeMode!: string;

  @ApiProperty({ required: false, type: [String], description: 'Champs de recherche pour mode UPDATE' })
  searchFields?: string[] | null;
}

export class FlowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty()
  sourceConnectorId!: string;

  @ApiProperty()
  sourceConnectorName!: string;

  @ApiProperty()
  sourceConnectorType!: string;

  @ApiProperty()
  triggerType!: string;

  @ApiProperty()
  triggerConfig!: Record<string, unknown>;

  @ApiProperty()
  environment!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [FlowDestinationResponseDto] })
  destinations!: FlowDestinationResponseDto[];
}

export class FlowVersionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  flowId!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  snapshot!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
}
