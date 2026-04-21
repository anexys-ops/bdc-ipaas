import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RequestQuoteDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(1, { message: 'Prénom requis' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'contact@exemple.fr' })
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiPropertyOptional({ example: 'Ma Société SAS' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: '+33 6 12 34 56 78' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiProperty({ description: 'Nombre de connecteurs / connexions configurées', minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  connectors!: number;

  @ApiProperty({ description: 'Volume mensuel (exécutions / messages traités)', minimum: 1000, maximum: 10_000_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(10_000_000)
  executionsPerMonth!: number;

  @ApiProperty({ description: 'Nombre de mappings', minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  mappings!: number;

  @ApiProperty({
    description: 'Estimation affichée côté client (contrôlée et recalculée côté serveur)',
    example: 450,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  clientEstimatedMonthlyHt!: number;
}
