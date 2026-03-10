import { ApiProperty } from '@nestjs/swagger';

export class SourceOperationItemDto {
  @ApiProperty({ description: 'ID de l\'opération', example: 'list_thirdparties' })
  id!: string;

  @ApiProperty({ description: 'Libellé de l\'opération', example: 'Récupérer les tiers (clients/fournisseurs)' })
  label!: string;

  @ApiProperty({ description: 'Méthode HTTP', example: 'GET' })
  method!: string;

  @ApiProperty({ description: 'Chemin de l\'API', example: '/thirdparties' })
  path!: string;
}
