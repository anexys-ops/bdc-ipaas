import { ApiProperty } from '@nestjs/swagger';

export class TenantUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'] })
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false })
  lastLoginAt?: Date | null;
}
