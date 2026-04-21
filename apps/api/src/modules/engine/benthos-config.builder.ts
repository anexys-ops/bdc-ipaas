import { Injectable } from '@nestjs/common';

@Injectable()
export class BenthosConfigBuilder {
  buildConfig(params: {
    flowId: string;
    executionId: string;
    inputPath: string;
    outputPath: string;
    outputFormat: string;
  }): Record<string, unknown> {
    return {
      input: {
        file: {
          paths: [params.inputPath],
          codec: 'lines',
        },
      },
      pipeline: {
        processors: [
          {
            mapping: `root = this # flow:${params.flowId} execution:${params.executionId}`,
          },
        ],
      },
      output: {
        file: {
          path: params.outputPath,
          codec: params.outputFormat,
        },
      },
    };
  }
}
