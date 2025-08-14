import { MongooseModule } from '@nestjs/mongoose';
import { KeycloakModule } from '../../security/keycloak/keycloak.module.js';
import { DevController } from './dev.controller.js';
import { Module } from '@nestjs/common';
import { entities } from '../../profile/model/entity/entities.entity.js';
import { ProfileModule } from '../../profile/profile.module.js';
import { ProfileSeederService } from './profile-seeder.service.js';

@Module({
  imports: [KeycloakModule, MongooseModule.forFeature(entities), ProfileModule],
  controllers: [DevController],
  providers: [ProfileSeederService],
  exports: [ProfileSeederService],
})
export class DevModule {}
