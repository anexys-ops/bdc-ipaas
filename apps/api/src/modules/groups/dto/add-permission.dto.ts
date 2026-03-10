import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class AddPermissionDto {
  @ApiProperty({ example: 'flow' })
  @IsString()
  @MinLength(1)
  resourceType!: string;

  @ApiProperty({ required: false, example: 'flow-id-123' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ example: 'read' })
  @IsString()
  @MinLength(1)
  action!: string;
}
