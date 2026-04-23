import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PatchEdifactBillingDto {
  @ApiProperty({ description: 'Marque le message comme facturé (périmètre support / facturation iPaaS)' })
  @IsBoolean()
  billed!: boolean;
}
