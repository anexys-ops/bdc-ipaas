import { ApiProperty } from '@nestjs/swagger';
import { SourceOperationItemDto } from './source-operation-item.dto';

export class ConnectorSourceOperationsDto {
  @ApiProperty({ description: 'ID du connecteur', example: 'dolibarr' })
  connectorId!: string;

  @ApiProperty({ description: 'Nom du connecteur', example: 'Dolibarr' })
  connectorName!: string;

  @ApiProperty({ description: 'Opérations source (récupération)', type: [SourceOperationItemDto] })
  operations!: SourceOperationItemDto[];
}

export class RetrievalTestsListResponseDto {
  @ApiProperty({ description: 'Connecteurs avec leurs opérations source', type: [ConnectorSourceOperationsDto] })
  connectors!: ConnectorSourceOperationsDto[];
}
