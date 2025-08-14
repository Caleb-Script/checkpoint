import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { KafkaIndicator } from './kafka.indicator.js';
import { Public } from 'nest-keycloak-connect';

@Controller('health')
export class HealthController {
  readonly #health: HealthCheckService;
  readonly #http: HttpHealthIndicator;
  readonly #kafka: KafkaIndicator;

  constructor(
    health: HealthCheckService,
    http: HttpHealthIndicator,
    kafka: KafkaIndicator,
  ) {
    this.#health = health;
    this.#http = http;
    this.#kafka = kafka;
  }

  @Get('liveness')
  @HealthCheck()
  @Public()
  liveness() {
    return this.#health.check([
      () => Promise.resolve({ app: { status: 'up' } }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  @Public()
  readiness() {
    return this.#health.check([
      () => Promise.resolve({ app: { status: 'up' } }),
      () => this.#kafka.isHealthy(),
      () => this.#http.pingCheck('keycloak', process.env.KEYCLOAK_HEALTH_URL!),
      () => this.#http.pingCheck('tempo', process.env.TEMPO_HEALTH_URL!),
      () =>
        this.#http.pingCheck('prometheus', process.env.PROMETHEUS_HEALTH_URL!),
    ]);
  }
}
