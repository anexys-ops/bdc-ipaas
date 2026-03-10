import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReceiveSftpEdifactDto {
  @ApiProperty({ description: 'Chemin du fichier reçu sur le serveur SFTP' })
  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @ApiProperty({ description: 'Code expéditeur (pour identification)' })
  @IsString()
  @IsNotEmpty()
  senderCode!: string;
}
