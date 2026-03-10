import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsEnum } from 'class-validator';

export enum TenantUserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export class CreateTenantUserDto {
  @ApiProperty({ example: 'jean.dupont@client.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password!: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ enum: TenantUserRole, default: TenantUserRole.VIEWER })
  @IsEnum(TenantUserRole)
  role!: TenantUserRole;
}
