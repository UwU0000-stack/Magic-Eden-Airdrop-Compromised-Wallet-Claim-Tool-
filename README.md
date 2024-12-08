# Magic Eden Airdrop Claim Tool - Solana Version ***API IS CURRENTLY DOWN FOR MAGIC EDEN*** SCRIPT SHOULD WORK WHEN IT IS BACK ONLINE- WILL MAKE CHANGES IF REQUIRED WHEN BACK ONLINE
A Next.js application for managing Magic Eden airdrop claims on Solana with automated scheduling and deadline monitoring.

# Note API
There is no point running this a ton before close to the deadline - After initial testing just run it maybe an hour or two before the claim deadline.I would run it 1 hour before the deadline. In the last 5 mins before claim deadline it sends the requests much faster.You could run it in two tabs to double if you really want to send lots of claims.

## Important Security Notice
As a general security practice, you should never enter private keys into websites. This tool should only be used as a last resort for compromised wallets to attempt claiming allocations before unauthorized parties do.

## Features
- Automated claim scheduling with configurable intervals
- Real-time deadline countdown and status monitoring
- Multiple wallet pair support for batch operations
- Secure signature generation using TweetNaCl
- Responsive UI with dark mode
- Secure claim wallet configuration

## How It Works
1. Configure your secure claim wallet that will receive the allocations
2. Add one or more compromised wallet pairs (private key + public address)
3. The tool will automatically attempt claims based on the schedule
4. All claims from compromised wallets will be directed to your secure claim wallet
5. Monitor success rates and status in real-time

## Local Development

1. Clone the repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

2. Install dependencies

```bash
npm install
```

3. Run the development server

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Vercel (Recommended)
1. Fork this repository
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your forked repository
4. Deploy

### Self-hosted
1. Build the application

```bash
npm run build
```

2. Start the production server

```bash
npm start
```

## Tech Stack
- Next.js 13 App Router
- React
- TailwindCSS
- Solana Web3.js
- TweetNaCl for cryptography
- BS58 for encoding

## Usage Guidelines
- Test your configuration first with a single wallet pair
- Monitor claim attempts and success rates
- Keep private keys secure and never share them
- Use a fresh, secure wallet as your claim destination
- Follow the recommended usage periods to ensure optimal performance
