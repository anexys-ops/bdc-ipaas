import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class TestConfigDto {
  @ApiProperty({
    description: 'Configuration à tester (URL, clé API, secret, etc.)',
    example: { base_url: 'https://api.example.com', api_key: 'xxx' },
  })
  @IsObject()
  config!: Record<string, unknown>;
}
