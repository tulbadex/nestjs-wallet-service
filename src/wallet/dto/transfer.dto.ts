import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ description: 'Recipient wallet number', example: '4566678954356' })
  @IsString()
  @IsNotEmpty()
  wallet_number: string;

  @ApiProperty({ description: 'Amount to transfer in kobo (NGN)', example: 3000 })
  @IsNumber()
  @IsPositive()
  amount: number;
}