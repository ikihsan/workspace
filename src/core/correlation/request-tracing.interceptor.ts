import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLogger } from '../logger/app-logger.service';
import { RequestContext } from './request-context';

interface HttpRequestLike {
  method: string;
  originalUrl?: string;
  url: string;
}

@Injectable()
export class RequestTracingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(RequestTracingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http' | 'rpc' | 'ws'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const startedAt = Date.now();
    const path = request.originalUrl ?? request.url;

    this.logger.info('Incoming request', {
      traceType: 'request',
      method: request.method,
      path,
      correlationId: RequestContext.getCorrelationId(),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info('Request completed', {
            traceType: 'request',
            method: request.method,
            path,
            durationMs: Date.now() - startedAt,
            correlationId: RequestContext.getCorrelationId(),
          });
        },
      }),
    );
  }
}
