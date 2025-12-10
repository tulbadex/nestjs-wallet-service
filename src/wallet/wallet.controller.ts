import { Controller, Post, Get, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { FlexibleAuthGuard } from '../common/guards/flexible-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../common/guards/api-key-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiKeyPermission } from '../database/entities/api-key.entity';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post('deposit')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.DEPOSIT)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Deposit money to wallet via Paystack' })
  @ApiResponse({ status: 201, description: 'Deposit initiated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async deposit(
    @CurrentUser() user: any,
    @Body() depositDto: DepositDto,
  ) {
    return this.walletService.deposit(user.id, depositDto);
  }

  @Post('paystack/webhook')
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async paystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    console.log('🔔 Webhook received:', { event: payload?.event });
    return this.walletService.handlePaystackWebhook(payload, signature);
  }

  @Get('deposit/:reference/status')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Check deposit status' })
  @ApiResponse({ status: 200, description: 'Deposit status retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getDepositStatus(@Param('reference') reference: string) {
    return this.walletService.getDepositStatus(reference);
  }

  @Get('balance')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@CurrentUser() user: any) {
    return this.walletService.getWalletBalance(user.id);
  }

  @Post('transfer')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.TRANSFER)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Transfer money to another wallet' })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async transfer(
    @CurrentUser() user: any,
    @Body() transferDto: TransferDto,
  ) {
    return this.walletService.transfer(user.id, transferDto);
  }

  @Get('transactions')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  async getTransactionHistory(@CurrentUser() user: any) {
    return this.walletService.getTransactionHistory(user.id);
  }

  @Get('details')
  @UseGuards(FlexibleAuthGuard, PermissionGuard)
  @RequirePermissions(ApiKeyPermission.READ)
  @ApiBearerAuth()
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get current user wallet details' })
  @ApiResponse({ status: 200, description: 'Wallet details retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletDetails(@CurrentUser() user: any) {
    return this.walletService.getCurrentUserWalletDetails(user.id);
  }
}