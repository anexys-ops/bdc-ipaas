import { ApiProperty } from '@nestjs/swagger';

export class NotificationLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ enum: ['EMAIL', 'WEBHOOK'] }) type!: string;
  @ApiProperty() subject!: string;
  @ApiProperty({ enum: ['SENT', 'FAILED'] }) status!: string;
  @ApiProperty() sentAt!: Date;
}
