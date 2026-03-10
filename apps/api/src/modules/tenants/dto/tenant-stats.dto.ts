import { ApiProperty } from '@nestjs/swagger';

export class TenantStatsDto {
  @ApiProperty({ description: 'Nombre d\'utilisateurs du tenant' })
  usersCount!: number;

  @ApiProperty({ description: 'Nombre de connecteurs configurés' })
  connectorsCount!: number;

  @ApiProperty({ description: 'Nombre de flux' })
  flowsCount!: number;

  @ApiProperty({ description: 'Nombre total d\'exécutions de flux' })
  executionsCount!: number;

  @ApiProperty({ description: 'Dernière connexion (max des utilisateurs)', required: false })
  lastLoginAt?: Date | null;
}
