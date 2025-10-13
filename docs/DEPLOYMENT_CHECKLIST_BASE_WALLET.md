# Base Wallet Integration - Deployment Checklist

This checklist ensures a smooth deployment of the Base wallet integration to production.

## Pre-Deployment

### 1. Get WalletConnect Project ID

- [ ] Visit https://cloud.walletconnect.com
- [ ] Create account or sign in
- [ ] Create new project named "TarotForge" (or your app name)
- [ ] Copy Project ID
- [ ] Add to `.env` file: `VITE_WALLETCONNECT_PROJECT_ID=your_id_here`

### 2. Test Locally

- [ ] Install dependencies: `npm install`
- [ ] Update `.env` with WalletConnect Project ID
- [ ] Run dev server: `npm run dev`
- [ ] Sign in with Google
- [ ] Link a wallet (Coinbase Wallet or WalletConnect)
- [ ] Verify wallet appears in linked wallets list
- [ ] Unlink the wallet
- [ ] Verify wallet is removed from list

### 3. Database Migration (Staging)

- [ ] Connect to Supabase staging project
- [ ] Run migration:
  ```bash
  supabase db push
  # OR manually apply from Supabase dashboard
  ```
- [ ] Verify table created:
  ```sql
  SELECT * FROM information_schema.tables
  WHERE table_name = 'user_wallets';
  ```
- [ ] Verify RLS policies:
  ```sql
  SELECT * FROM pg_policies
  WHERE tablename = 'user_wallets';
  ```
- [ ] Test on staging environment

## Production Deployment

### 4. Environment Variables (Production)

Add these to your production environment:

**Netlify:**
```bash
# Via Netlify Dashboard or CLI
netlify env:set VITE_BASE_RPC_URL "https://mainnet.base.org"
netlify env:set VITE_BASE_SEPOLIA_RPC_URL "https://sepolia.base.org"
netlify env:set VITE_WALLETCONNECT_PROJECT_ID "your_project_id"
```

**Vercel:**
```bash
vercel env add VITE_BASE_RPC_URL "https://mainnet.base.org"
vercel env add VITE_BASE_SEPOLIA_RPC_URL "https://sepolia.base.org"
vercel env add VITE_WALLETCONNECT_PROJECT_ID "your_project_id"
```

**Other Platforms:**
- Add via platform dashboard
- Or update `.env.production` file

### 5. Database Migration (Production)

- [ ] **Backup your production database first!**
  ```bash
  # Via Supabase dashboard: Database > Backups > Create backup
  ```
- [ ] Apply migration to production Supabase:
  ```bash
  supabase link --project-ref your-project-ref
  supabase db push
  ```
- [ ] Verify migration succeeded:
  - Check Supabase dashboard > Table Editor
  - Should see `user_wallets` table
- [ ] Test RLS policies manually:
  ```sql
  -- Should return 0 rows for anonymous user
  SELECT * FROM user_wallets;

  -- Sign in and should return only your wallets
  SELECT * FROM user_wallets;
  ```

### 6. Code Deployment

- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "feat: Add Base wallet integration with EIP-4361"
  git push origin main
  ```
- [ ] Wait for build to complete
- [ ] Check build logs for errors
- [ ] Verify deployment succeeded

### 7. Post-Deployment Testing

#### Basic Flow
- [ ] Visit production site
- [ ] Sign in with Google
- [ ] Navigate to profile/settings
- [ ] Click "Link Wallet"
- [ ] Connect Coinbase Wallet
- [ ] Sign SIWE message
- [ ] Verify wallet shows in list
- [ ] Refresh page - wallet should persist
- [ ] Unlink wallet
- [ ] Verify wallet removed

#### Edge Cases
- [ ] Try linking same wallet twice (should fail with error message)
- [ ] Try linking wallet while not signed in (should prompt to sign in)
- [ ] Sign out and verify wallets clear from state
- [ ] Sign back in and verify wallets load

#### Cross-Browser Testing
- [ ] Chrome/Brave (with Coinbase Wallet extension)
- [ ] Firefox (with MetaMask)
- [ ] Safari (mobile - with Coinbase Wallet app)
- [ ] Edge

#### Mobile Testing
- [ ] iOS Safari + Coinbase Wallet app
- [ ] Android Chrome + Coinbase Wallet app
- [ ] Test WalletConnect QR code scanning

### 8. Monitoring & Analytics

- [ ] Set up error tracking for wallet operations
  ```typescript
  // Example with Sentry
  import * as Sentry from '@sentry/react';

  try {
    await linkBaseWallet(...);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'wallet-linking' }
    });
  }
  ```
- [ ] Add analytics events:
  - Wallet link initiated
  - Wallet link success
  - Wallet link failed
  - Wallet unlink
- [ ] Monitor Supabase logs for wallet operations
- [ ] Set up alerts for repeated failures

### 9. User Documentation

- [ ] Update help docs/FAQ
- [ ] Add wallet linking instructions
- [ ] Create video tutorial (optional)
- [ ] Update changelog/release notes
- [ ] Notify users about new feature (email/in-app)

### 10. Security Audit

- [ ] Verify RLS policies work correctly
- [ ] Test with different user accounts
- [ ] Attempt to access other users' wallets (should fail)
- [ ] Check for any exposed secrets in frontend
- [ ] Verify HTTPS is enforced
- [ ] Test SIWE message format
- [ ] Verify nonce uniqueness

## Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback via platform
netlify rollback  # for Netlify
vercel rollback   # for Vercel
```

