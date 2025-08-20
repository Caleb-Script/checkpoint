import { Module } from "@nestjs/common";
import { InvitationModule } from "./invitation/invitation.module";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "./logger/logger.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), "dist/schema.gql"),
        sortSchema: true,
        playground: cfg.get("GRAPHQL_PLAYGROUND") === "true",
        csrfPrevention: false,
      }),
    }),
    LoggerModule,
    InvitationModule,
  ],
})
export class AppModule {}
