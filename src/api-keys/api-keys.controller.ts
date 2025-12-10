import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('API Keys')
@Controller('keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createApiKey(
    @CurrentUser() user: any,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.createApiKey(user.id, createApiKeyDto);
  }

  @Post('rollover')
  @ApiOperation({ summary: 'Rollover an expired API key' })
  @ApiResponse({ status: 201, description: 'API key rolled over successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rolloverApiKey(
    @CurrentUser() user: any,
    @Body() rolloverDto: RolloverApiKeyDto,
  ) {
    return this.apiKeysService.rolloverApiKey(user.id, rolloverDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getUserApiKeys(@CurrentUser() user: any) {
    return this.apiKeysService.getUserApiKeys(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(
    @CurrentUser() user: any,
    @Param('id') keyId: string,
  ) {
    return this.apiKeysService.revokeApiKey(user.id, keyId);
  }
}