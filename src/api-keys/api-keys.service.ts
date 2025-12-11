import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../database/entities/api-key.entity';
import { User } from '../database/entities/user.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { TimezoneUtil } from '../common/utils/timezone.util';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto) {
    // Check if user has reached the limit of 5 active API keys
    const activeKeysCount = await this.apiKeyRepository.count({
      where: { userId, isActive: true },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException('Maximum of 5 active API keys allowed per user');
    }

    const expiresAt = this.calculateExpiryDate(createApiKeyDto.expiry);
    const apiKey = this.generateApiKey();

    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newApiKey = this.apiKeyRepository.create({
      key: hashedKey,
      name: createApiKeyDto.name,
      permissions: createApiKeyDto.permissions,
      expiresAt,
      userId,
    });

    const savedKey = await this.apiKeyRepository.save(newApiKey);

    return {
      api_key: apiKey,
      expires_at: savedKey.expiresAt.toISOString(),
    };
  }

  async rolloverApiKey(userId: string, rolloverDto: RolloverApiKeyDto) {
    const expiredKey = await this.apiKeyRepository.findOne({
      where: { id: rolloverDto.expired_key_id, userId },
    });

    if (!expiredKey) {
      throw new NotFoundException('API key not found');
    }

    if (expiredKey.expiresAt >= TimezoneUtil.getNigeriaTime()) {
      throw new BadRequestException('API key is not expired');
    }

    // Check active keys limit
    const activeKeysCount = await this.apiKeyRepository.count({
      where: { userId, isActive: true },
    });

    if (activeKeysCount >= 5) {
      throw new BadRequestException('Maximum of 5 active API keys allowed per user');
    }

    const expiresAt = this.calculateExpiryDate(rolloverDto.expiry);
    const apiKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newApiKey = this.apiKeyRepository.create({
      key: hashedKey,
      name: expiredKey.name,
      permissions: expiredKey.permissions,
      expiresAt,
      userId,
    });

    const savedKey = await this.apiKeyRepository.save(newApiKey);

    return {
      api_key: apiKey,
      expires_at: savedKey.expiresAt.toISOString(),
    };
  }

  async getUserApiKeys(userId: string) {
    return this.apiKeyRepository.find({
      where: { userId },
      select: ['id', 'name', 'permissions', 'expiresAt', 'isActive', 'lastUsedAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async revokeApiKey(userId: string, keyId: string) {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Set expiry to current time to prevent rollover
    await this.apiKeyRepository.update(keyId, { 
      isActive: false,
      expiresAt: TimezoneUtil.getNigeriaTime()
    });
    return { message: 'API key revoked successfully' };
  }

  private generateApiKey(): string {
    const randomString = randomBytes(32).toString('hex');
    return `sk_live_${randomString}`;
  }

  private calculateExpiryDate(expiry: string): Date {
    switch (expiry) {
      case '1H':
        return TimezoneUtil.addTimeToNigeriaTime(60 * 60 * 1000);
      case '1D':
        return TimezoneUtil.addTimeToNigeriaTime(24 * 60 * 60 * 1000);
      case '1M':
        return TimezoneUtil.addTimeToNigeriaTime(30 * 24 * 60 * 60 * 1000);
      case '1Y':
        return TimezoneUtil.addTimeToNigeriaTime(365 * 24 * 60 * 60 * 1000);
      default:
        throw new BadRequestException('Invalid expiry format');
    }
  }
}