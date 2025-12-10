import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({ description: 'ID of the expired API key' })
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @ApiProperty({ 
    description: 'New expiry duration',
    enum: ['1H', '1D', '1M', '1Y'],
  })
  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}