import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export class RequestContext {
  static run<T>(store: RequestContextStore, callback: () => T): T {
    return storage.run(store, callback);
  }

  static get(): RequestContextStore | undefined {
    return storage.getStore();
  }

  static getCorrelationId(): string | undefined {
    return storage.getStore()?.correlationId;
  }
}
