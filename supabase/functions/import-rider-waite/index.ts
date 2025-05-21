import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Define the card types and their corresponding metadata
interface TarotCard {
  name: string;
  description: string;
  image_url: string;
  card_type: 'major' | 'minor';
  suit?: string | null;
  keywords: string[];
  order: number;
}

// API response type
interface ApiResponse {
  success: boolean;
  message: string;
  deckId?: string;
  error?: string;
  cardsProcessed?: number;
}

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Only allow POST requests
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed. Please use POST.', 405);
  }

  try {
    // Get the request body
    const requestData = await req.json();
    
    // Optional parameters
    const { userId = null, createNew = true } = requestData;
    
    // Use the provided userId or create admin-owned deck
    const deckCreatorId = userId || '00000000-0000-0000-0000-000000000000'; // admin/system user ID

    // Prepare deck metadata
    const deckTitle = "Rider-Waite Tarot";
    const deckDescription = "The classic Rider-Waite tarot deck, illustrated by Pamela Colman Smith and published by the Rider Company in 1910. This iconic deck has become the standard for tarot readings worldwide.";
    
    let deckId: string;
    
    if (createNew) {
      // Create a new deck record
      const { data: newDeck, error: deckError } = await supabase
        .from('decks')
        .insert({
          creator_id: deckCreatorId,
          title: deckTitle,
          description: deckDescription,
          theme: 'classic',
          style: 'traditional',
          card_count: 78,
          price: 0,
          is_free: true,
          is_public: true,
          is_listed: true,
          is_nft: false,
          cover_image: '', // Will be updated after first card upload
          sample_images: [] // Will be populated after uploads
        })
        .select('id')
        .single();
      
      if (deckError) {
        return createErrorResponse(`Failed to create deck: ${deckError.message}`, 500);
      }
      
      deckId = newDeck.id;
    } else {
      // Check if a Rider-Waite deck already exists for this user ID
      const { data: existingDeck, error: findError } = await supabase
        .from('decks')
        .select('id')
        .eq('creator_id', deckCreatorId)
        .eq('title', deckTitle)
        .single();
        
      if (findError && findError.code !== 'PGRST116') {
        return createErrorResponse(`Error finding existing deck: ${findError.message}`, 500);
      }
      
      if (existingDeck) {
        deckId = existingDeck.id;
      } else {
        // Create a new deck if none exists
        const { data: newDeck, error: deckError } = await supabase
          .from('decks')
          .insert({
            creator_id: deckCreatorId,
            title: deckTitle,
            description: deckDescription,
            theme: 'classic',
            style: 'traditional',
            card_count: 78,
            price: 0,
            is_free: true,
            is_public: true,
            is_listed: true,
            is_nft: false,
            cover_image: '', // Will be updated after first card upload
            sample_images: [] // Will be populated after uploads
          })
          .select('id')
          .single();
        
        if (deckError) {
          return createErrorResponse(`Failed to create deck: ${deckError.message}`, 500);
        }
        
        deckId = newDeck.id;
      }
    }

    // Define the card data with URLs and metadata
    const majorArcana = [
      { 
        name: 'The Fool', 
        description: 'The Fool represents new beginnings, innocence, and spontaneity. It suggests taking a leap of faith without fear, embracing new opportunities with an open heart and mind.', 
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
        keywords: ['beginnings', 'innocence', 'spontaneity', 'freedom'],
        order: 0
      },
      {
        name: 'The Magician',
        description: 'The Magician represents manifestation, resourcefulness, and power. It suggests harnessing your skills and abilities to transform your ideas into reality.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
        keywords: ['manifestation', 'skill', 'power', 'concentration'],
        order: 1
      },
      {
        name: 'The High Priestess',
        description: 'The High Priestess represents intuition, mystery, and the subconscious mind. It suggests listening to your inner voice and acknowledging the unseen forces at work.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/RWS_Tarot_02_High_Priestess.jpg',
        keywords: ['intuition', 'subconscious', 'mystery', 'wisdom'],
        order: 2
      },
      {
        name: 'The Empress',
        description: 'The Empress represents fertility, nurturing, and abundance. It suggests a time of growth, creativity, and maternal energy in your life.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg',
        keywords: ['fertility', 'nurturing', 'abundance', 'creation'],
        order: 3
      },
      {
        name: 'The Emperor',
        description: 'The Emperor represents authority, structure, and leadership. It suggests establishing order, taking control, and building solid foundations.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg',
        keywords: ['authority', 'structure', 'control', 'leadership'],
        order: 4
      },
      {
        name: 'The Hierophant',
        description: 'The Hierophant represents tradition, conformity, and spiritual wisdom. It suggests seeking guidance from established institutions and respecting conventional approaches.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg',
        keywords: ['tradition', 'conformity', 'belief', 'education'],
        order: 5
      },
      {
        name: 'The Lovers',
        description: 'The Lovers represents love, harmony, and choices. It suggests significant relationships and important decisions that align with your values.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/RWS_Tarot_06_Lovers.jpg',
        keywords: ['love', 'choice', 'harmony', 'relationships'],
        order: 6
      },
      {
        name: 'The Chariot',
        description: 'The Chariot represents determination, willpower, and victory. It suggests moving forward with confidence, overcoming obstacles through focus and drive.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/RWS_Tarot_07_Chariot.jpg',
        keywords: ['determination', 'willpower', 'success', 'control'],
        order: 7
      },
      {
        name: 'Strength',
        description: 'Strength represents courage, patience, and inner strength. It suggests mastering challenges through gentle persistence rather than force.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg',
        keywords: ['courage', 'patience', 'compassion', 'inner strength'],
        order: 8
      },
      {
        name: 'The Hermit',
        description: 'The Hermit represents introspection, solitude, and inner guidance. It suggests a period of withdrawal to reflect and find wisdom within yourself.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg',
        keywords: ['introspection', 'solitude', 'guidance', 'reflection'],
        order: 9
      },
      {
        name: 'Wheel of Fortune',
        description: 'The Wheel of Fortune represents change, cycles, and destiny. It suggests that life is in flux, with fortunes rising and falling in a natural progression.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
        keywords: ['change', 'cycles', 'luck', 'destiny'],
        order: 10
      },
      {
        name: 'Justice',
        description: 'Justice represents fairness, truth, and law. It suggests that decisions and situations will be resolved in a just and balanced manner.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/RWS_Tarot_11_Justice.jpg',
        keywords: ['justice', 'fairness', 'truth', 'cause and effect'],
        order: 11
      },
      {
        name: 'The Hanged Man',
        description: 'The Hanged Man represents suspension, sacrifice, and new perspective. It suggests that surrendering control may lead to new insights and breakthroughs.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
        keywords: ['surrender', 'new perspective', 'sacrifice', 'waiting'],
        order: 12
      },
      {
        name: 'Death',
        description: 'Death represents transformation, endings, and rebirth. It suggests that a major phase is concluding to make way for something new, not a literal death.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg',
        keywords: ['transformation', 'endings', 'change', 'transition'],
        order: 13
      },
      {
        name: 'Temperance',
        description: 'Temperance represents balance, moderation, and patience. It suggests finding harmony through combining different elements and practicing self-restraint.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg',
        keywords: ['balance', 'moderation', 'patience', 'purpose'],
        order: 14
      },
      {
        name: 'The Devil',
        description: 'The Devil represents bondage, materialism, and shadow self. It suggests being trapped by unhealthy attachments or illusions of powerlessness.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg',
        keywords: ['bondage', 'materialism', 'addiction', 'restriction'],
        order: 15
      },
      {
        name: 'The Tower',
        description: 'The Tower represents sudden change, upheaval, and revelation. It suggests that established structures are crumbling to make way for new truth and understanding.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg',
        keywords: ['sudden change', 'upheaval', 'revelation', 'awakening'],
        order: 16
      },
      {
        name: 'The Star',
        description: 'The Star represents hope, inspiration, and serenity. It suggests a period of peace and faith after turbulence, with renewed optimism for the future.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg',
        keywords: ['hope', 'inspiration', 'serenity', 'renewal'],
        order: 17
      },
      {
        name: 'The Moon',
        description: 'The Moon represents illusion, fear, and the subconscious. It suggests navigating through uncertainty and facing hidden fears or deceptions.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg',
        keywords: ['illusion', 'fear', 'subconscious', 'intuition'],
        order: 18
      },
      {
        name: 'The Sun',
        description: 'The Sun represents joy, success, and vitality. It suggests a time of clarity, confidence, and positive outcomes in your endeavors.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg',
        keywords: ['joy', 'success', 'vitality', 'enlightenment'],
        order: 19
      },
      {
        name: 'Judgement',
        description: 'Judgement represents rebirth, inner calling, and absolution. It suggests a time of reckoning, self-evaluation, and answering a spiritual calling.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg',
        keywords: ['rebirth', 'inner calling', 'reckoning', 'awakening'],
        order: 20
      },
      {
        name: 'The World',
        description: 'The World represents completion, accomplishment, and fulfillment. It suggests the successful conclusion of a journey and wholeness in your life.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg',
        keywords: ['completion', 'achievement', 'fulfillment', 'wholeness'],
        order: 21
      }
    ];

    const cups = [
      {
        name: 'Ace of Cups',
        description: 'The Ace of Cups represents emotional new beginnings, intuition, and spirituality. It suggests the start of new relationships or deepened emotional connections.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Cups01.jpg',
        suit: 'cups',
        keywords: ['love', 'emotion', 'creativity', 'intuition'],
        order: 22
      },
      {
        name: 'Two of Cups',
        description: 'The Two of Cups represents partnership, mutual attraction, and harmony. It suggests balanced relationships and the union of two individuals or forces.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Cups02.jpg',
        suit: 'cups',
        keywords: ['partnership', 'connection', 'attraction', 'harmony'],
        order: 23
      },
      {
        name: 'Three of Cups',
        description: 'The Three of Cups represents celebration, friendship, and collaboration. It suggests joy shared with others and successful group efforts.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Cups03.jpg',
        suit: 'cups',
        keywords: ['celebration', 'friendship', 'community', 'joy'],
        order: 24
      },
      {
        name: 'Four of Cups',
        description: 'The Four of Cups represents contemplation, apathy, and reevaluation. It suggests being withdrawn and unable to see opportunities that are being offered.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Cups04.jpg',
        suit: 'cups',
        keywords: ['contemplation', 'apathy', 'reevaluation', 'dissatisfaction'],
        order: 25
      },
      {
        name: 'Five of Cups',
        description: 'The Five of Cups represents disappointment, regret, and focusing on loss. It suggests grief over what has been lost while overlooking what remains.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Cups05.jpg',
        suit: 'cups',
        keywords: ['disappointment', 'regret', 'loss', 'perspective'],
        order: 26
      },
      {
        name: 'Six of Cups',
        description: 'The Six of Cups represents nostalgia, childhood memories, and innocence. It suggests revisiting the past or reconnecting with old friends or simple pleasures.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Cups06.jpg',
        suit: 'cups',
        keywords: ['nostalgia', 'childhood', 'memories', 'innocence'],
        order: 27
      },
      {
        name: 'Seven of Cups',
        description: 'The Seven of Cups represents choices, fantasy, and illusion. It suggests being faced with many options but needing discernment to separate fantasy from reality.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Cups07.jpg',
        suit: 'cups',
        keywords: ['choices', 'fantasy', 'illusion', 'wishful thinking'],
        order: 28
      },
      {
        name: 'Eight of Cups',
        description: 'The Eight of Cups represents walking away, disillusionment, and seeking something more. It suggests leaving behind emotional investments to pursue greater fulfillment.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Cups08.jpg',
        suit: 'cups',
        keywords: ['walking away', 'disillusionment', 'leaving behind', 'moving on'],
        order: 29
      },
      {
        name: 'Nine of Cups',
        description: 'The Nine of Cups represents satisfaction, emotional fulfillment, and wishes coming true. It suggests contentment with your accomplishments and emotional well-being.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Cups09.jpg',
        suit: 'cups',
        keywords: ['satisfaction', 'contentment', 'wishes', 'gratitude'],
        order: 30
      },
      {
        name: 'Ten of Cups',
        description: 'The Ten of Cups represents harmony, happiness, and alignment. It suggests emotional fulfillment, particularly in family life and close relationships.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Cups10.jpg',
        suit: 'cups',
        keywords: ['harmony', 'family', 'happiness', 'fulfillment'],
        order: 31
      },
      {
        name: 'Page of Cups',
        description: 'The Page of Cups represents creative beginnings, intuitive messages, and curiosity. It suggests openness to new ideas and emotional insights.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Cups11.jpg',
        suit: 'cups',
        keywords: ['creativity', 'intuition', 'sensitivity', 'messenger'],
        order: 32
      },
      {
        name: 'Knight of Cups',
        description: 'The Knight of Cups represents romantic pursuit, imagination, and following one\'s heart. It suggests emotional quests and offering or pursuing love or artistic expression.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Cups12.jpg',
        suit: 'cups',
        keywords: ['romance', 'charm', 'imagination', 'pursuit'],
        order: 33
      },
      {
        name: 'Queen of Cups',
        description: 'The Queen of Cups represents compassion, emotional sensitivity, and intuition. It suggests nurturing others through emotional understanding and empathy.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Cups13.jpg',
        suit: 'cups',
        keywords: ['compassion', 'empathy', 'nurturing', 'intuition'],
        order: 34
      },
      {
        name: 'King of Cups',
        description: 'The King of Cups represents emotional balance, diplomatic leadership, and wisdom. It suggests mastery of emotions while still being compassionate and understanding.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Cups14.jpg',
        suit: 'cups',
        keywords: ['emotional balance', 'compassion', 'diplomacy', 'wisdom'],
        order: 35
      }
    ];

    const pentacles = [
      {
        name: 'Ace of Pentacles',
        description: 'The Ace of Pentacles represents new financial or material beginnings, prosperity, and potential. It suggests the start of new ventures that may lead to increased security and abundance.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Pents01.jpg',
        suit: 'pentacles',
        keywords: ['prosperity', 'abundance', 'opportunity', 'new venture'],
        order: 36
      },
      {
        name: 'Two of Pentacles',
        description: 'The Two of Pentacles represents balance, adaptability, and juggling priorities. It suggests managing multiple responsibilities or financial matters while maintaining flexibility.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Pents02.jpg',
        suit: 'pentacles',
        keywords: ['balance', 'adaptability', 'prioritization', 'juggling'],
        order: 37
      },
      {
        name: 'Three of Pentacles',
        description: 'The Three of Pentacles represents teamwork, collaboration, and skilled work. It suggests recognition for your skills and the value of working with others to create something lasting.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Pents03.jpg',
        suit: 'pentacles',
        keywords: ['teamwork', 'collaboration', 'skill', 'quality'],
        order: 38
      },
      {
        name: 'Four of Pentacles',
        description: 'The Four of Pentacles represents security, control, and conservation. It suggests holding on tightly to what you have, possibly to the point of being overly cautious or possessive.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents04.jpg',
        suit: 'pentacles',
        keywords: ['security', 'control', 'conservation', 'hoarding'],
        order: 39
      },
      {
        name: 'Five of Pentacles',
        description: 'The Five of Pentacles represents hardship, insecurity, and feeling excluded. It suggests material difficulty or feeling left out in the cold, but also the overlooked support that might be available.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Pents05.jpg',
        suit: 'pentacles',
        keywords: ['hardship', 'poverty', 'insecurity', 'exclusion'],
        order: 40
      },
      {
        name: 'Six of Pentacles',
        description: 'The Six of Pentacles represents generosity, charity, and giving/receiving. It suggests the exchange of resources, with focus on those who have giving to those in need.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents06.jpg',
        suit: 'pentacles',
        keywords: ['generosity', 'charity', 'giving', 'receiving'],
        order: 41
      },
      {
        name: 'Seven of Pentacles',
        description: 'The Seven of Pentacles represents patience, long-term view, and investment. It suggests evaluating the progress of your efforts and waiting for investments to bear fruit.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents07.jpg',
        suit: 'pentacles',
        keywords: ['patience', 'investment', 'growth', 'assessment'],
        order: 42
      },
      {
        name: 'Eight of Pentacles',
        description: 'The Eight of Pentacles represents diligence, skill development, and attention to detail. It suggests dedicating yourself to perfecting your craft through practice and hard work.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Pents08.jpg',
        suit: 'pentacles',
        keywords: ['diligence', 'skill', 'craftsmanship', 'mastery'],
        order: 43
      },
      {
        name: 'Nine of Pentacles',
        description: 'The Nine of Pentacles represents self-sufficiency, luxury, and independence. It suggests enjoying the fruits of your labor and achieving a level of material comfort through your own efforts.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Pents09.jpg',
        suit: 'pentacles',
        keywords: ['self-sufficiency', 'luxury', 'independence', 'accomplishment'],
        order: 44
      },
      {
        name: 'Ten of Pentacles',
        description: 'The Ten of Pentacles represents wealth, family legacy, and establishment. It suggests long-term success, financial security, and the building of something that will last for generations.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Pents10.jpg',
        suit: 'pentacles',
        keywords: ['wealth', 'legacy', 'family', 'inheritance'],
        order: 45
      },
      {
        name: 'Page of Pentacles',
        description: 'The Page of Pentacles represents opportunity, curiosity, and a studious approach. It suggests a practical and reliable person focused on learning skills that bring material results.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Pents11.jpg',
        suit: 'pentacles',
        keywords: ['opportunity', 'study', 'diligence', 'manifestation'],
        order: 46
      },
      {
        name: 'Knight of Pentacles',
        description: 'The Knight of Pentacles represents hard work, productivity, and reliability. It suggests methodical progress toward goals with unwavering determination and responsibility.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Pents12.jpg',
        suit: 'pentacles',
        keywords: ['hard work', 'reliability', 'routine', 'conservatism'],
        order: 47
      },
      {
        name: 'Queen of Pentacles',
        description: 'The Queen of Pentacles represents abundance, nurturing, and practicality. It suggests someone who creates material comfort and security through practical wisdom and earthy sensibility.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Pents13.jpg',
        suit: 'pentacles',
        keywords: ['nurturing', 'abundance', 'practicality', 'security'],
        order: 48
      },
      {
        name: 'King of Pentacles',
        description: 'The King of Pentacles represents wealth, business acumen, and stability. It suggests leadership through practical wisdom, financial success, and creating prosperity for others.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Pents14.jpg',
        suit: 'pentacles',
        keywords: ['wealth', 'stability', 'power', 'abundance'],
        order: 49
      }
    ];

    const swords = [
      {
        name: 'Ace of Swords',
        description: 'The Ace of Swords represents mental clarity, breakthrough insights, and truth. It suggests the beginning of intellectual understanding, cutting through confusion to find wisdom.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Swords01.jpg',
        suit: 'swords',
        keywords: ['clarity', 'truth', 'breakthrough', 'insight'],
        order: 50
      },
      {
        name: 'Two of Swords',
        description: 'The Two of Swords represents difficult choices, stalemate, and avoidance. It suggests being caught between conflicting options, often refusing to see or decide the way forward.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Swords02.jpg',
        suit: 'swords',
        keywords: ['decision', 'stalemate', 'avoidance', 'balance'],
        order: 51
      },
      {
        name: 'Three of Swords',
        description: 'The Three of Swords represents heartbreak, sorrow, and grief. It suggests painful truths, emotional wounds, and the suffering that comes from loss or betrayal.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Swords03.jpg',
        suit: 'swords',
        keywords: ['heartbreak', 'sorrow', 'grief', 'pain'],
        order: 52
      },
      {
        name: 'Four of Swords',
        description: 'The Four of Swords represents rest, recuperation, and contemplation. It suggests taking time away from conflict to heal, reflect, and prepare for future challenges.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Swords04.jpg',
        suit: 'swords',
        keywords: ['rest', 'recuperation', 'contemplation', 'retreat'],
        order: 53
      },
      {
        name: 'Five of Swords',
        description: 'The Five of Swords represents conflict, disagreement, and competition. It suggests winning at all costs, possibly facing the hollow victory of success at others\' expense.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Swords05.jpg',
        suit: 'swords',
        keywords: ['conflict', 'defeat', 'winning at a cost', 'dishonor'],
        order: 54
      },
      {
        name: 'Six of Swords',
        description: 'The Six of Swords represents transition, moving on, and gradual healing. It suggests leaving turbulent waters for calmer shores, often with help from others.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Swords06.jpg',
        suit: 'swords',
        keywords: ['transition', 'moving on', 'healing', 'passage'],
        order: 55
      },
      {
        name: 'Seven of Swords',
        description: 'The Seven of Swords represents deception, stealth, and strategy. It suggests acting in secrecy, possibly through dishonesty or clever maneuvering to avoid confrontation.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Swords07.jpg',
        suit: 'swords',
        keywords: ['deception', 'stealth', 'strategy', 'evasion'],
        order: 56
      },
      {
        name: 'Eight of Swords',
        description: 'The Eight of Swords represents restriction, imprisonment, and self-victimization. It suggests feeling trapped by circumstances but often unable to see available paths to freedom.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Swords08.jpg',
        suit: 'swords',
        keywords: ['restriction', 'imprisonment', 'victim mentality', 'limitation'],
        order: 57
      },
      {
        name: 'Nine of Swords',
        description: 'The Nine of Swords represents anxiety, nightmares, and mental anguish. It suggests overwhelming worry and fear, often worse at night or in isolation.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Swords09.jpg',
        suit: 'swords',
        keywords: ['anxiety', 'nightmares', 'worry', 'despair'],
        order: 58
      },
      {
        name: 'Ten of Swords',
        description: 'The Ten of Swords represents painful endings, betrayal, and rock bottom. It suggests the completion of a difficult cycle, hitting the lowest point before eventual renewal.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Swords10.jpg',
        suit: 'swords',
        keywords: ['endings', 'betrayal', 'rock bottom', 'recovery'],
        order: 59
      },
      {
        name: 'Page of Swords',
        description: 'The Page of Swords represents curiosity, mental energy, and new ideas. It suggests a sharp-minded person full of questions and intellectual vigor.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Swords11.jpg',
        suit: 'swords',
        keywords: ['curiosity', 'communication', 'intellect', 'vigilance'],
        order: 60
      },
      {
        name: 'Knight of Swords',
        description: 'The Knight of Swords represents action, assertiveness, and directness. It suggests swift, decisive movement toward goals, sometimes without full consideration of consequences.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Swords12.jpg',
        suit: 'swords',
        keywords: ['action', 'assertiveness', 'direct', 'impulsive'],
        order: 61
      },
      {
        name: 'Queen of Swords',
        description: 'The Queen of Swords represents clear thinking, intellectual independence, and unbiased judgment. It suggests someone who cuts through deception with truth and direct communication.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Swords13.jpg',
        suit: 'swords',
        keywords: ['clear thinking', 'independence', 'sharp mind', 'direct'],
        order: 62
      },
      {
        name: 'King of Swords',
        description: 'The King of Swords represents intellectual authority, truth, and logical thinking. It suggests leadership through clear communication, sound judgment, and ethical principles.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Swords14.jpg',
        suit: 'swords',
        keywords: ['authority', 'truth', 'logic', 'ethics'],
        order: 63
      }
    ];

    const wands = [
      {
        name: 'Ace of Wands',
        description: 'The Ace of Wands represents inspiration, new energy, and creative potential. It suggests the spark of a new idea or passion that could grow into something significant.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Wands01.jpg',
        suit: 'wands',
        keywords: ['inspiration', 'potential', 'new venture', 'creation'],
        order: 64
      },
      {
        name: 'Two of Wands',
        description: 'The Two of Wands represents future planning, personal power, and making decisions. It suggests standing at a crossroads, contemplating expansion while holding onto what is established.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands02.jpg',
        suit: 'wands',
        keywords: ['planning', 'power', 'decisions', 'worldliness'],
        order: 65
      },
      {
        name: 'Three of Wands',
        description: 'The Three of Wands represents expansion, foresight, and overseas opportunities. It suggests looking toward the horizon for future growth, with initial efforts already underway.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Wands03.jpg',
        suit: 'wands',
        keywords: ['expansion', 'foresight', 'commerce', 'exploration'],
        order: 66
      },
      {
        name: 'Four of Wands',
        description: 'The Four of Wands represents celebration, homecoming, and community. It suggests joyful gatherings, milestone achievements, and a sense of belonging and support.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Wands04.jpg',
        suit: 'wands',
        keywords: ['celebration', 'harmony', 'community', 'home'],
        order: 67
      },
      {
        name: 'Five of Wands',
        description: 'The Five of Wands represents competition, conflict, and rivalry. It suggests tension and challenges, often in the form of minor disagreements or competing interests.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Wands05.jpg',
        suit: 'wands',
        keywords: ['competition', 'conflict', 'diversity', 'tension'],
        order: 68
      },
      {
        name: 'Six of Wands',
        description: 'The Six of Wands represents victory, recognition, and pride. It suggests public acknowledgment of achievements, confidence, and success after overcoming challenges.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Wands06.jpg',
        suit: 'wands',
        keywords: ['victory', 'recognition', 'pride', 'progress'],
        order: 69
      },
      {
        name: 'Seven of Wands',
        description: 'The Seven of Wands represents defensiveness, protection, and standing your ground. It suggests defending your position against challengers or opposition.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Wands07.jpg',
        suit: 'wands',
        keywords: ['defensiveness', 'protection', 'perseverance', 'challenge'],
        order: 70
      },
      {
        name: 'Eight of Wands',
        description: 'The Eight of Wands represents speed, action, and movement. It suggests rapid developments, communications, and quick progress toward goals.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Wands08.jpg',
        suit: 'wands',
        keywords: ['speed', 'action', 'movement', 'communication'],
        order: 71
      },
      {
        name: 'Nine of Wands',
        description: 'The Nine of Wands represents resilience, courage, and persistence. It suggests standing firm despite fatigue, drawing on inner reserves for one final effort.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Tarot_Nine_of_Wands.jpg',
        suit: 'wands',
        keywords: ['resilience', 'courage', 'persistence', 'boundaries'],
        order: 72
      },
      {
        name: 'Ten of Wands',
        description: 'The Ten of Wands represents burden, responsibility, and hard work. It suggests carrying excessive obligations that may be overwhelming but are necessary to reach your destination.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands10.jpg',
        suit: 'wands',
        keywords: ['burden', 'responsibility', 'hard work', 'completion'],
        order: 73
      },
      {
        name: 'Page of Wands',
        description: 'The Page of Wands represents exploration, excitement, and discovery. It suggests a person full of enthusiasm and potential, ready for adventure and new experiences.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Wands11.jpg',
        suit: 'wands',
        keywords: ['exploration', 'excitement', 'discovery', 'free spirit'],
        order: 74
      },
      {
        name: 'Knight of Wands',
        description: 'The Knight of Wands represents energy, passion, and adventurousness. It suggests a person of action who charges ahead with confidence and enthusiasm.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands12.jpg',
        suit: 'wands',
        keywords: ['energy', 'passion', 'action', 'adventure'],
        order: 75
      },
      {
        name: 'Queen of Wands',
        description: 'The Queen of Wands represents confidence, determination, and social magnetism. It suggests a vibrant and passionate person who inspires others with their enthusiasm.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Wands13.jpg',
        suit: 'wands',
        keywords: ['confidence', 'determination', 'charisma', 'energy'],
        order: 76
      },
      {
        name: 'King of Wands',
        description: 'The King of Wands represents vision, leadership, and honor. It suggests someone who inspires others through bold action, creative thinking, and unwavering integrity.',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands14.jpg',
        suit: 'wands',
        keywords: ['vision', 'leadership', 'inspiration', 'bold action'],
        order: 77
      }
    ];

    // Create combined card array
    const allCards = [...majorArcana, ...cups, ...pentacles, ...swords, ...wands];
    
    // Array to hold sample images for the deck
    const sampleImages: string[] = [];
    
    // Function to download and upload an image to Supabase storage
    async function processImageAndUpload(card: TarotCard): Promise<string> {
      try {
        // Fetch the image from Wikimedia
        const response = await fetch(card.image_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        // Get the image as a blob
        const imageBlob = await response.blob();
        
        // Create a sanitized filename
        const sanitizedName = card.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_');
        
        // Get the file extension from the URL
        const urlParts = card.image_url.split('.');
        const extension = urlParts[urlParts.length - 1].toLowerCase();
        
        // Upload to Supabase Storage
        const filePath = `${deckId}/${sanitizedName}.${extension}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('card-images')
          .upload(filePath, imageBlob, {
            contentType: `image/${extension}`,
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          throw new Error(`Error uploading to storage: ${uploadError.message}`);
        }
        
        // Get the public URL of the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('card-images')
          .getPublicUrl(filePath);
        
        return publicUrl;
      } catch (error) {
        console.error(`Error processing image for ${card.name}:`, error);
        // Fall back to the original URL if there's an error
        return card.image_url;
      }
    }

    // Process cards in batches
    const batchSize = 5; // Process 5 cards at a time to avoid overwhelming the function
    let cardsProcessed = 0;
    let coverImageUrl = ''; // Will hold the first card's uploaded image URL
    
    for (let i = 0; i < allCards.length; i += batchSize) {
      const batch = allCards.slice(i, i + batchSize);
      
      // Process each card in the batch concurrently
      const processedBatch = await Promise.all(
        batch.map(async (card) => {
          // Download and upload each image
          const storedImageUrl = await processImageAndUpload(card);
          
          // If this is a major card and we don't have enough sample images, add it
          if (card.card_type === 'major' && sampleImages.length < 3) {
            sampleImages.push(storedImageUrl);
          }
          
          // If this is the first card, use it as the cover image
          if (i === 0 && card.name === 'The Fool') {
            coverImageUrl = storedImageUrl;
          }
          
          return {
            deck_id: deckId,
            name: card.name,
            description: card.description,
            image_url: storedImageUrl,
            card_type: card.name.includes('of ') ? 'minor' : 'major',
            suit: card.suit || null,
            keywords: card.keywords,
            order: card.order
          };
        })
      );
      
      // Insert the processed batch
      const { error: cardsError } = await supabase
        .from('cards')
        .upsert(processedBatch, { onConflict: 'deck_id,name' });
      
      if (cardsError) {
        return createErrorResponse(`Failed to insert cards batch ${i / batchSize + 1}: ${cardsError.message}`, 500);
      }
      
      cardsProcessed += batch.length;
      
      // Update the deck with cover image and sample images after first batch
      if (i === 0 && coverImageUrl) {
        const { error: updateDeckError } = await supabase
          .from('decks')
          .update({
            cover_image: coverImageUrl,
            sample_images: sampleImages
          })
          .eq('id', deckId);
          
        if (updateDeckError) {
          console.error('Error updating deck with images:', updateDeckError);
        }
      }
    }
    
    // Final update to the deck to ensure cover and sample images are set
    if (coverImageUrl) {
      const { error: finalUpdateError } = await supabase
        .from('decks')
        .update({
          cover_image: coverImageUrl,
          sample_images: sampleImages
        })
        .eq('id', deckId);
        
      if (finalUpdateError) {
        console.error('Error in final deck update:', finalUpdateError);
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created Rider-Waite tarot deck with ${cardsProcessed} cards and stored images in S3.`,
        deckId: deckId,
        cardsProcessed
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    console.error('Error in import process:', error);
    return createErrorResponse(`Server error: ${error.message}`, 500);
  }
});

// Helper function to create error responses
function createErrorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message,
      error: message
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}