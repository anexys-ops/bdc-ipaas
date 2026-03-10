import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Équipe support' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ required: false, example: 'Groupe pour les agents support' })
  @IsOptional()
  @IsString()
  description?: string;
}
