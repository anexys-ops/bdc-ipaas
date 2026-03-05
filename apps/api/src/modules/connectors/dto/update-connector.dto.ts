import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, MinLength } from 'class-validator';

export class UpdateConnectorDto {
  @ApiProperty({
    description: 'Nom personnalisé pour cette instance de connecteur',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({
    description: 'Configuration du connecteur (credentials, URL, etc.)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiProperty({
    description: 'Connecteur actif ou non',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
