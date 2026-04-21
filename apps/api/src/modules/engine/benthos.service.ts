import { Injectable } from '@nestjs/common';
import { BenthosConfigBuilder } from './benthos-config.builder';

@Injectable()
export class BenthosService {
  constructor(private readonly configBuilder: BenthosConfigBuilder) {}

  buildPipelineConfig(params: {
    flowId: string;
    executionId: string;
    inputPath: string;
    outputPath: string;
    outputFormat: string;
  }): Record<string, unknown> {
    return this.configBuilder.buildConfig(params);
  }

  transformRecords(
    records: Array<Record<string, unknown>>,
    rules: Array<Record<string, unknown>> | null,
  ): Array<Record<string, unknown>> {
    if (!rules || rules.length === 0) {
      return records;
    }

    return records.map((record) => {
      const mapped: Record<string, unknown> = {};
      for (const rule of rules) {
        const destinationField = rule.destinationField as string | undefined;
        const type = rule.type as string | undefined;
        if (!destinationField || !type) {
          continue;
        }
        if (type === 'from') {
          const sourceField = rule.sourceField as string | undefined;
          mapped[destinationField] = sourceField ? record[sourceField] : null;
          continue;
        }
        if (type === 'value') {
          mapped[destinationField] = rule.value;
          continue;
        }
        if (type === 'formula') {
          const formula = String(rule.formula ?? '');
          if (formula.startsWith('UPPER(') && formula.endsWith(')')) {
            const sourceField = formula.slice(6, -1).replace(/^source\./, '');
            mapped[destinationField] = String(record[sourceField] ?? '').toUpperCase();
            continue;
          }
          if (formula.startsWith('LOWER(') && formula.endsWith(')')) {
            const sourceField = formula.slice(6, -1).replace(/^source\./, '');
            mapped[destinationField] = String(record[sourceField] ?? '').toLowerCase();
            continue;
          }
          mapped[destinationField] = null;
          continue;
        }
      }
      return Object.keys(mapped).length > 0 ? mapped : record;
    });
  }
}
