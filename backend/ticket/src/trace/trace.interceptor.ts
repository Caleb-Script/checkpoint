import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TraceContextProvider } from './trace-context.provider.js';
import { TraceContextUtil } from './trace-context.util.js';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  readonly #traceContextProvider: TraceContextProvider;

  constructor(traceContextProvider: TraceContextProvider) {
    this.#traceContextProvider = traceContextProvider;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const headers = request?.headers ?? {};

    const trace = TraceContextUtil.fromHeaders(headers);
    this.#traceContextProvider.setContext(trace);

    return next.handle();
  }
}
