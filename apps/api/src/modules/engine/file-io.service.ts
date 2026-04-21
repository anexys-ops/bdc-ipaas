import { Injectable, BadRequestException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

@Injectable()
export class FileIoService {
  async readRecordsFromPath(filePath: string): Promise<Array<Record<string, unknown>>> {
    const raw = await readFile(filePath, 'utf-8');
    const extension = this.getExtension(filePath);

    if (extension === 'json') {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as Array<Record<string, unknown>>;
      }
      if (parsed && typeof parsed === 'object') {
        return [parsed as Record<string, unknown>];
      }
      throw new BadRequestException('Le fichier JSON doit contenir un objet ou un tableau d’objets');
    }

    if (extension === 'txt') {
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({ line, index }));
    }

    throw new BadRequestException(`Format fichier non supporté: .${extension || 'unknown'}`);
  }

  async writeRecordsToPath(
    filePath: string,
    records: Array<Record<string, unknown>>,
    format?: string,
  ): Promise<void> {
    const normalizedFormat = (format ?? this.getExtension(filePath) ?? 'json').toLowerCase();
    const targetDir = dirname(filePath);
    await mkdir(targetDir, { recursive: true });

    if (normalizedFormat === 'json') {
      await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
      return;
    }

    if (normalizedFormat === 'txt') {
      const lines = records.map((record) => JSON.stringify(record));
      await writeFile(filePath, `${lines.join('\n')}\n`, 'utf-8');
      return;
    }

    if (normalizedFormat === 'csv') {
      const headers = this.collectHeaders(records);
      const csvRows = [
        headers.join(','),
        ...records.map((record) =>
          headers
            .map((header) => this.escapeCsv(String(record[header] ?? '')))
            .join(','),
        ),
      ];
      await writeFile(filePath, `${csvRows.join('\n')}\n`, 'utf-8');
      return;
    }

    throw new BadRequestException(`Format de sortie non supporté: ${normalizedFormat}`);
  }

  /**
   * Sérialise des enregistrements (ex. pour upload FTP) sans écrire sur disque.
   */
  serializeRecords(records: Array<Record<string, unknown>>, format: string): string {
    const normalizedFormat = format.toLowerCase();
    if (normalizedFormat === 'json') {
      return `${JSON.stringify(records, null, 2)}\n`;
    }
    if (normalizedFormat === 'txt') {
      const lines = records.map((record) => JSON.stringify(record));
      return `${lines.join('\n')}\n`;
    }
    if (normalizedFormat === 'csv') {
      const headers = this.collectHeaders(records);
      const csvRows = [
        headers.join(','),
        ...records.map((record) =>
          headers
            .map((header) => this.escapeCsv(String(record[header] ?? '')))
            .join(','),
        ),
      ];
      return `${csvRows.join('\n')}\n`;
    }
    throw new BadRequestException(`Format de sérialisation non supporté: ${normalizedFormat}`);
  }

  private getExtension(path: string): string {
    const parts = path.toLowerCase().split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1] ?? '';
  }

  private collectHeaders(records: Array<Record<string, unknown>>): string[] {
    const headerSet = new Set<string>();
    records.forEach((record) => {
      Object.keys(record).forEach((key) => headerSet.add(key));
    });
    return Array.from(headerSet);
  }

  private escapeCsv(value: string): string {
    if (!value.includes(',') && !value.includes('"') && !value.includes('\n')) {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }
}
