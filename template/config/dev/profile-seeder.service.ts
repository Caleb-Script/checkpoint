import { Injectable, OnModuleInit } from '@nestjs/common';
import { profiles } from './profiles.js';
import { ProfileReadService } from '../../profile/service/profile-read.service.js';
import { ProfileWriteService } from '../../profile/service/profile-write.service.js';
import { FollowWriteService } from '../../profile/service/follow-write.service.js';
import { PostWriteService } from '../../profile/service/post-write.service.js';
import { getLogger } from '../../logger/logger.js';
import { follows } from './follows.js';
import { posts } from './posts.js';
import { FriendshipWriteService } from '../../profile/service/friendship-write.service.js';
import { friendships } from './friendships.js';
import {
  Profile,
  ProfileDocument,
} from '../../profile/model/entity/profile.entity.js';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Post, PostDocument } from '../../profile/model/entity/post.entity.js';
import {
  Follow,
  FollowDocument,
} from '../../profile/model/entity/follow.entity.js';
import { FriendshipDocument } from '../../profile/model/entity/friendship.entity.js';

/**
 * Initialisiert Standard-Profiles für Benachrichtigungen, wenn sie noch nicht vorhanden sind.
 * Wird automatisch beim Modulstart ausgeführt.
 */
@Injectable()
export class ProfileSeederService implements OnModuleInit {
  readonly #logger = getLogger(ProfileSeederService.name);
  readonly #profileReadService: ProfileReadService;
  readonly #profileWriteService: ProfileWriteService;
  readonly #profileModel: Model<ProfileDocument>;

  readonly #followWriteService: FollowWriteService;
  readonly #followModel: Model<FollowDocument>;

  readonly #postWriteService: PostWriteService;
  readonly #postModel: Model<PostDocument>;

  readonly #friendshipWriteService: FriendshipWriteService;
  readonly #friendshipModel: Model<FriendshipDocument>;

  constructor(
    profileReadService: ProfileReadService,
    profileWriteService: ProfileWriteService,
    @InjectModel(Profile.name) profileModel: Model<ProfileDocument>,

    followWriteService: FollowWriteService,
    @InjectModel(Follow.name) followModel: Model<FollowDocument>,

    postWriteService: PostWriteService,
    @InjectModel(Post.name) postModel: Model<PostDocument>,

    friendshipWriteService: FriendshipWriteService,
    @InjectModel('Friendship') friendshipModel: Model<FriendshipDocument>,
  ) {
    this.#profileReadService = profileReadService;
    this.#profileWriteService = profileWriteService;
    this.#profileModel = profileModel;

    this.#followWriteService = followWriteService;
    this.#followModel = followModel;

    this.#postWriteService = postWriteService;
    this.#postModel = postModel;

    this.#friendshipWriteService = friendshipWriteService;
    this.#friendshipModel = friendshipModel;

    this.#logger.debug('ProfileSeederService initialized');
  }

  async onModuleInit(): Promise<void> {
    this.#logger.debug('🚀 Starting Profile Seeder...');
    await this.#seedProfiles();
    await this.#seedPosts();
    await this.#seedFollows();
    await this.#seedFriendships();
    this.#logger.debug('✅ Seeding completed successfully!');
  }

  async #seedProfiles(): Promise<void> {
    const count = await this.#profileModel.countDocuments();
    if (count > 0) {
      this.#logger.debug(
        `↪ Skipping profile seeding: already ${count} profiles exist`,
      );
      return;
    }

    for (const profile of profiles) {
      await this.#profileWriteService.create(profile);
    }

    this.#logger.debug(`✅ Seeded ${profiles.length} profiles`);
  }

  async #seedPosts(): Promise<void> {
    const count = await this.#postModel.countDocuments();
    if (count > 0) {
      this.#logger.debug(
        `↪ Skipping post seeding: already ${count} posts exist`,
      );
      return;
    }

    for (const post of posts) {
      const profile = await this.#profileReadService.findByUsername(
        post.profileUsername,
      );
      if (!profile) {
        this.#logger.warn(
          `⚠ Profile not found for post: ${post.profileUsername}`,
        );
        continue;
      }

      await this.#postWriteService.createPost({
        content: post.content,
        media: post.media,
        profileId: profile.id,
        isArchived: post.isArchived,
      });
    }

    this.#logger.debug(`✅ Seeded ${posts.length} posts`);
  }

  async #seedFollows(): Promise<void> {
    const count = await this.#followModel.countDocuments();
    if (count > 0) {
      this.#logger.debug(
        `↪ Skipping follow seeding: already ${count} follows exist`,
      );
      return;
    }

    for (const follow of follows) {
      const follower = await this.#profileReadService.findByUsername(
        follow.followerUsername,
      );
      const followed = await this.#profileReadService.findByUsername(
        follow.followedUsername,
      );

      if (!follower || !followed) {
        this.#logger.warn(
          `⚠ Cannot follow: ${follow.followerUsername} → ${follow.followedUsername}`,
        );
        continue;
      }

      await this.#followWriteService.followUser(follower.id, followed.id);
    }

    this.#logger.debug(`✅ Seeded ${follows.length} follows`);
  }

  async #seedFriendships(): Promise<void> {
    const count = await this.#friendshipModel.countDocuments();
    if (count > 0) {
      this.#logger.debug(
        `↪ Skipping friendship seeding: already ${count} friendships exist`,
      );
      return;
    }

    for (const friendship of friendships) {
      const requester = await this.#profileReadService.findByUsername(
        friendship.requesterUsername,
      );
      const recipient = await this.#profileReadService.findByUsername(
        friendship.recipientUsername,
      );

      if (!requester || !recipient) {
        this.#logger.warn(
          `⚠ Profile not found for friendship: ${friendship.requesterUsername} <-> ${friendship.recipientUsername}`,
        );
        continue;
      }

      const newFriendship = await this.#friendshipWriteService.sendRequest(
        requester.id,
        recipient.id,
      );

      if (friendship.status === 'ACCEPTED') {
        await this.#friendshipWriteService.acceptRequest(newFriendship.id);
      } else if (friendship.status === 'DECLINED') {
        await this.#friendshipWriteService.declineRequest(newFriendship.id);
      }
    }

    this.#logger.debug(`✅ Seeded ${friendships.length} friendships`);
  }
}
