import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { TimezoneUtil } from '../utils/timezone.util';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const apiKeys = await this.apiKeyRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });

    let validApiKey: ApiKey | null = null;
    for (const key of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.key);
      if (isMatch) {
        validApiKey = key;
        break;
      }
    }

    if (!validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (validApiKey.expiresAt < TimezoneUtil.getNigeriaTime()) {
      throw new UnauthorizedException('API key expired');
    }

    // Update last used timestamp with Nigeria time
    await this.apiKeyRepository.update(validApiKey.id, { lastUsedAt: TimezoneUtil.getNigeriaTime() });

    request['user'] = { 
      id: validApiKey.user.id, 
      email: validApiKey.user.email,
      apiKey: validApiKey 
    };
    
    return true;
  }
}