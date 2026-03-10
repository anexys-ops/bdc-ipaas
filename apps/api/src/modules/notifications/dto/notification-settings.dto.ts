import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUrl, IsArray, IsEmail, ValidateIf } from 'class-validator';

export class NotificationSettingsResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() emailEnabled!: boolean;
  @ApiProperty({ type: [String] }) emailRecipients!: string[];
  @ApiProperty() webhookEnabled!: boolean;
  @ApiPropertyOptional() webhookUrl?: string | null;
  @ApiProperty() alertOnFailure!: boolean;
  @ApiProperty() alertOnQuota80!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Liste d\'emails destinataires' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailRecipients?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUrl()
  webhookUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertOnFailure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertOnQuota80?: boolean;
}
