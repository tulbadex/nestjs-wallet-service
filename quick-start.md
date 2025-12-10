# 🚀 Quick Start Guide

## Prerequisites Setup

### 1. Database Setup
```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE wallet_service_db;
```

### 2. Environment Configuration
Update your `.env` file with these essential values:

```bash
# Database (Update with your PostgreSQL credentials)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=wallet_service_db

# JWT Secret (Generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-secure

# Paystack (Get from https://dashboard.paystack.com/#/settings/developer)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret

# Google OAuth (Get from https://console.developers.google.com/)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🏃‍♂️ Start Development Server

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run start:dev
```

## 🧪 Test the API

### 1. Visit API Documentation
Open: http://localhost:3000/api/docs

### 2. Health Check
```bash
curl http://localhost:3000/health
```

### 3. Test Google Auth (Frontend Integration Required)
```bash
# This requires a frontend to get Google ID token
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "your_google_id_token"}'
```

## 🔗 Webhook Setup with ngrok

### 1. Install ngrok
```bash
npm install -g ngrok
```

### 2. Expose local server
```bash
ngrok http 3000
```

### 3. Configure Paystack Webhook
- Go to Paystack Dashboard → Settings → Webhooks
- Add webhook URL: `https://your-ngrok-url.ngrok.io/wallet/paystack/webhook`
- Select events: `charge.success`

## 📝 API Testing Flow

### 1. Get JWT Token (via Google Auth)
- Use frontend or Postman to get Google ID token
- Exchange for JWT via `/auth/google` endpoint

### 2. Create API Key
```bash
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "permissions": ["deposit", "transfer", "read"],
    "expiry": "1D"
  }'
```

### 3. Test Wallet Operations
```bash
# Check balance
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Initiate deposit
curl -X POST http://localhost:3000/wallet/deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

## 🎯 Key Features to Test

- ✅ Google OAuth authentication
- ✅ JWT token generation
- ✅ API key creation and management
- ✅ Wallet deposit via Paystack
- ✅ Webhook handling
- ✅ Wallet-to-wallet transfers
- ✅ Transaction history
- ✅ Permission-based access control

## 🔧 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### Paystack Integration Issues
- Verify API keys are correct
- Check webhook URL is accessible
- Ensure ngrok is running for local testing

### Google OAuth Issues
- Verify client ID and secret
- Check redirect URLs in Google Console
- Ensure frontend properly handles OAuth flow

## 📚 Next Steps

1. **Frontend Integration**: Build a React/Vue frontend for complete user experience
2. **Production Deployment**: Deploy to cloud provider with proper environment variables
3. **Monitoring**: Add logging and monitoring for production use
4. **Testing**: Write comprehensive unit and integration tests
5. **Security**: Implement rate limiting and additional security measures

---

🎉 **You're ready to build with the Wallet Service!**