import { ConflictException, Injectable } from '@nestjs/common';
import { IdentityProvider, User } from '@prisma/client';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppLogger } from '../../core/logger/app-logger.service';
import { UserIdentitiesService } from '../../modules/user-identities/user-identities.service';
import { UsersService } from '../../modules/users/users.service';

interface SlackUserProfile {
  email?: string;
  realName?: string;
  timezone?: string;
}

@Injectable()
export class SlackIdentityResolver {
  constructor(
    private readonly userIdentitiesService: UserIdentitiesService,
    private readonly usersService: UsersService,
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SlackIdentityResolver.name);
  }

  async resolveOrCreate(slackUserId: string): Promise<User> {
    const identity = await this.userIdentitiesService.findByProviderAndProviderUserId(
      IdentityProvider.SLACK,
      slackUserId,
    );

    if (identity) {
      const user = await this.usersService.findById(identity.userId);
      if (user.name.startsWith('Slack User ') || user.email.endsWith('@placeholder.local')) {
        await this.refreshUserProfile(user.id, slackUserId);
        return this.usersService.findById(user.id);
      }
      return user;
    }

    this.logger.info('No identity mapping found; auto-provisioning user', {
      integration: 'slack',
      slackUserId,
    });

    try {
      return await this.provisionUser(slackUserId);
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        const retryIdentity = await this.userIdentitiesService.findByProviderAndProviderUserId(
          IdentityProvider.SLACK,
          slackUserId,
        );

        if (retryIdentity) {
          this.logger.info('Resolved identity after race-condition retry', {
            integration: 'slack',
            slackUserId,
            userId: retryIdentity.userId,
          });
          return this.usersService.findById(retryIdentity.userId);
        }
      }

      throw error;
    }
  }

  private async provisionUser(slackUserId: string): Promise<User> {
    const profile = await this.fetchSlackProfile(slackUserId);

    if (profile.email) {
      const existingUser = await this.usersService.findByEmail(profile.email);
      if (existingUser) {
        await this.userIdentitiesService.create({
          userId: existingUser.id,
          provider: IdentityProvider.SLACK,
          providerUserId: slackUserId,
          metadata: { slackProfile: profile },
        });

        this.logger.info('Linked Slack identity to existing user by email', {
          integration: 'slack',
          slackUserId,
          userId: existingUser.id,
          email: profile.email,
        });

        return existingUser;
      }
    }

    const user = await this.usersService.create({
      email: profile.email || `slack-${slackUserId}@placeholder.local`,
      name: profile.realName || `Slack User ${slackUserId}`,
      timezone: profile.timezone || 'UTC',
    });

    await this.userIdentitiesService.create({
      userId: user.id,
      provider: IdentityProvider.SLACK,
      providerUserId: slackUserId,
      metadata: { slackProfile: profile, autoProvisioned: true },
    });

    this.logger.info('Auto-provisioned new user from Slack identity', {
      integration: 'slack',
      slackUserId,
      userId: user.id,
      email: user.email,
      hasRealProfile: Boolean(profile.email),
    });

    return user;
  }

  private async refreshUserProfile(userId: string, slackUserId: string): Promise<void> {
    try {
      const profile = await this.fetchSlackProfile(slackUserId);
      const updates: { name?: string; email?: string; timezone?: string } = {};

      if (profile.realName) {
        updates.name = profile.realName;
      }
      if (profile.email) {
        updates.email = profile.email;
      }
      if (profile.timezone) {
        updates.timezone = profile.timezone;
      }

      if (Object.keys(updates).length > 0) {
        await this.usersService.update(userId, updates);
        this.logger.info('Refreshed stale user profile from Slack', {
          integration: 'slack',
          slackUserId,
          userId,
          updatedFields: Object.keys(updates),
        });
      }
    } catch (error: unknown) {
      this.logger.warn('Failed to refresh user profile; continuing with stale data', {
        integration: 'slack',
        slackUserId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async fetchSlackProfile(slackUserId: string): Promise<SlackUserProfile> {
    const botToken = this.configService.slack.botToken;
    if (!botToken) {
      this.logger.warn('Slack bot token not configured; using placeholder profile', {
        integration: 'slack',
        slackUserId,
      });
      return {};
    }

    try {
      const apiBaseUrl = this.configService.slack.apiBaseUrl;
      const response = await fetch(
        `${apiBaseUrl}/users.info?user=${encodeURIComponent(slackUserId)}`,
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${botToken}`,
            accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn('Slack users.info API returned non-OK status', {
          integration: 'slack',
          slackUserId,
          status: response.status,
        });
        return {};
      }

      const body = (await response.json()) as Record<string, unknown>;
      if (!body.ok) {
        this.logger.warn('Slack users.info returned ok=false', {
          integration: 'slack',
          slackUserId,
          error: body.error,
        });
        return {};
      }

      const slackUser = body.user as Record<string, unknown> | undefined;
      const slackProfile = slackUser?.profile as Record<string, unknown> | undefined;

      return {
        email: typeof slackProfile?.email === 'string' ? slackProfile.email : undefined,
        realName: typeof slackUser?.real_name === 'string' ? slackUser.real_name : undefined,
        timezone: typeof slackUser?.tz === 'string' ? slackUser.tz : undefined,
      };
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch Slack profile; using placeholder', {
        integration: 'slack',
        slackUserId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }
}
