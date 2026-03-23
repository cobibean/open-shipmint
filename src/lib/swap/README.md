# Pump.Fun Token Swap Integration

Automatically swap a percentage of SOL credit purchases for tokens on Pump.Fun using the **official `@pump-fun/pump-sdk`**.

## Quick Start

1. **Enable the feature:**
   ```bash
   PUMP_SWAP_ENABLED=true
   ```

2. **Set your token mint:**
   ```bash
   PUMP_SWAP_TOKEN_MINT=your-token-mint-address
   ```

3. **Configure percentage (optional):**
   ```bash
   PUMP_SWAP_PERCENTAGE=75  # Swap 75% of received SOL
   ```

4. **Restart the server** - swaps will now execute on every credit purchase.

## How It Works

```
User buys credits with SOL
        ↓
Backend verifies payment → Credits granted immediately
        ↓
Swap queued in database (async)
        ↓
Swap executes via official Pump.fun SDK
  - Fetches live bonding curve state
  - Computes token amount using on-chain math
  - Builds & signs transaction locally
  - Sends with priority fees
        ↓
On failure: retry up to 3x with exponential backoff
        ↓
On permanent failure: SOL kept, logged for monitoring
```

## Technical Details

The swap integration uses the official `@pump-fun/pump-sdk` which:

- **Fetches live state** - Gets current bonding curve, global params, and fee config
- **Auto-detects Token-2022** - Works with both SPL Token and Token-2022 mints
- **Creates ATA if needed** - Automatically adds ATA creation instruction when required
- **Uses bonding curve math** - Accurate token amount calculation via `getBuyTokenAmountFromSolAmount()`
- **Full control** - We build and sign the transaction locally, no third-party API dependencies

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PUMP_SWAP_ENABLED` | `false` | Enable/disable swap feature |
| `PUMP_SWAP_PERCENTAGE` | `75` | Percentage of SOL to swap (0-100) |
| `PUMP_SWAP_TOKEN_MINT` | - | Token mint address (required) |
| `PUMP_SWAP_SLIPPAGE` | `10` | Slippage tolerance (%) |
| `PUMP_SWAP_PRIORITY_FEE` | `50000` | Priority fee (microlamports/CU) |
| `PUMP_SWAP_MAX_RETRIES` | `3` | Max retry attempts |

## API Endpoints

### Check Swap Status
```bash
GET /api/swap/{swapId}
```

### View Swap Statistics (Admin)
```bash
GET /api/admin/swap-stats
GET /api/admin/swap-stats?details=true  # Include pending/failed lists
```

### Manual Retry Trigger
```bash
POST /api/swap/retry-worker
```

## Monitoring

### Logs
All swap operations are logged with `[Swap]` prefix:
```
[Swap] Executing swap: 0.0375 SOL -> ERmXZ...
[Swap] Treasury: AUcbGq3...
[Swap] Fetched global state
[Swap] Token program: Token-2022
[Swap] Fetched bonding curve state
[Swap] Expected tokens: 123456789
[Swap] Built 3 instructions
[Swap] Transaction signed
[Swap] Transaction sent: 5xYz...
[Swap] Transaction confirmed: 5xYz...
```

### Stats Endpoint
```json
{
  "config": {
    "enabled": true,
    "percentage": 75,
    "tokenMint": "ERmXZ...",
    "slippage": 10,
    "priorityFee": 50000,
    "maxRetries": 3
  },
  "stats": {
    "totalSwaps": 100,
    "confirmedSwaps": 95,
    "failedSwaps": 3,
    "pendingSwaps": 2,
    "successRate": 96.94,
    "totalSolSwapped": 12.5
  }
}
```

## Troubleshooting

### Swaps not executing
1. Check `PUMP_SWAP_ENABLED=true`
2. Verify `PUMP_SWAP_TOKEN_MINT` is set
3. Ensure treasury has SOL for transaction fees (~0.01 SOL minimum)
4. Check logs for `[Swap]` entries

### High failure rate
1. Increase `PUMP_SWAP_SLIPPAGE` (try 15-20)
2. Increase `PUMP_SWAP_PRIORITY_FEE` (try 100000)
3. Verify token hasn't graduated to Raydium (bonding curve must exist)
4. Check that token mint is valid and tradeable

### "Token amount calculation returned zero"
This error means the bonding curve has been migrated to Raydium. The token has graduated and is no longer tradeable on the bonding curve. You need to either:
- Use Jupiter/Raydium instead (not implemented)
- Switch to a different token still on bonding curve

### Stuck pending swaps
Swaps stuck in pending state will be retried by the cron job every 5 minutes. If they exceed max retries, they're marked as failed and the SOL is kept.

To manually trigger retry:
```bash
curl -X POST https://your-app.vercel.app/api/swap/retry-worker
```

## Switching Token

1. Update `PUMP_SWAP_TOKEN_MINT` in environment
2. Restart the server
3. New purchases will swap to the new token

Note: Pending retries will still use the old token mint (stored in database).

## Disabling Swaps

Set `PUMP_SWAP_ENABLED=false` and restart. Credits will continue to work normally, just without token swaps.

## Dependencies

- `@pump-fun/pump-sdk` - Official Pump.fun SDK
- `@solana/web3.js` - Solana core library
- `@solana/spl-token` - Token program utilities
- `bn.js` - BigNumber support
