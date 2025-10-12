import { supabase } from './supabase';
import { Deck, Card } from '../types';
import { riderWaiteDeck as rwDeck, riderWaiteCards } from '../data/riderWaiteDeck';
import { solaBuscaDeck as sbDeck, solaBuscaCards } from '../data/solaBuscaDeck';

/**
 * Fetches all decks from the marketplace including system-provided RiderWaite deck
 * @returns Array of decks from database + Rider Waite deck
 */
export const fetchAllDecks = async (): Promise<Deck[]> => {
  try {
    // Fetch decks from Supabase
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        creator:users (username, email)
      `)
      .eq('is_listed', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching decks:', error);
      throw error;
    }
    
    // Process data and add creator names
    const formattedDecks: Deck[] = data.map(deck => ({
      ...deck,
      creator_name: deck.creator?.username || deck.creator?.email?.split('@')[0] || 'Unknown Creator'
    }));

    // Add system decks to the beginning of the array
    return [rwDeck, sbDeck, ...formattedDecks];
  } catch (error) {
    console.error('Error in fetchAllDecks:', error);
    // If there's an error, at least return the system decks
    return [rwDeck, sbDeck];
  }
};

/**
 * Fetches a specific deck by ID
 * @param deckId The ID of the deck to fetch
 * @returns The deck with the specified ID, or Rider Waite deck if ID matches, or null if not found
 */
export const fetchDeckById = async (deckId: string): Promise<Deck | null> => {
  // If the deckId is for a system deck, return it directly
  if (deckId === 'rider-waite-classic') {
    return rwDeck;
  }
  if (deckId === 'sola-busca-classic') {
    return sbDeck;
  }
  
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        creator:users (username, email)
      `)
      .eq('id', deckId)
      .single();
      
    if (error) {
      console.error('Error fetching deck:', error);
      throw error;
    }
    
    if (data) {
      return {
        ...data,
        creator_name: data.creator?.username || data.creator?.email?.split('@')[0] || 'Unknown Creator'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in fetchDeckById:', error);
    return null;
  }
};

/**
 * Fetches all cards for a specific deck
 * @param deckId The ID of the deck to fetch cards for
 * @returns Array of cards for the specified deck
 */
export const fetchCardsByDeckId = async (deckId: string): Promise<Card[]> => {
  // If the deckId is for a system deck, return its cards directly
  if (deckId === 'rider-waite-classic') {
    return riderWaiteCards;
  }
  if (deckId === 'sola-busca-classic') {
    return solaBuscaCards;
  }
  
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('order', { ascending: true });
      
    if (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCardsByDeckId:', error);
    return [];
  }
};

/**
 * Fetches all free decks including system-provided Rider Waite deck
 * @returns Array of free decks
 */
export const fetchFreeDecks = async (): Promise<Deck[]> => {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        creator:users (username, email)
      `)
      .eq('is_free', true)
      .eq('is_public', true)
      .eq('is_listed', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching free decks:', error);
      throw error;
    }
    
    // Process data and add creator names
    const formattedDecks: Deck[] = data.map(deck => ({
      ...deck,
      creator_name: deck.creator?.username || deck.creator?.email?.split('@')[0] || 'Unknown Creator'
    }));

    // Add system decks to the beginning of the array
    return [rwDeck, sbDeck, ...formattedDecks];
  } catch (error) {
    console.error('Error in fetchFreeDecks:', error);
    // If there's an error, at least return the system decks
    return [rwDeck, sbDeck];
  }
};

/**
 * Fetches all user's created decks
 * @param userId The ID of the user
 * @returns Array of decks created by the user
 */
export const fetchUserCreatedDecks = async (userId: string): Promise<Deck[]> => {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        creator:users (username, email)
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching created decks:', error);
      throw error;
    }
    
    // Process data
    return data.map(deck => ({
      ...deck,
      creator_name: deck.creator?.username || deck.creator?.email?.split('@')[0] || 'You'
    }));
  } catch (error) {
    console.error('Error in fetchUserCreatedDecks:', error);
    return [];
  }
};

/**
 * Fetches all decks available to the user (created + free + purchased)
 * @param userId The ID of the user (optional for guests)
 * @returns Array of decks the user can access
 */
export const fetchUserOwnedDecks = async (userId?: string): Promise<Deck[]> => {
  try {
    let ownedDecks: Deck[] = [];
    
    // Always include free decks
    const freeDecks = await fetchFreeDecks();
    ownedDecks = [...freeDecks];
    
    // If user is authenticated, add their created decks
    if (userId) {
      const createdDecks = await fetchUserCreatedDecks(userId);
      // Add created decks that aren't already in the free decks list
      const uniqueCreatedDecks = createdDecks.filter(
        created => !ownedDecks.some(owned => owned.id === created.id)
      );
      ownedDecks = [...ownedDecks, ...uniqueCreatedDecks];
    }
    
    // TODO: Add purchased decks when purchase system is implemented
    // const purchasedDecks = await fetchUserPurchasedDecks(userId);
    // ownedDecks = [...ownedDecks, ...purchasedDecks];
    
    return ownedDecks;
  } catch (error) {
    console.error('Error in fetchUserOwnedDecks:', error);
    // If there's an error, at least return the system decks
    return [rwDeck, sbDeck];
  }
};