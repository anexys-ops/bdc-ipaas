import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddUserToGroupDto {
  @ApiProperty({ description: 'ID de l\'utilisateur à ajouter au groupe' })
  @IsUUID()
  userId!: string;
}
