# Wallet-Only Authentication

Users can now sign in directly with their Base wallet without needing a Google account or email address!

## What's New

### Sign In with Wallet Button

A new "Sign In with Wallet" button has been added to the login page, allowing users to authenticate using only their cryptocurrency wallet.

## How It Works

### User Flow

1. **User clicks "Sign In with Wallet"** on the login page
2. **Wallet modal opens** showing available wallet options:
   - Coinbase Wallet
   - WalletConnect
   - Browser injected wallets (MetaMask, etc.)
3. **User connects their wallet**
4. **User signs a SIWE message** to verify wallet ownership (free, no gas)
5. **Account is created or logged in:**
   - **Existing wallet**: User is logged into their existing account
   - **New wallet**: Anonymous account is created and wallet is linked

### Technical Flow

```
User clicks "Sign In with Wallet"
  ↓
Connect wallet (Coinbase/WalletConnect)
  ↓
Generate SIWE message with nonce
  ↓
User signs message
  ↓
Check if wallet exists in database
  ↓
┌─────────────┴─────────────┐
│                           │
Wallet exists           Wallet is new
│                           │
Load user profile       Create anonymous user
│                           │
Set user in auth store  Link wallet to user
│                           │
└───────────┬───────────────┘
            │
      User signed in ✓
```

## Implementation Details

### Components

**SignInWithWallet.tsx**
- Modal component for wallet authentication
- Handles wallet connection
- Manages SIWE message signing
- Calls `signInWithWallet` from authStore

### AuthStore Method

**signInWithWallet(address, signature, message, nonce)**
1. Calls `authenticateWithWallet()` to verify signature
2. If wallet exists: Loads user profile
3. If wallet is new: Creates anonymous user and links wallet
4. Sets user in auth store
5. Fetches linked wallets

### Base Wallet Auth Utilities

**authenticateWithWallet()**
- Verifies SIWE signature
- Checks if wallet exists in database
- Returns userId if found, undefined if new

**generateWalletAuthMessage()**
- Creates SIWE message for authentication
- Uses statement: "Sign in to TarotForge with your Base wallet"

## Database Schema

The existing `user_wallets` table is used:
- Wallet-only users are stored as anonymous users
- Wallet is linked with `is_primary: true`
- Username format: `wallet_[first6chars]`

## User Experience

### For New Users

- No email required
- Instant account creation
- Username auto-generated from wallet address
- Can add email/Google later if desired

### For Existing Users

- Same wallet can't be used on multiple accounts
- If wallet is already linked, user is logged into that account
- Seamless authentication experience

## Benefits

### For Users
- ✅ **Privacy**: No email required
- ✅ **Speed**: Instant sign-in
- ✅ **Security**: Cryptographic wallet authentication
- ✅ **Web3 Native**: Perfect for crypto users

### For Platform
- ✅ **Lower friction**: Easier onboarding
- ✅ **Web3 audience**: Attract crypto-native users
- ✅ **Modern**: Cutting-edge authentication
- ✅ **Flexible**: Users can add email later

## Linking Email Later

Wallet-only users can upgrade their account later:
1. Navigate to Profile
2. Click "Link Google Account" or use magic link
3. Their wallet remains linked to the account
4. Now they have both wallet AND email auth

## Security Considerations

### SIWE Message Verification
- Nonces prevent replay attacks
- Domain and origin checked
- Timestamp validation
- Signature verified cryptographically

### Account Creation
- Anonymous user created via Supabase
- Wallet linked immediately
- Username derived from wallet address
- All RLS policies apply

### Best Practices
1. Users should keep their wallet secure
2. Lost wallet = lost account (if no email added)
3. Recommend adding email as backup
4. Support hardware wallets for extra security

## Testing

### Manual Test Flow

1. **New Wallet User:**
   ```
   - Go to /login
   - Click "Sign In with Wallet"
   - Connect Coinbase Wallet
   - Sign message
   - Should create new account
   - Navigate to /profile
   - See wallet-based username
   - See linked wallet in account
   ```

2. **Existing Wallet User:**
   ```
   - Sign out
   - Click "Sign In with Wallet" again
   - Connect same wallet
   - Should log into existing account
   - No duplicate account created
   ```

3. **Add Email to Wallet Account:**
   ```
   - While logged in with wallet
   - Go to profile
   - Click "Link Google"
   - Sign in with Google
   - Now have both auth methods
   ```

## UI Updates

### Login Page

**Before:**
- Google sign-in button
- Email magic link form

**After:**
- Google sign-in button
- **Sign In with Wallet button** (NEW)
- Email magic link form

### Profile Page

Wallet-only users see:
- Username: `wallet_abc123`
- Can link Google account
- Can add email via magic link
- Can link additional wallets

## Error Handling

### Common Scenarios

1. **User rejects signature:**
   - Error message shown
   - Can try again
   - Wallet remains connected

2. **Wallet already linked:**
   - Logs into existing account
   - No error (expected behavior)

3. **Connection fails:**
   - Clear error message
   - Suggest trying different wallet
   - Fallback to email auth

4. **Network issues:**
   - Timeout handling
   - Retry mechanism
   - User-friendly error message

## Future Enhancements

- [ ] Multi-chain support (Ethereum, Polygon, etc.)
- [ ] Hardware wallet optimization
- [ ] Wallet-based session management
- [ ] Remember wallet choice
- [ ] Quick reconnect feature
- [ ] Social recovery for wallet-only accounts

## Comparison with Traditional Auth

| Feature | Email/Google | Wallet-Only |
|---------|-------------|-------------|
| Privacy | Medium | High |
| Speed | Slow (email) | Fast |
| Security | Password-based | Cryptographic |
| Recovery | Email reset | Wallet backup |
| Friction | High | Low |
| Web3 Ready | No | Yes |

## Support

### User Questions

**Q: What if I lose access to my wallet?**
A: If you haven't added an email, you'll lose access to your account. We recommend adding an email as a backup.

**Q: Can I use multiple wallets?**
A: Yes! You can link multiple wallets to your account after signing in.

**Q: Do I need cryptocurrency?**
A: No! Signing messages is free and doesn't require any funds.

**Q: Is this secure?**
A: Yes! Wallet authentication uses cryptographic signatures and follows EIP-4361 standard.

## Conclusion

Wallet-only authentication provides a modern, secure, and privacy-focused way for users to access TarotForge without requiring an email address. It's perfect for crypto-native users while still allowing traditional email authentication for those who prefer it.

Users get the best of both worlds - they can start with just their wallet and add email authentication later if desired!
