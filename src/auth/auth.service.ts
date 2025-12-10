import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../database/entities/user.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleAuthDto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return this.createUserAndToken(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Google authentication failed');
    }
  }

  async googleCallback(code: string) {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokens.id_token) {
        throw new UnauthorizedException('Failed to get ID token');
      }

      // Verify ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return this.createUserAndToken(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Google authentication failed');
    }
  }

  private async createUserAndToken(payload: any) {
    const { sub: googleId, email, name } = payload;

    let user = await this.userRepository.findOne({
      where: [{ googleId }, { email }],
      relations: ['wallet'],
    });

    if (!user) {
      // Create new user
      user = this.userRepository.create({
        email,
        name,
        googleId,
      });
      user = await this.userRepository.save(user);

      // Create wallet for new user
      const wallet = this.walletRepository.create({
        userId: user.id,
        walletNumber: this.generateWalletNumber(),
        balance: 0,
      });
      await this.walletRepository.save(wallet);
      user.wallet = wallet;
    } else if (!user.googleId) {
      // Link existing user with Google
      user.googleId = googleId;
      await this.userRepository.save(user);
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: token,
    };
  }

  private generateWalletNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}