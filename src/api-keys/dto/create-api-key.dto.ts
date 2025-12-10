import { IsString, IsNotEmpty, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyPermission } from '../../database/entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Permissions for the API key. Available options: deposit (initiate wallet deposits), transfer (transfer funds between wallets), read (view balance and transactions)',
    enum: ApiKeyPermission,
    isArray: true,
    example: ['deposit', 'transfer', 'read']
  })
  @IsArray()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];

  @ApiProperty({ 
    description: 'Expiry duration. Options: 1H (1 hour), 1D (1 day), 1M (1 month), 1Y (1 year)',
    enum: ['1H', '1D', '1M', '1Y'],
    example: '1D'
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}