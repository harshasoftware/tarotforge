/*
  # Remove credit transactions table

  1. Changes
     - Drop the credit_transactions table which is no longer needed since we've moved to a deck-based pricing model
     - This removes the legacy credit transaction tracking system
*/

-- Drop the credit_transactions table
DROP TABLE IF EXISTS public.credit_transactions;