import { ApiProperty } from '@nestjs/swagger';

export class OperationPreviewResponseDto {
  @ApiProperty({ description: 'Nombre d\'enregistrements retournés' })
  count!: number;

  @ApiProperty({ description: 'Échantillon des enregistrements (clients, etc.)', type: 'array', items: {} })
  items!: Record<string, unknown>[];
}
