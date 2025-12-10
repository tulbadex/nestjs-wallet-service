import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

    if (payload.event === 'charge.success') {
      const { reference, amount, status } = payload.data;

      const transaction = await this.transactionRepository.findOne({
        where: { reference },
        relations: ['user', 'user.wallet'],
      });

      if (!transaction) {
        return { status: true }; // Ignore unknown transactions
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        return { status: true }; // Already processed
      }

      if (status === 'success') {
        console.log('✅ Processing successful payment:', reference);
        await this.dataSource.transaction(async (manager) => {
          // Update transaction status
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.SUCCESS,
          });

          // Credit wallet
          await manager.increment(
            Wallet,
            { id: transaction.user.wallet.id },
            'balance',
            amount / 100, // Convert from kobo to naira
          );
        });
        console.log('✅ Wallet credited successfully');
      } else {
        console.log('❌ Payment failed:', reference);
        await this.transactionRepository.update(transaction.id, {
          status: TransactionStatus.FAILED,
        });
      }
    }

    return { status: true };
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

  private generateReference(): string {
    // Use Nigeria time for reference generation
    const nigeriaTime = TimezoneUtil.getNigeriaTime();
    return `WS_${nigeriaTime.getTime()}_${randomBytes(8).toString('hex')}`;
  }
}