import { ApiProperty } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty({ description: 'ID unique du tenant' })
  id!: string;

  @ApiProperty({ description: 'Slug unique' })
  slug!: string;

  @ApiProperty({ description: 'Nom affiché' })
  name!: string;

  @ApiProperty({ description: 'Plan de facturation', enum: ['FREE', 'PRO', 'ENTERPRISE'] })
  plan!: string;

  @ApiProperty({ description: 'Tenant actif' })
  isActive!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Dernière mise à jour' })
  updatedAt!: Date;

  @ApiProperty({ description: 'ID Stripe Customer', required: false })
  stripeCustomerId?: string | null;
}
