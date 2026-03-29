import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from './request-context';

const CORRELATION_HEADER = 'x-correlation-id';

export class CorrelationIdMiddleware {
  static create(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const incomingId = req.header(CORRELATION_HEADER);
      const correlationId = incomingId && incomingId.trim().length > 0 ? incomingId : randomUUID();

      req.headers[CORRELATION_HEADER] = correlationId;
      res.setHeader(CORRELATION_HEADER, correlationId);

      RequestContext.run({ correlationId }, () => {
        next();
      });
    };
  }
}

export { CORRELATION_HEADER };
