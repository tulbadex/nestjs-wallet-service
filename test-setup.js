const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Wallet Service Setup Verification\n');

// Check if .env file exists
if (fs.existsSync('.env')) {
  console.log('✅ Environment file (.env) exists');
} else {
  console.log('❌ Environment file (.env) missing - copy from .env.example');
}

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('✅ Dependencies installed');
} else {
  console.log('❌ Dependencies not installed - run: npm install');
}

// Check TypeScript compilation
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log(error.stdout?.toString() || error.message);
}

// Check if all required files exist
const requiredFiles = [
  'src/main.ts',
  'src/app.module.ts',
  'src/auth/auth.module.ts',
  'src/api-keys/api-keys.module.ts',
  'src/wallet/wallet.module.ts',
  'src/database/entities/user.entity.ts',
  'src/database/entities/wallet.entity.ts',
  'src/database/entities/transaction.entity.ts',
  'src/database/entities/api-key.entity.ts',
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

console.log('\n📋 Next Steps:');
console.log('1. Configure your .env file with database and API credentials');
console.log('2. Create PostgreSQL database: wallet_service_db');
console.log('3. Set up Paystack account and get API keys');
console.log('4. Configure Google OAuth credentials');
console.log('5. Install ngrok for webhook testing: npm install -g ngrok');
console.log('6. Start development server: npm run start:dev');
console.log('7. Visit API docs: http://localhost:3000/api/docs');

if (allFilesExist) {
  console.log('\n🎉 Setup verification complete! All files are in place.');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}