### Database Rollback
```sql
-- If needed, drop the table (THIS DELETES DATA!)
DROP TABLE IF EXISTS public.user_wallets CASCADE;

-- Or disable feature with RLS
ALTER TABLE public.user_wallets DISABLE ROW LEVEL SECURITY;
```

### Feature Flag (Alternative)
Add a feature flag to disable wallet features without rollback:
```typescript
const ENABLE_WALLET_LINKING = import.meta.env.VITE_ENABLE_WALLET_LINKING === 'true';

if (ENABLE_WALLET_LINKING) {
  return <LinkedWallets />;
}
return null;
```

## Post-Launch Monitoring (First 24-48 Hours)

### Metrics to Watch

- [ ] Number of successful wallet links
- [ ] Number of failed wallet links
- [ ] Error rates by wallet type
- [ ] User feedback/support tickets
- [ ] Database query performance
- [ ] API response times

### Dashboard Queries

```sql
-- Total linked wallets
SELECT COUNT(*) FROM user_wallets;

-- Wallets by type
SELECT wallet_type, COUNT(*)
FROM user_wallets
GROUP BY wallet_type;

-- Recent links
SELECT * FROM user_wallets
ORDER BY linked_at DESC
LIMIT 10;

-- Users with multiple wallets
SELECT user_id, COUNT(*) as wallet_count
FROM user_wallets
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### Health Checks

- [ ] Check error logs every 2-4 hours
- [ ] Monitor Supabase CPU/memory usage
- [ ] Check frontend bundle size impact
- [ ] Monitor page load times
- [ ] Track wallet connection success rate

## Optimization (After 1 Week)

- [ ] Analyze most used wallet types
- [ ] Optimize slow queries
- [ ] Add indexes if needed
- [ ] Consider caching strategies
- [ ] Review and update documentation
- [ ] Gather user feedback
- [ ] Plan next iterations

## Success Criteria

✅ Migration applied without errors
✅ RLS policies working correctly
✅ Users can link wallets successfully
✅ Wallets persist across sessions
✅ Unlink functionality works
✅ No security vulnerabilities
✅ Performance within acceptable range
✅ Error rate < 5%
✅ User feedback positive

## Support Preparation

### Common Issues & Solutions

1. **"Can't connect wallet"**
   - Ensure wallet extension installed
   - Try different wallet provider
   - Check network connectivity

2. **"Signature verification failed"**
   - Refresh page and try again
   - Ensure on correct network (Base)
   - Clear browser cache

3. **"Wallet already linked"**
   - Wallet is on another account
   - Contact support to unlink

### Support Resources

- [ ] Update support docs
- [ ] Train support team
- [ ] Create quick reference guide
- [ ] Set up Slack/Discord alerts
- [ ] Prepare response templates

## Final Checks

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Monitoring in place
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Support team prepared
- [ ] Changelog updated

## Go Live! 🚀

- [ ] Deploy to production
- [ ] Monitor for 30 minutes
- [ ] Test basic flow
- [ ] Announce new feature
- [ ] Celebrate! 🎉

## Post-Launch Tasks (Week 1)

- [ ] Collect user feedback
- [ ] Address any bugs
- [ ] Optimize performance
- [ ] Update documentation
- [ ] Plan next features
- [ ] Review analytics
- [ ] Team retrospective

---

**Remember:**
- Always test thoroughly before deploying
- Keep the rollback plan ready
- Monitor closely after deployment
- Respond quickly to issues
- Communicate with users

**Need help?** Check the [full documentation](./BASE_WALLET_INTEGRATION.md) or create a GitHub issue.
