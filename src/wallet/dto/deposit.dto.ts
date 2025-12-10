import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ description: 'Amount to deposit in kobo (NGN)', example: 5000 })
  @IsNumber()
  @IsPositive()
  amount: number;
}