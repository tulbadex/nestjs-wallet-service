import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletDetailsDto {
  @ApiProperty({ description: 'Wallet number to lookup', example: '4566678954356' })
  @IsString()
  @IsNotEmpty()
  walletNumber: string;
}