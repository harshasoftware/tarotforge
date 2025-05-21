// Export all Rider-Waite deck data
import { riderWaiteDeck, majorArcanaCards } from './riderWaiteDeck';
import { wandsCards } from './riderWaiteMinorWands';
import { cupsCards } from './riderWaiteMinorCups';
import { swordsCards } from './riderWaiteMinorSwords';
import { pentaclesCards } from './riderWaiteMinorPentacles';
import { Deck, Card } from '../types';

// Combine all cards
export const allRiderWaiteCards: Card[] = [
  ...majorArcanaCards,
  ...wandsCards,
  ...cupsCards,
  ...swordsCards,
  ...pentaclesCards
];

// Complete Rider-Waite deck with all cards
export const completeRiderWaiteDeck: Deck & { cards: Card[] } = {
  ...riderWaiteDeck,
  cards: allRiderWaiteCards
};

// Export individual card arrays
export {
  riderWaiteDeck,
  majorArcanaCards,
  wandsCards,
  cupsCards,
  swordsCards,
  pentaclesCards
}; 