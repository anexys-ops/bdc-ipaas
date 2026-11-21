import { ConfigService } from '@nestjs/config';
import { TickflowReporterService, TickflowExecution } from './tickflow-reporter.service';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService;
const execution = (overrides: Partial<TickflowExecution> = {}): TickflowExecution => ({
  id: 'exec-1',
  status: 'SUCCESS',
  startedAt: new Date('2026-11-21T09:00:00Z'),
  finishedAt: new Date('2026-11-21T09:00:05Z'),
  recordsIn: 12,
  recordsOut: 12,
  recordsFailed: 0,
  errorMessage: null,
  ...overrides,
});
const triggerConfig = { tickflow: { clientCode: 'client-a', flowCode: 'orders' } };

describe('TickflowReporterService', () => {
  const fetchMock = jest.fn();
  const enabled = () =>
    new TickflowReporterService(
      config({ TICKFLOW_MONITORING_URL: 'https://mon.test/api/v1/', TICKFLOW_MONITORING_TOKEN: 'secret' }),
    );
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });
  const bodies = () => fetchMock.mock.calls.map(([url, init]) => ({ url, body: JSON.parse(init.body), auth: init.headers.Authorization }));

  it('stays silent when not configured or when the flow is not mapped', async () => {
    await new TickflowReporterService(config({})).reportExecution(triggerConfig, execution());
    await enabled().reportExecution({}, execution());
    await enabled().reportExecution({ tickflow: { clientCode: 'Bad Code', flowCode: 'orders' } }, execution());
    await enabled().reportExecution(triggerConfig, execution({ status: 'DRY_RUN_OK' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a run then a healthy status for a successful execution', async () => {
    await enabled().reportExecution(triggerConfig, execution());
    const [run, status] = bodies();
    expect(run.url).toBe('https://mon.test/api/v1/runs');
    expect(run.auth).toBe('Bearer secret');
    expect(run.body).toMatchObject({
      client_code: 'client-a',
      flow_code: 'orders',
      server_code: 'ultimate',
      run_id: 'ultimate:exec-1',
      result: 'success',
      counts: { received: 12, processed: 12, errors: 0 },
      items_in_error: [],
    });
    expect(status.url).toBe('https://mon.test/api/v1/status');
    expect(status.body).toMatchObject({ status: 'ok', issues: [] });
  });

  it('opens a critical incident on failure and a warning on partial delivery', async () => {
    await enabled().reportExecution(triggerConfig, execution({ status: 'FAILED', recordsOut: 0, errorMessage: 'SFTP refusé' }));
    const [run, status] = bodies();
    expect(run.body).toMatchObject({ result: 'failed', counts: { errors: 1 }, items_in_error: [{ ref: 'execution exec-1', message: 'SFTP refusé' }] });
    expect(status.body.status).toBe('critical');
    expect(status.body.issues[0]).toMatchObject({ code: 'ultimate_execution_failed', level: 'critical' });
    const partial = enabled().statusItem(triggerConfig.tickflow, execution({ status: 'PARTIAL', recordsFailed: 2 }));
    expect(partial).toMatchObject({ status: 'warning', issues: [{ code: 'ultimate_execution_partial', level: 'warning' }] });
    expect(enabled().statusItem(triggerConfig.tickflow, null).status).toBe('unknown');
  });

  it('reports an empty successful run as nothing to do', async () => {
    await enabled().reportExecution(triggerConfig, execution({ recordsIn: 0, recordsOut: 0 }));
    expect(bodies()[0].body.result).toBe('nothing_to_do');
  });

  it('never throws when Tickflow is unreachable and batches heartbeats by 100', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(enabled().reportExecution(triggerConfig, execution())).resolves.toBeUndefined();
    fetchMock.mockClear();
    const service = enabled();
    await service.reportStatuses(Array.from({ length: 150 }, () => service.statusItem(triggerConfig.tickflow, execution())));
    expect(bodies().map((c) => c.body.items.length)).toEqual([100, 50]);
  });
});
