import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KeycloakLoginDto {
  @ApiProperty({ description: 'Access token Keycloak (Bearer côté IdP)' })
  @IsString()
  @IsNotEmpty()
  keycloakAccessToken!: string;
}
