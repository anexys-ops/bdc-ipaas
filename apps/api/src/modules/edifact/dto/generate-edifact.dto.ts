import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export const EDIFACT_MESSAGE_TYPES = ['ORDERS', 'INVOIC', 'DESADV', 'PRICAT', 'RECADV'] as const;
export type EdifactMessageTypeDto = (typeof EDIFACT_MESSAGE_TYPES)[number];

export class GenerateEdifactDto {
  @ApiProperty({ enum: EDIFACT_MESSAGE_TYPES, description: 'Type de message EDIFACT' })
  @IsString()
  @IsNotEmpty()
  type!: EdifactMessageTypeDto;

  @ApiProperty({ description: 'Code expéditeur (ex: GLN)' })
  @IsString()
  @IsNotEmpty()
  sender!: string;

  @ApiProperty({ description: 'Code destinataire (ex: GLN)' })
  @IsString()
  @IsNotEmpty()
  receiver!: string;

  @ApiProperty({ description: 'Données structurées pour la génération (ordre, facture, desadv, etc.)' })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
