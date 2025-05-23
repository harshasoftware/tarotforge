/*
  # Rename credit-related files to deck-based naming

  This migration doesn't make database changes but serves as documentation for the file renaming:
  
  1. File Renames
    - `src/context/CreditContext.tsx` → `src/context/DeckQuotaContext.tsx`
    - `src/components/profile/CreditSummaryCard.tsx` → `src/components/profile/DeckQuotaOverview.tsx`
    - `src/components/profile/CreditTransactionHistory.tsx` → `src/components/profile/DeckGenerationActivity.tsx`
    - `src/lib/credit-fix.ts` → `src/lib/deck-quota-fix.ts`
    - `src/lib/credit-migration.ts` → `src/lib/deck-quota-migration.ts`
    - `src/components/ui/CreditBadge.tsx` → `src/components/ui/DeckQuotaBadge.tsx` (renamed in code only)
    
  2. Function Renames
    - `fixUserCreditRecord` → `fixUserDeckQuotaRecord`
    - `ensureUserCredits` → `ensureDeckQuotas`
    - `migrateUserCredits` → `migrateUserDeckQuotas`
    - `consumeCredits` → `consumeQuotas`
    - `getEstimatedCreditConsumption` → `getEstimatedQuotaConsumption`
    - `initializeCredits` → `initializeQuotas`
    - `refreshCredits` → `refreshQuotas`
    
  3. Variable Renames
    - `credits` → `quotas`
    - `majorArcanaQuota` (formerly `basicCredits`)
    - `completeDeckQuota` (formerly `premiumCredits`)
    - `majorArcanaUsed` (formerly `basicCreditsUsed`)
    - `completeDeckUsed` (formerly `premiumCreditsUsed`)
    - `planType` (formerly `planTier`)
    
  4. Hook Renames
    - `useCredits` → `useDeckQuotas`
    
  5. Component Renames
    - `CreditProvider` → `DeckQuotaProvider`
    - `CreditSummaryCard` → `DeckQuotaOverview`
    - `CreditTransactionHistory` → `DeckGenerationActivity`
    - `DeckBadge` → `DeckQuotaBadge`
*/

-- This is a documentation-only migration, no actual database changes