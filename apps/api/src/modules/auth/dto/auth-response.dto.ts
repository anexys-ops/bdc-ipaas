import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID unique de l\'utilisateur' })
  id!: string;

  @ApiProperty({ description: 'Email de l\'utilisateur' })
  email!: string;

  @ApiProperty({ description: 'Prénom' })
  firstName!: string;

  @ApiProperty({ description: 'Nom' })
  lastName!: string;

  @ApiProperty({ description: 'Rôle de l\'utilisateur', enum: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'] })
  role!: string;

  @ApiProperty({ description: 'ID du tenant' })
  tenantId!: string;

  @ApiProperty({ description: 'Slug du tenant' })
  tenantSlug!: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Token d\'accès JWT (15 minutes)' })
  accessToken!: string;

  @ApiProperty({ description: 'Informations utilisateur' })
  user!: UserResponseDto;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'Nouveau token d\'accès JWT' })
  accessToken!: string;
}
