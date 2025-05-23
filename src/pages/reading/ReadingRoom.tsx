import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, MessageSquare, Video, PhoneCall, Zap, Link as LinkIcon, Users } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchDeckById, fetchCardsByDeckId } from '../../lib/deck-utils';
import { getReadingInterpretation } from '../../lib/gemini-ai';
import VideoChat from '../../components/video/VideoChat';
import JoinByLinkModal from '../../components/video/JoinByLinkModal';
import { supabase } from '../../lib/supabase';
import TarotLogo from '../../components/ui/TarotLogo';

// Mock reading layouts
const readingLayouts: ReadingLayout[] = [
  {
    id: 'three-card',
    name: 'Three Card Spread',
    description: 'Past, Present, Future reading to understand your current situation',
    card_count: 3,
    positions: [
      { id: 0, name: 'Past', meaning: 'Represents influences from the past that led to your current situation', x: 25, y: 50 },
      { id: 1, name: 'Present', meaning: 'Shows the current situation and energies surrounding your question', x: 50, y: 50 },
      { id: 2, name: 'Future', meaning: 'Potential outcome based on the current path you are on', x: 75, y: 50 }
    ]
  },
  {
    id: 'celtic-cross',
    name: 'Celtic Cross',
    description: 'Comprehensive reading that explores many aspects of your situation',
    card_count: 10,
    positions: [
      { id: 0, name: 'Present', meaning: 'Represents your current situation', x: 40, y: 45 },
      { id: 1, name: 'Challenge', meaning: 'What challenges or crosses your situation', x: 40, y: 45, rotation: 90 },
      { id: 2, name: 'Foundation', meaning: 'The foundation of your situation', x: 40, y: 75 },
      { id: 3, name: 'Recent Past', meaning: 'Events from the recent past', x: 25, y: 45 },
      { id: 4, name: 'Potential', meaning: 'Possible outcome if nothing changes', x: 40, y: 15 },
      { id: 5, name: 'Near Future', meaning: 'Events in the near future', x: 55, y: 45 },
      { id: 6, name: 'Self', meaning: 'How you view yourself', x: 75, y: 80 },
      { id: 7, name: 'Environment', meaning: 'How others view you or your environment', x: 75, y: 65 },
      { id: 8, name: 'Hopes/Fears', meaning: 'Your hopes and fears', x: 75, y: 50 },
      { id: 9, name: 'Outcome', meaning: 'The final outcome', x: 75, y: 35 }
    ]
  },
  {
    id: 'single-card',
    name: 'Single Card',
    description: 'Quick guidance for your day or a specific question',
    card_count: 1,
    positions: [
      { id: 0, name: 'Guidance', meaning: 'Offers insight or guidance for your question', x: 50, y: 50 }
    ]
  }
];

