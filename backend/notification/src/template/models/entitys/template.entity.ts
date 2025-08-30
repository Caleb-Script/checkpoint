/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Channel } from '../enums/channel.enum';
import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class Template {
  @Field(() => ID) id!: string;
  @Field() key!: string;
  @Field() title!: string;
  @Field() body!: string;
  @Field(() => [String]) variables!: string[];
  @Field({ nullable: true }) locale?: string;
  @Field(() => Channel) channel!: Channel;
  @Field({ nullable: true }) category?: string;
  @Field() isActive!: boolean;
  @Field() version!: number;
  @Field(() => [String]) tags!: string[];
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
