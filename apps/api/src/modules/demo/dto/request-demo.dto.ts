import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RequestDemoDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: 'contact@exemple.fr' })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiPropertyOptional({ example: 'Ma Société SAS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ example: 'Nous souhaiterions une démo pour notre équipe technique.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
