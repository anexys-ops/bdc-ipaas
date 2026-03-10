import { ApiProperty } from '@nestjs/swagger';

export class TenantConnectorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false })
  lastTestedAt?: Date | null;

  @ApiProperty({ required: false })
  lastTestOk?: boolean | null;

  @ApiProperty()
  createdAt!: Date;
}
