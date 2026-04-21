import { ApiProperty } from '@nestjs/swagger';

export class PlatformHealthProbeDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ required: false })
  latencyMs?: number;

  @ApiProperty({ required: false })
  error?: string;
}

export class PlatformHealthWorkerQueueDto {
  @ApiProperty({ description: 'Accès Redis/BullMQ depuis l’API (ne garantit pas le processus worker Docker)' })
  ok!: boolean;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  counts?: { active: number; waiting: number; failed: number; completed: number };
}

export class PlatformHealthResponseDto {
  @ApiProperty({ description: 'Horodatage ISO de la sonde' })
  checkedAt!: string;

  @ApiProperty()
  api!: { ok: true };

  @ApiProperty({ type: PlatformHealthProbeDto })
  database!: PlatformHealthProbeDto;

  @ApiProperty()
  redis!: { ok: boolean; latencyMs?: number; error?: string };

  @ApiProperty()
  benthos!: { ok: boolean; error?: string };

  @ApiProperty()
  benthosHeartbeat!: { listLength: number | null; error?: string };

  @ApiProperty({ type: PlatformHealthWorkerQueueDto })
  workerQueue!: PlatformHealthWorkerQueueDto;
}
