# Wallet Service with Paystack, JWT & API Keys

A comprehensive NestJS backend service that provides wallet functionality with Paystack integration, Google OAuth authentication, and API key management for service-to-service access.

## 🚀 Features

### Authentication
- **Google OAuth**: Sign in with Google to generate JWT tokens
- **JWT Authentication**: Secure user authentication with JSON Web Tokens
- **API Key Management**: Generate, manage, and revoke API keys for service access

### Wallet Operations
- **Paystack Deposits**: Deposit money using Paystack payment gateway
- **Wallet-to-Wallet Transfers**: Transfer funds between users
- **Balance Management**: View wallet balance and transaction history
- **Webhook Integration**: Mandatory Paystack webhook handling for payment verification

### API Key System
- **Permission-Based Access**: API keys with specific permissions (deposit, transfer, read)
- **Expiration Management**: API keys with configurable expiry (1H, 1D, 1M, 1Y)
- **Rollover Support**: Create new API keys from expired ones with same permissions
- **Usage Tracking**: Track last used timestamps for API keys
- **Limit Enforcement**: Maximum 5 active API keys per user

## 🛠️ Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Google OAuth
- **Payment**: Paystack integration
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator & class-transformer

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Paystack account (test/live keys)
- Google OAuth credentials
- ngrok (for webhook testing)

## 🚀 Installation

1. **Clone and install dependencies**:
   ```bash
   cd wallet-service
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up PostgreSQL database**:
   ```sql
   CREATE DATABASE wallet_service_db;
   ```

4. **Start the development server**:
   ```bash
   npm run start:dev
   ```

5. **Access the application**:
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/api/docs

## 🔧 Environment Variables

```bash
# Application
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=wallet_service_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-secure
JWT_EXPIRES_IN=24h

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

## 📚 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/google` - Authenticate with Google ID token

### API Key Management
- `POST /keys/create` - Create new API key
- `POST /keys/rollover` - Rollover expired API key
- `GET /keys` - List user's API keys
- `DELETE /keys/:id` - Revoke API key

### Wallet Operations
- `POST /wallet/deposit` - Initiate Paystack deposit
- `POST /wallet/paystack/webhook` - Paystack webhook endpoint
- `GET /wallet/deposit/:reference/status` - Check deposit status
- `GET /wallet/balance` - Get wallet balance
- `POST /wallet/transfer` - Transfer to another wallet
- `GET /wallet/transactions` - Get transaction history

## 🔐 Authentication Methods

### JWT Authentication
```bash
# Header
Authorization: Bearer <jwt_token>
```

### API Key Authentication
```bash
# Header
x-api-key: sk_live_your_api_key_here
```

### Flexible Authentication
Most wallet endpoints accept both JWT and API key authentication.

## 📝 Usage Examples

### 1. Google Authentication
```bash
# Get Google ID token from frontend, then:
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "your_google_id_token"}'
```

### 2. Create API Key
```bash
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Service API Key",
    "permissions": ["deposit", "transfer", "read"],
    "expiry": "1M"
  }'
```

### 3. Deposit Money
```bash
curl -X POST http://localhost:3000/wallet/deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

### 4. Transfer Money
```bash
curl -X POST http://localhost:3000/wallet/transfer \
  -H "x-api-key: sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_number": "4566678954356",
    "amount": 3000
  }'
```

### 5. Check Balance
```bash
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔗 Webhook Setup

### Using ngrok for Development
1. **Install ngrok**: https://ngrok.com/
2. **Expose local server**:
   ```bash
   ngrok http 3000
   ```
3. **Configure Paystack webhook**:
   - URL: `https://your-ngrok-url.ngrok.io/wallet/paystack/webhook`
   - Events: `charge.success`

### Webhook Security
- All webhooks are verified using Paystack signature
- Only `charge.success` events update wallet balances
- Idempotent processing prevents double-crediting

## 🏗️ Database Schema

### Users
- id, email, name, googleId, isActive
- One-to-One: Wallet
- One-to-Many: ApiKeys, Transactions

### Wallets
- id, walletNumber, balance, userId
- Unique wallet numbers for transfers

### API Keys
- id, key, name, permissions, expiresAt, isActive, lastUsedAt, userId
- Permissions: deposit, transfer, read

### Transactions
- id, reference, type, amount, status, userId
- Types: deposit, transfer
- Statuses: pending, success, failed

## 🔒 Security Features

- **JWT Expiration**: Configurable token expiry
- **API Key Expiration**: Automatic expiry enforcement
- **Permission System**: Granular API key permissions
- **Webhook Verification**: Paystack signature validation
- **Input Validation**: Comprehensive request validation
- **Transaction Atomicity**: Database transactions for transfers
- **Rate Limiting**: Built-in NestJS throttling

## 🧪 Testing

### Manual Testing
Use the Swagger UI at `http://localhost:3000/api/docs` for interactive testing.

### API Testing Tools
- Postman collection available
- cURL examples in documentation
- Automated tests with Jest

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production database
- [ ] Configure production Paystack keys
- [ ] Set up proper webhook URL
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set strong JWT secret
- [ ] Enable database SSL

### Docker Deployment
```dockerfile
# Dockerfile included for containerization
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 📊 Monitoring

- **Health Checks**: Built-in health endpoints
- **Logging**: Structured logging with Winston
- **Metrics**: API usage and performance metrics
- **Error Tracking**: Comprehensive error handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create GitHub issue
- Check API documentation
- Review error logs

---

**Wallet Service** - Secure, scalable wallet management with Paystack integration 🚀