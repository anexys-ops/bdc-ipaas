import { ApiProperty } from '@nestjs/swagger';

export class GroupPermissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  resourceType!: string;

  @ApiProperty({ required: false })
  resourceId?: string | null;

  @ApiProperty()
  action!: string;
}