const ReadingRoom = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLayout, setSelectedLayout] = useState<ReadingLayout | null>(null);
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<(Card & { position: string; isReversed: boolean })[]>([]);
  const [question, setQuestion] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  
  const [readingStarted, setReadingStarted] = useState(false);
  const [readingComplete, setReadingComplete] = useState(false);
  const [interpretation, setInterpretation] = useState('');
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  const [showAIMode, setShowAIMode] = useState(false);
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Realtime session state
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(true);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Function to show the join by link modal
  const showJoinByLinkModal = () => {
    setShowJoinModal(true);
  };
  
  // Function to handle successful join
  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    navigate('/reading-room');
  };
  
  // Check for join parameter in URL on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinSessionId = params.get('join');
    
    if (joinSessionId) {
      setSessionId(joinSessionId);
      setShowVideoChat(true);
      
      // Also check for reading session ID
      const readingSessionParam = params.get('readingSession');
      if (readingSessionParam) {
        setReadingSessionId(readingSessionParam);
        setIsHost(false);
        joinReadingSession(readingSessionParam);
      }
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('join');
      if (readingSessionParam) {
        newUrl.searchParams.delete('readingSession');
      }
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [location.search]);
  
  // Fetch deck and cards data
  useEffect(() => {
    const fetchDeckData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const deckData = await fetchDeckById(deckId || 'rider-waite-classic');
        
        if (deckData) {
          setDeck(deckData);
          
          // Fetch cards for this deck
          const cardsData = await fetchCardsByDeckId(deckData.id);
          
          if (cardsData && cardsData.length > 0) {
            setCards(cardsData);
            setShuffledDeck([...cardsData].sort(() => Math.random() - 0.5));
          } else {
            throw new Error("No cards found for this deck");
          }
        } else {
          throw new Error("Deck not found");
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching deck data:', error);
        setError(error.message || "An error occurred loading the deck. Please try again.");
        setLoading(false);
      }
    };
    
    fetchDeckData();
  }, [deckId]);
  
  // Initialize or join a reading session
  useEffect(() => {
    if (readingSessionId) {
      // If we already have a session ID, join it
      joinReadingSession(readingSessionId);
    }
  }, [readingSessionId]);
  
  // Create a new reading session
  const createReadingSession = () => {
    // Generate a unique session ID
    const newSessionId = `reading_${Math.random().toString(36).substring(2, 15)}`;
    setReadingSessionId(newSessionId);
    setIsHost(true);
    
    // Create a Supabase Realtime channel
    const channel = supabase.channel(`reading:${newSessionId}`, {
      config: {
        broadcast: {
          self: true
        }
      }
    });
    
    // Subscribe to the channel
    channel
      .on('broadcast', { event: 'reading_state' }, (payload) => {
        handleReadingStateUpdate(payload);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        setParticipants(prev => [...new Set([...prev, ...newPresences.map((p: any) => p.user_id)])]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        setParticipants(prev => prev.filter(id => !leftPresences.some((p: any) => p.user_id === id)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user?.id || 'anonymous',
            username: user?.username || 'Anonymous',
            online_at: new Date().toISOString()
          });
          
          setRealtimeChannel(channel);
          setIsConnected(true);
          
          // Broadcast initial state
          broadcastReadingState({
            selectedLayout: selectedLayout,
            selectedCards: selectedCards,
            readingStarted: readingStarted,
            readingComplete: readingComplete,
            question: question
          });
        }
      });
      
    return newSessionId;
  };
  
  // Join an existing reading session
  const joinReadingSession = (sessionId: string) => {
    setReadingSessionId(sessionId);
    setIsHost(false);
    
    // Create a Supabase Realtime channel
    const channel = supabase.channel(`reading:${sessionId}`, {
      config: {
        broadcast: {
          self: true
        }
      }
    });
    
    // Subscribe to the channel
    channel
      .on('broadcast', { event: 'reading_state' }, (payload) => {
        handleReadingStateUpdate(payload);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        setParticipants(prev => [...new Set([...prev, ...newPresences.map((p: any) => p.user_id)])]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        setParticipants(prev => prev.filter(id => !leftPresences.some((p: any) => p.user_id === id)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user?.id || 'anonymous',
            username: user?.username || 'Anonymous',
            online_at: new Date().toISOString()
          });
          
          setRealtimeChannel(channel);
          setIsConnected(true);
          
          // Request current state
          channel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: {
              requesterId: user?.id || 'anonymous'
            }
          });
        }
      });
  };
  
  // Handle reading state updates from other participants
  const handleReadingStateUpdate = (payload: any) => {
    const { event, payload: data } = payload;
    
    if (event === 'reading_state') {
      // Update local state with received data
      if (data.selectedLayout && !isHost) {
        setSelectedLayout(data.selectedLayout);
      }
      
      if (data.selectedCards) {
        setSelectedCards(data.selectedCards);
      }
      
      if (data.readingStarted !== undefined) {
        setReadingStarted(data.readingStarted);
      }
      
      if (data.readingComplete !== undefined) {
        setReadingComplete(data.readingComplete);
      }
      
      if (data.question !== undefined && !isHost) {
        setQuestion(data.question);
      }
    } else if (event === 'request_state' && isHost) {
      // If we're the host and someone is requesting the current state, send it
      broadcastReadingState({
        selectedLayout,
        selectedCards,
        readingStarted,
        readingComplete,
        question
      });
    }
  };
  
  // Broadcast reading state to all participants
  const broadcastReadingState = (state: any) => {
    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'reading_state',
        payload: state
      });
    }
  };
  
  const handleLayoutSelect = (layout: ReadingLayout) => {
    setSelectedLayout(layout);
    setSelectedCards([]);
    setReadingStarted(false);
    setReadingComplete(false);
    setInterpretation('');
    
    // Broadcast the layout change
    if (readingSessionId && isHost) {
      broadcastReadingState({
        selectedLayout: layout,
        selectedCards: [],
        readingStarted: false,
        readingComplete: false
      });
    }
  };
  
  const shuffleDeck = () => {
    setShuffledDeck([...shuffledDeck].sort(() => Math.random() - 0.5));
  };
  
  const startReading = () => {
    if (!selectedLayout) return;
    
    setReadingStarted(true);
    setSelectedCards([]);
    setReadingComplete(false);
    setInterpretation('');
    
    // Broadcast the reading start
    if (readingSessionId && isHost) {
      broadcastReadingState({
        readingStarted: true,
        selectedCards: [],
        readingComplete: false
      });
    }
  };
  
  const handleCardSelection = () => {
    if (!selectedLayout || !shuffledDeck.length) return;
    
    const cardsNeeded = selectedLayout.card_count - selectedCards.length;
    if (cardsNeeded <= 0) return;
    
    const newSelectedCards = [...selectedCards];
    
    for (let i = 0; i < cardsNeeded; i++) {
      const position = selectedLayout.positions[newSelectedCards.length];
      const isReversed = Math.random() < 0.2;
      
      newSelectedCards.push({
        ...shuffledDeck[i],
        position: position.name,
        isReversed
      });
    }
    
    setSelectedCards(newSelectedCards);
    setShuffledDeck(shuffledDeck.slice(cardsNeeded));
    
    if (newSelectedCards.length === selectedLayout.card_count) {
      setReadingComplete(true);
    }
    
    // Broadcast the card selection
    if (readingSessionId) {
      broadcastReadingState({
        selectedCards: newSelectedCards,
        readingComplete: newSelectedCards.length === selectedLayout.card_count
      });
    }
  };
  
  const generateInterpretation = async () => {
    if (!deck || !selectedCards.length) return;
    
    try {
      setIsGeneratingInterpretation(true);
      
      const formattedCards = selectedCards.map(card => ({
        name: card.name,
        position: card.position,
        isReversed: card.isReversed
      }));
      
      const result = await getReadingInterpretation(
        question || 'General life guidance',
        formattedCards,
        deck.theme
      );
      
      setInterpretation(result);
      setShowAIMode(true);
    } catch (error) {
      console.error('Error generating interpretation:', error);
      setInterpretation('Unable to generate an interpretation at this time. Please try again later.');
    } finally {
      setIsGeneratingInterpretation(false);
    }
  };
  
  // Create a shareable link for the reading session
  const getReadingShareableLink = () => {
    if (!readingSessionId) {
      // Create a new session if one doesn't exist
      const newSessionId = createReadingSession();
      return `${window.location.origin}/reading-room/${deckId}?readingSession=${newSessionId}`;
    }
    
    return `${window.location.origin}/reading-room/${deckId}?readingSession=${readingSessionId}`;
  };
  
  // Copy the reading session link to clipboard
  const copyReadingLink = () => {
    const link = getReadingShareableLink();
    navigator.clipboard.writeText(link);
    // Show a toast or some feedback
    alert('Reading session link copied to clipboard!');
  };
  
  const initiateVideoChat = () => {
    setIsVideoConnecting(true);
    
    setTimeout(() => {
      setIsVideoConnecting(false);
      setShowVideoChat(true);
    }, 500);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing reading room...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <HelpCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-4">Something Went Wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/collection" className="btn btn-secondary px-6 py-2">
              My Collection
            </Link>
            <Link to="/marketplace" className="btn btn-primary px-6 py-2">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="py-8">
          <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Reading Room</h1>
              <p className="text-muted-foreground">
                {deck?.title ? `Using ${deck.title} by ${deck.creator_name}` : 'Select a deck to begin'}
                {deck?.is_free && (
                  <span className="inline-flex items-center ml-2 text-success">
                    <Zap className="h-4 w-4 mr-1" />
                    Free Deck
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <button 
                onClick={showJoinByLinkModal}
                className="btn btn-ghost border border-input px-4 py-2 flex items-center"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Join by Link
              </button>
              
              {readingSessionId ? (
                <button 
                  onClick={copyReadingLink}
                  className="btn btn-secondary px-4 py-2 flex items-center"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Reading
                </button>
              ) : (
                <button 
                  onClick={() => createReadingSession()}
                  className="btn btn-secondary px-4 py-2 flex items-center"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Create Shared Session
                </button>
              )}
              
              <button 
                onClick={() => !isVideoConnecting && !showVideoChat && initiateVideoChat()}
                className={`btn ${showVideoChat ? 'btn-success' : 'btn-secondary'} px-4 py-2 flex items-center`}
                disabled={isVideoConnecting}
              >
                {isVideoConnecting ? (
                  <>
                    <span className="mr-2 h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></span>
                    Connecting...
                  </>
                ) : showVideoChat ? (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    End Call
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Start Reading Call
                  </>
                )}
              </button>
              
              <button className="btn btn-secondary px-4 py-2 flex items-center">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </button>
              <button className="btn btn-primary px-4 py-2 flex items-center">
                <Save className="mr-2 h-4 w-4" />
                Save Reading
              </button>
            </div>
          </div>
        </div>
        
        {/* Participants indicator */}
        {readingSessionId && participants.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center">
            <Users className="h-5 w-5 text-primary mr-2" />
            <div>
              <h3 className="font-medium text-sm">Shared Reading Session</h3>
              <p className="text-xs text-muted-foreground">
                {participants.length} {participants.length === 1 ? 'person' : 'people'} in this session
                {isHost ? ' (You are the host)' : ''}
              </p>
            </div>
          </div>
        )}
        
        {/* Reading Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Layout Selection */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-serif font-bold mb-4">Reading Setup</h2>
              
              {!readingStarted ? (
                <>
                  {/* Layout selection */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-medium">Select a Layout</h3>
                    <div className="space-y-3">
                      {readingLayouts.map((layout) => (
                        <div 
                          key={layout.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedLayout?.id === layout.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-input hover:border-primary/50'
                          }`}
                          onClick={() => isHost ? handleLayoutSelect(layout) : null}
                          style={{ opacity: isHost ? 1 : 0.7 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{layout.name}</h4>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {layout.card_count} {layout.card_count === 1 ? 'card' : 'cards'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{layout.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Question input */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Your Question</h3>
                      <button 
                        className="text-xs text-primary"
                        onClick={() => setShowQuestion(!showQuestion)}
                      >
                        {showQuestion ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    {showQuestion && (
                      <textarea
                        value={question}
                        onChange={(e) => {
                          setQuestion(e.target.value);
                          // Broadcast question change if host
                          if (isHost && readingSessionId) {
                            broadcastReadingState({ question: e.target.value });
                          }
                        }}
                        placeholder="What would you like guidance on?"
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                        disabled={!isHost}
                      ></textarea>
                    )}
                  </div>
                  
                  {/* Start reading button */}
                  <button 
                    onClick={startReading}
                    disabled={!selectedLayout || !isHost}
                    className="w-full btn btn-primary py-2 flex items-center justify-center disabled:opacity-50"
                  >
                    Start Reading
                  </button>
                </>
              ) : (
                <>
                  {/* Reading info */}
                  <div className="mb-6">
                    <div className="bg-muted/30 rounded-lg p-3 mb-4">
                      <h3 className="font-medium mb-1">{selectedLayout?.name}</h3>
                
                      <p className="text-sm text-muted-foreground">{selectedLayout?.description}</p>
                    </div>
                    
                    {question && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-1">Your Question</h3>
                        <p className="text-sm italic">"{question}"</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {selectedCards.length} of {selectedLayout?.card_count} cards drawn
                      </span>
                      
                      <button 
                        onClick={shuffleDeck}
                        disabled={readingComplete}
                        className="btn btn-ghost p-2 text-sm flex items-center disabled:opacity-50"
                      >
                        <Shuffle className="mr-1 h-4 w-4" />
                        Shuffle
                      </button>
                    </div>
                  </div>
                  
                  {/* Card selection */}
                  {!readingComplete ? (
                    <div className="mb-6">
                      <button 
                        onClick={handleCardSelection}
                        disabled={!isHost}
                        className="w-full btn btn-primary py-2 flex items-center justify-center"
                      >
                        Draw Next Card
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* AI interpretation */}
                      <div className="mb-6">
                        <button 
                          onClick={generateInterpretation}
                          disabled={isGeneratingInterpretation}
                          className="w-full btn btn-primary py-2 flex items-center justify-center disabled:opacity-50"
                        >
                          {isGeneratingInterpretation ? (
                            <>
                              <span className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <TarotLogo className="mr-2 h-4 w-4" />
                              AI Interpretation
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Reset reading */}
                      <button 
                        onClick={() => {
                          setReadingStarted(false);
                          setReadingComplete(false);
                          setSelectedCards([]);
                          setInterpretation('');
                          setShuffledDeck([...cards].sort(() => Math.random() - 0.5));
                          
                          // Broadcast reset if host
                          if (isHost && readingSessionId) {
                            broadcastReadingState({
                              readingStarted: false,
                              readingComplete: false,
                              selectedCards: [],
                              selectedLayout: null
                            });
                          }
                        }}
                        disabled={!isHost}
                        className="w-full btn btn-ghost border border-input py-2"
                      >
                        Reset Reading
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Right Panel - Reading Display */}
          <div className="lg:col-span-2">
            {/* Video Chat - Only shown when active */}
            {showVideoChat && (
              <VideoChat 
                onClose={() => setShowVideoChat(false)}
                sessionId={sessionId}
              />
            )}
            
            {/* Reading board */}
            <div className="aspect-video bg-card/50 rounded-xl border border-border overflow-hidden relative mb-6">
              {/* Guidance */}
              {!readingStarted && (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-serif font-medium mb-2">Select a Layout to Begin</h3>
                  <p className="text-muted-foreground max-w-md">
                    Choose a card layout