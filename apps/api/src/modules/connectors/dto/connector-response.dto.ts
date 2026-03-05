import { ApiProperty } from '@nestjs/swagger';

export class ConnectorResponseDto {
  @ApiProperty({ description: 'ID unique du connecteur configuré' })
  id!: string;

  @ApiProperty({ description: 'Type de connecteur (ID du registre)' })
  type!: string;

  @ApiProperty({ description: 'Nom personnalisé' })
  name!: string;

  @ApiProperty({ description: 'Connecteur actif' })
  isActive!: boolean;

  @ApiProperty({ description: 'Date du dernier test', required: false })
  lastTestedAt?: Date | null;

  @ApiProperty({ description: 'Résultat du dernier test', required: false })
  lastTestOk?: boolean | null;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Informations du type de connecteur' })
  connectorInfo!: {
    name: string;
    icon: string;
    category: string;
    auth_type: string;
  };
}

export class TestConnectorResponseDto {
  @ApiProperty({ description: 'Test réussi ou non' })
  success!: boolean;

  @ApiProperty({ description: 'Message de résultat' })
  message!: string;

  @ApiProperty({ description: 'Durée du test en ms' })
  durationMs!: number;

  @ApiProperty({ description: 'Détails supplémentaires', required: false })
  details?: Record<string, unknown>;
}
