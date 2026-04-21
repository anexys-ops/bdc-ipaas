import { ApiProperty } from '@nestjs/swagger';

/** Réponse `GET /tenants/me` — porte d'entrée gateway + identité tenant. */
export class TenantMeGatewayDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  plan!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ description: 'Jeton X-Gate-Token (ne pas journaliser en clair).' })
  gateToken!: string;

  @ApiProperty({ description: 'URL publique du webhook Benthos' })
  webhookUrl!: string;

  @ApiProperty({ description: 'URL d’ingestion Nest exposée au worker gate (ipaas_url Redis)' })
  ingestPublicUrl!: string;
}
