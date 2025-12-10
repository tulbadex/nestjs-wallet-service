import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { TimezoneUtil } from '../utils/timezone.util';

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Try JWT first
    const token = this.extractTokenFromHeader(request);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        request['user'] = payload;
        return true;
      } catch {
        // JWT failed, try API key
      }
    }

    // Try API key
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      const apiKeys = await this.apiKeyRepository.find({
        where: { isActive: true },
        relations: ['user'],
      });

      for (const key of apiKeys) {
        const isMatch = await bcrypt.compare(apiKey, key.key);
        if (isMatch && key.expiresAt >= TimezoneUtil.getNigeriaTime()) {
          await this.apiKeyRepository.update(key.id, { lastUsedAt: TimezoneUtil.getNigeriaTime() });
          request['user'] = { 
            id: key.user.id, 
            email: key.user.email,
            apiKey: key 
          };
          return true;
        }
      }
    }

    throw new UnauthorizedException('Valid JWT token or API key required');
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}