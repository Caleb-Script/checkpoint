/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication): void {
    const onBeforeExit = () => {
      void app.close();
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this as any).$on?.("beforeExit", onBeforeExit);
    } catch {
      // Fallback: Node process-Hook
      process.on("beforeExit", onBeforeExit);
    }
  }
}
