import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, MinLength } from 'class-validator';

export class CreateConnectorDto {
  @ApiProperty({
    description: 'Type de connecteur (ID du connecteur dans le registre)',
    example: 'sellsy',
  })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({
    description: 'Nom personnalisé pour cette instance de connecteur',
    example: 'Sellsy Production',
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Configuration du connecteur (credentials, URL, etc.)',
    example: { api_key: 'xxx', base_url: 'https://api.example.com' },
  })
  @IsObject()
  config!: Record<string, unknown>;
}
