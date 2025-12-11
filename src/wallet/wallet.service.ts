import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { randomBytes, createHmac } from 'crypto';
import { Wallet } from '../database/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../database/entities/transaction.entity';
import { User } from '../database/entities/user.entity';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { TimezoneUtil } from '../common/utils/timezone.util';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async deposit(userId: string, depositDto: DepositDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const reference = this.generateReference();

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      reference,
      type: TransactionType.DEPOSIT,
      amount: depositDto.amount,
      status: TransactionStatus.PENDING,
      userId,
      description: 'Wallet deposit via Paystack',
    });

    await this.transactionRepository.save(transaction);

    try {
      // Initialize Paystack transaction
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: user.email,
          amount: depositDto.amount * 100, // Convert to kobo
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update transaction with Paystack reference
      await this.transactionRepository.update(transaction.id, {
        paystackReference: paystackResponse.data.data.reference,
      });

      return {
        reference,
        authorization_url: paystackResponse.data.data.authorization_url,
      };
    } catch (error) {
      // Update transaction status to failed
      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.FAILED,
      });

      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async handlePaystackWebhook(payload: any, signature?: string) {
    console.log('🔔 Processing webhook:', payload?.event);
    
    // Verify signature if provided
    if (signature) {
      const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (hash !== signature) {
        console.log('❌ Invalid signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Only handle successful charges
    if (payload.event === 'charge.success') {
      const { reference, amount } = payload.data;
      await this.processSuccessfulPayment(reference, amount);
    }

    return { status: true };
  }

  private async processSuccessfulPayment(reference: string, amount: number) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['user', 'user.wallet'],
    });

    if (!transaction || transaction.status === TransactionStatus.SUCCESS) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.SUCCESS,
      });

      await manager.increment(
        Wallet,
        { id: transaction.user.wallet.id },
        'balance',
        amount / 100,
      );
    });

    console.log(`✅ Payment processed: ${reference}`);
  }

  async getDepositStatus(reference: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: parseFloat(wallet.balance.toString()),
    };
  }

  async transfer(userId: string, transferDto: TransferDto) {
    const senderWallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    const receiverWallet = await this.walletRepository.findOne({
      where: { walletNumber: transferDto.wallet_number },
      relations: ['user'],
    });

    if (!receiverWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    if (senderWallet.id === receiverWallet.id) {
      throw new BadRequestException('Cannot transfer to same wallet');
    }

    if (parseFloat(senderWallet.balance.toString()) < transferDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const reference = this.generateReference();

    await this.dataSource.transaction(async (manager) => {
      // Debit sender
      await manager.decrement(
        Wallet,
        { id: senderWallet.id },
        'balance',
        transferDto.amount,
      );

      // Credit receiver
      await manager.increment(
        Wallet,
        { id: receiverWallet.id },
        'balance',
        transferDto.amount,
      );

      // Create transaction record
      const transaction = manager.create(Transaction, {
        reference,
        type: TransactionType.TRANSFER,
        amount: transferDto.amount,
        status: TransactionStatus.SUCCESS,
        userId,
        senderWalletId: senderWallet.id,
        receiverWalletId: receiverWallet.id,
        description: `Transfer to ${receiverWallet.walletNumber}`,
      });

      await manager.save(transaction);
    });

    return {
      status: 'success',
      message: 'Transfer completed',
    };
  }

  async getTransactionHistory(userId: string) {
    const transactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 transactions
    });

    return transactions.map(transaction => ({
      type: transaction.type,
      amount: parseFloat(transaction.amount.toString()),
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      createdAt: transaction.createdAt,
    }));
  }

  async getCurrentUserWalletDetails(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      walletNumber: wallet.walletNumber,
      balance: parseFloat(wallet.balance.toString()),
      ownerName: wallet.user.name,
      ownerEmail: wallet.user.email,
    };
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async pollPendingTransactions() {
    console.log('🔍 Polling for pending transactions...');
    
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Mark transactions older than 72 hours as failed
    await this.transactionRepository.update(
      {
        status: TransactionStatus.PENDING,
        type: TransactionType.DEPOSIT,
        createdAt: LessThan(seventyTwoHoursAgo)
      },
      { status: TransactionStatus.FAILED }
    );
    
    // Verify transactions between 5 minutes and 72 hours old
    const pendingTransactions = await this.transactionRepository.find({
      where: {
        status: TransactionStatus.PENDING,
        type: TransactionType.DEPOSIT,
        createdAt: LessThan(fiveMinutesAgo)
      },
      take: 10
    });

    for (const transaction of pendingTransactions) {
      await this.verifyTransactionWithPaystack(transaction.reference);
    }
  }

  private async verifyTransactionWithPaystack(reference: string) {
    try {
      console.log(`🔍 Verifying transaction: ${reference}`);
      
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { data } = response.data;
      
      if (data.status === 'success') {
        await this.processSuccessfulPayment(reference, data.amount);
      } else {
        await this.transactionRepository.update(
          { reference },
          { status: TransactionStatus.FAILED }
        );
      }
    } catch (error) {
      console.log(`⚠️ Error verifying ${reference}:`, error.message);
    }
  }

  private generateReference(): string {
    const nigeriaTime = TimezoneUtil.getNigeriaTime();
    return `WS_${nigeriaTime.getTime()}_${randomBytes(8).toString('hex')}`;
  }
}