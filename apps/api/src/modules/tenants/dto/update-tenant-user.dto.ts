import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { TenantUserRole } from './create-tenant-user.dto';

export class UpdateTenantUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiProperty({ enum: TenantUserRole, required: false })
  @IsOptional()
  @IsEnum(TenantUserRole)
  role?: TenantUserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
