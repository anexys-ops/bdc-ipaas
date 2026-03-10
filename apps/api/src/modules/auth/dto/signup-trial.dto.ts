import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength } from 'class-validator';

export class SignupTrialDto {
  @ApiProperty({ example: 'Ma Société', description: 'Nom de l\'entreprise ou du projet' })
  @IsString()
  @MinLength(2, { message: 'Le nom de l\'entreprise doit contenir au moins 2 caractères' })
  companyName!: string;

  @ApiProperty({ example: 'admin@masociete.fr' })
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
}
