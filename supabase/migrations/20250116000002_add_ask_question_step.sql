/*
  # Add Ask Question Step to Reading Sessions

  This migration adds the 'ask-question' step to the reading_step_type enum
  to support the new optional question selection feature.
*/

-- Add the new 'ask-question' value to the existing enum
ALTER TYPE reading_step_type ADD VALUE 'ask-question'; 