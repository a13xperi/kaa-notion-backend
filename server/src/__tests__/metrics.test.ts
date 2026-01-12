import {
  register,
  recordAuthAttempt,
  recordDeliverableUploaded,
  recordLeadCreated,
  recordPayment,
} from '../config/metrics';

function findMetricValue(
  metrics: Array<{ name: string; values?: Array<{ value: number; labels?: Record<string, string> }> }>,
  metricName: string,
  labels: Record<string, string>
): number | undefined {
  const metric = metrics.find((item) => item.name === metricName);
  const match = metric?.values?.find((value) => {
    if (!value.labels) return false;
    return Object.entries(labels).every(([key, labelValue]) => value.labels?.[key] === labelValue);
  });
  return match?.value;
}

describe('metrics counters', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('increments lead creation counter with source and tier labels', async () => {
    recordLeadCreated(2, 'web');

    const metrics = await register.getMetricsAsJSON();
    const value = findMetricValue(metrics, 'leads_created_total', {
      tier: '2',
      source: 'web',
    });

    expect(value).toBe(1);
  });

  it('increments payment counters for success and failure', async () => {
    recordPayment(1, 'success', 500, 'usd');
    recordPayment('unknown', 'failed');

    const metrics = await register.getMetricsAsJSON();
    const successValue = findMetricValue(metrics, 'payments_total', {
      tier: '1',
      status: 'success',
    });
    const failedValue = findMetricValue(metrics, 'payments_total', {
      tier: 'unknown',
      status: 'failed',
    });

    expect(successValue).toBe(1);
    expect(failedValue).toBe(1);
  });

  it('increments deliverable upload counter by category', async () => {
    recordDeliverableUploaded('Document');

    const metrics = await register.getMetricsAsJSON();
    const value = findMetricValue(metrics, 'deliverables_uploaded_total', {
      category: 'Document',
    });

    expect(value).toBe(1);
  });

  it('increments auth attempt counter by type and status', async () => {
    recordAuthAttempt('login', 'failed');
    recordAuthAttempt('login', 'success');

    const metrics = await register.getMetricsAsJSON();
    const failedValue = findMetricValue(metrics, 'auth_attempts_total', {
      type: 'login',
      status: 'failed',
    });
    const successValue = findMetricValue(metrics, 'auth_attempts_total', {
      type: 'login',
      status: 'success',
    });

    expect(failedValue).toBe(1);
    expect(successValue).toBe(1);
  });
});
