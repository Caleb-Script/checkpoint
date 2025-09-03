import { Module } from "@nestjs/common";
import { InvitationModule } from "./invitation/invitation.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "./logger/logger.module";
import { GraphQLModule } from "@nestjs/graphql";
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from "@nestjs/apollo";
import { TraceModule } from "./trace/trace.module";
import { PrismaModule } from "./prisma/prisma.module";
import { KafkaModule } from "./messaging/kafka.module";
import { HandlerModule } from "./handlers/handler.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        // autoSchemaFile: join(process.cwd(), 'dist/schema.gql'),
        autoSchemaFile:
          process.env.SCHEMA_TARGET === "tmp"
            ? { path: "/tmp/schema.gql", federation: 2 }
            : process.env.SCHEMA_TARGET === "false"
              ? false
              : { path: "dist/schema.gql", federation: 2 },
        sortSchema: true,
        playground: cfg.get("GRAPHQL_PLAYGROUND") === "true",
        csrfPrevention: false,
        introspection: true,
      }),
    }),
    // Infrastruktur / Cross-Cutting
    LoggerModule,
    PrismaModule,
    TraceModule,
    KafkaModule,
    HandlerModule,

    // Feature-Module
    InvitationModule,
  ],
})
export class AppModule {}
