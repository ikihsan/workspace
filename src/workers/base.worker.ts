export interface WorkerTraceContext {
  correlationId?: string;
  queueName: string;
  jobName: string;
  jobId: string;
}

export interface QueueJobPayload {
  trace?: Pick<WorkerTraceContext, 'correlationId'>;
  [key: string]: unknown;
}

export function getJobCorrelationId(payload: QueueJobPayload): string | undefined {
  return payload.trace?.correlationId;
}
