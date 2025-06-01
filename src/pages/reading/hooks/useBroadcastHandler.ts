import { useEffect } from 'react';
import { Card } from '../../../types';
import { useReadingSessionStore } from '../../../stores/readingSessionStore';
import { showParticipantNotification } from '../../../utils/toast';

interface BroadcastHandlerProps {
  sessionId: string | undefined | null;
  participantId: string | undefined | null;
  setShuffledDeck: (deck: Card[] | ((prevDeck: Card[]) => Card[])) => void;
  setIsShuffling: (isShuffling: boolean) => void;
  setIsGeneratingInterpretation: (isGenerating: boolean) => void;
  setPanOffsetWrapped: (offset: { x: number; y: number }) => void;
  setDeckRefreshKey: (updater: (prev: number) => number) => void;
  setShowMobileInterpretation: (show: boolean) => void;
  setInterpretationCards: (cards: any[]) => void;
}

/**
 * @hook useBroadcastHandler
 * @description React hook to handle broadcasted actions from other participants in a reading session.
 * This hook subscribes to a broadcast channel and updates the local state based on actions received from other users.
 * It is responsible for keeping the UI in sync across different participants' devices.
 * This hook does not return any value.
 *
 * @param {BroadcastHandlerProps} props - The properties for the hook.
 * @param {string | undefined | null} props.sessionId - The ID of the current reading session.
 * @param {string | undefined | null} props.participantId - The ID of the current participant.
 * @param {function(deck: Card[] | ((prevDeck: Card[]) => Card[])): void} props.setShuffledDeck - Setter function to update the shuffled deck of cards.
 * @param {function(isShuffling: boolean): void} props.setIsShuffling - Setter function to control the shuffling animation state.
 * @param {function(isGenerating: boolean): void} props.setIsGeneratingInterpretation - Setter function to control the interpretation generation state.
 * @param {function(offset: { x: number; y: number }): void} props.setPanOffsetWrapped - Setter function to update the pan offset of the card area.
 * @param {function(updater: (prev: number) => number): void} props.setDeckRefreshKey - Setter function to trigger a refresh of the deck display.
 * @param {function(show: boolean): void} props.setShowMobileInterpretation - Setter function to control the visibility of the interpretation view on mobile.
 * @param {function(cards: any[]): void} props.setInterpretationCards - Setter function to update the cards used for interpretation.
 */
export const useBroadcastHandler = ({
  sessionId,
  participantId,
  setShuffledDeck,
  setIsShuffling,
  setIsGeneratingInterpretation,
  setPanOffsetWrapped,
  setDeckRefreshKey,
  setShowMobileInterpretation,
  setInterpretationCards,
}: BroadcastHandlerProps) => {
  useEffect(() => {
    if (!sessionId) return;

    const handleBroadcast = (payload: any) => {
      const { action, data, participantId: senderParticipantId } = payload.payload;

      // Only process if this isn't from ourselves
      if (senderParticipantId !== participantId) {
        console.log('Received broadcast action:', { action, data, from: senderParticipantId });

        switch (action) {
          case 'updateShuffledDeck':
            if (data.shuffledDeck) {
              console.log('Updating shuffled deck from broadcast:', data.shuffledDeck.length, 'cards remaining');
              setShuffledDeck(data.shuffledDeck);
            }
            break;
          case 'shuffleDeck':
            if (data.shuffledDeck) {
              console.log('Shuffling deck from broadcast:', data.shuffledDeck.length, 'cards');
              setShuffledDeck(data.shuffledDeck);
              setDeckRefreshKey(prev => prev + 1); // Force deck visual refresh
            }
            break;
          case 'startShuffling':
            console.log('Starting shuffle animation from broadcast');
            setIsShuffling(true);
            break;
          case 'stopShuffling':
            console.log('Stopping shuffle animation from broadcast');
            setIsShuffling(false);
            break;
          case 'startGeneratingInterpretation':
            console.log('Starting interpretation generation from broadcast');
            setIsGeneratingInterpretation(true);
            break;
          case 'stopGeneratingInterpretation':
            console.log('Stopping interpretation generation from broadcast');
            setIsGeneratingInterpretation(false);
            break;
          case 'resetReading':
            if (data.shuffledDeck) {
              console.log('Resetting reading from broadcast');
              setShuffledDeck(data.shuffledDeck);
              setShowMobileInterpretation(false);
              setInterpretationCards([]);
              setDeckRefreshKey(prev => prev + 1);
            }
            break;
          case 'resetCards':
            if (data.shuffledDeck) {
              console.log('Resetting cards from broadcast');
              setShuffledDeck(data.shuffledDeck);
              setShowMobileInterpretation(false);
              setInterpretationCards([]);
              setDeckRefreshKey(prev => prev + 1);
              
              if (data.participantName) {
                showParticipantNotification({
                  type: 'deck-cleared',
                  participantName: data.participantName,
                  isAnonymous: data.isAnonymous || false
                });
              }
            }
            break;
          case 'resetPan':
            if (data.panOffset) {
              console.log('Resetting pan from broadcast');
              setPanOffsetWrapped(data.panOffset);
            }
            break;
        }
      }
    };

    const channel = useReadingSessionStore.getState().channel;
    if (channel) {
      const subscription = channel.on('broadcast', { event: 'guest_action' }, handleBroadcast);
      
      // The main store cleanup handles channel unsubscription.
      // Supabase channels don't have individual event removal for 'broadcast' with specific event names like 'guest_action'.
      // We rely on the component unmounting and the readingSessionStore's cleanup.
      // If we needed to unsubscribe this specific listener, we'd need to manage subscriptions differently,
      // possibly by storing the subscription object and calling channel.off(subscription).
      // For now, this is consistent with the original logic.
      return () => {
        // Example if direct unsubscription was needed:
        // if (subscription && typeof channel.off === 'function') {
        //   channel.off(subscription);
        // }
      };
    }
  }, [sessionId, participantId, setShuffledDeck, setIsShuffling, setIsGeneratingInterpretation, setPanOffsetWrapped, setDeckRefreshKey, setShowMobileInterpretation, setInterpretationCards]);
}; 