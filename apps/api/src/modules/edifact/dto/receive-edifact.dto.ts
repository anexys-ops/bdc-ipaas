import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO pour la réception d'un message EDIFACT brut.
 * En JSON : { "content": "UNB+..." }.
 * Le body peut aussi être envoyé en text/plain (contenu brut) si le client envoie le raw body.
 */
export class ReceiveEdifactDto {
  @ApiProperty({ description: 'Contenu brut du message EDIFACT' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
