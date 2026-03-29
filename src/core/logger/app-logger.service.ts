import { Injectable, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { RequestContext } from '../correlation/request-context';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  constructor(private readonly logger: PinoLogger) {}

  setContext(context: string): void {
    this.logger.setContext(context);
  }

  info(message: string, details?: Record<string, unknown>): void {
    this.logger.info(this.withCorrelation(details), message);
  }

  warn(message: string, details?: Record<string, unknown>): void {
    this.logger.warn(this.withCorrelation(details), message);
  }

  error(message: string, details?: Record<string, unknown>): void {
    this.logger.error(this.withCorrelation(details), message);
  }

  debug(message: string, details?: Record<string, unknown>): void {
    this.logger.debug(this.withCorrelation(details), message);
  }

  traceJobStart(jobName: string, queueName: string, jobId: string, correlationId?: string): void {
    this.info('Job started', {
      traceType: 'job',
      phase: 'start',
      jobName,
      queueName,
      jobId,
      correlationId,
    });
  }

  traceJobEnd(jobName: string, queueName: string, jobId: string, correlationId?: string): void {
    this.info('Job completed', {
      traceType: 'job',
      phase: 'end',
      jobName,
      queueName,
      jobId,
      correlationId,
    });
  }

  traceJobFailure(jobName: string, queueName: string, jobId: string, error: string, correlationId?: string): void {
    this.error('Job failed', {
      traceType: 'job',
      phase: 'error',
      jobName,
      queueName,
      jobId,
      correlationId,
      error,
    });
  }

  private withCorrelation(details: Record<string, unknown> = {}): Record<string, unknown> {
    const correlationId = RequestContext.getCorrelationId();

    return {
      correlationId,
      ...details,
    };
  }
}
