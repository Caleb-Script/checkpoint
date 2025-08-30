import { KafkaModule } from '../messaging/kafka.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplateMutationResolver } from './resolvers/template-mutation.resolver';
import { TemplateQueryResolver } from './resolvers/template-query.resolver';
import { TemplateReadService } from './services/template-read.service';
import { TemplateWriteService } from './services/template-write.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, KafkaModule],
  providers: [
    TemplateQueryResolver,
    TemplateMutationResolver,
    TemplateReadService,
    TemplateWriteService,
  ],
  exports: [TemplateReadService, TemplateWriteService],
})
export class TemplateModule {}
