import { Deck, Card } from '../types';

// Rider-Waite Tarot Deck with Wikimedia Commons images
// All images are public domain, created by Pamela Colman Smith

export const riderWaiteDeck: Deck = {
  id: 'rider-waite',
  creator_id: 'public-domain',
  creator_name: 'Pamela Colman Smith',
  title: 'Rider-Waite Tarot',
  description: 'The classic Rider-Waite tarot deck, illustrated by Pamela Colman Smith under the direction of Arthur Edward Waite. This iconic deck has defined the imagery of tarot for generations.',
  theme: 'traditional',
  style: 'classic',
  card_count: 78,
  price: 0,
  is_free: true,
  is_public: true,
  is_listed: true,
  cover_image: 'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
  sample_images: [
    'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg'
  ],
  created_at: '1909-12-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  purchase_count: 5000,
  rating: 4.9,
  attribution: 'Pamela Colman Smith, Public domain, via Wikimedia Commons'
};

// Major Arcana Cards
export const majorArcanaCards: Card[] = [
  {
    id: 'rw-major-00',
    deck_id: 'rider-waite',
    name: 'The Fool',
    description: 'New beginnings, innocence, spontaneity, a free spirit, taking a leap of faith into the unknown.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
    card_type: 'major',
    keywords: ['beginnings', 'innocence', 'adventure', 'potential'],
    order: 0
  },
  {
    id: 'rw-major-01',
    deck_id: 'rider-waite',
    name: 'The Magician',
    description: 'Manifestation, resourcefulness, power, inspired action, creation, taking control of your destiny.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
    card_type: 'major',
    keywords: ['manifestation', 'power', 'action', 'creation'],
    order: 1
  },
  {
    id: 'rw-major-02',
    deck_id: 'rider-waite',
    name: 'The High Priestess',
    description: 'Intuition, unconscious knowledge, inner voice, divine feminine, the mysteries of the unknown.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg',
    card_type: 'major',
    keywords: ['intuition', 'mystery', 'spirituality', 'higher power'],
    order: 2
  },
  {
    id: 'rw-major-03',
    deck_id: 'rider-waite',
    name: 'The Empress',
    description: 'Fertility, femininity, beauty, nature, abundance, nurturing, sensuality, creative expression.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg',
    card_type: 'major',
    keywords: ['abundance', 'nurturing', 'fertility', 'creativity'],
    order: 3
  },
  {
    id: 'rw-major-04',
    deck_id: 'rider-waite',
    name: 'The Emperor',
    description: 'Authority, establishment, structure, a father figure, leadership, stability, protection.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg',
    card_type: 'major',
    keywords: ['authority', 'structure', 'control', 'leadership'],
    order: 4
  },
  {
    id: 'rw-major-05',
    deck_id: 'rider-waite',
    name: 'The Hierophant',
    description: 'Spiritual wisdom, tradition, conformity, morality, ethics, religious beliefs, education.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg',
    card_type: 'major',
    keywords: ['tradition', 'spiritual wisdom', 'conformity', 'education'],
    order: 5
  },
  {
    id: 'rw-major-06',
    deck_id: 'rider-waite',
    name: 'The Lovers',
    description: 'Love, harmony, relationships, value alignment, choices, union, desire, passion, temptation.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/RWS_Tarot_06_Lovers.jpg',
    card_type: 'major',
    keywords: ['love', 'harmony', 'choices', 'relationships'],
    order: 6
  },
  {
    id: 'rw-major-07',
    deck_id: 'rider-waite',
    name: 'The Chariot',
    description: 'Control, willpower, victory, assertion, determination, focus, action, overcoming obstacles.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg',
    card_type: 'major',
    keywords: ['willpower', 'control', 'victory', 'determination'],
    order: 7
  },
  {
    id: 'rw-major-08',
    deck_id: 'rider-waite',
    name: 'Strength',
    description: 'Courage, inner strength, compassion, patience, soft control, resilience, persuasion.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg',
    card_type: 'major',
    keywords: ['courage', 'strength', 'patience', 'compassion'],
    order: 8
  },
  {
    id: 'rw-major-09',
    deck_id: 'rider-waite',
    name: 'The Hermit',
    description: 'Introspection, solitude, inner guidance, contemplation, searching for deeper truth, wisdom.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg',
    card_type: 'major',
    keywords: ['introspection', 'solitude', 'guidance', 'wisdom'],
    order: 9
  },
  {
    id: 'rw-major-10',
    deck_id: 'rider-waite',
    name: 'Wheel of Fortune',
    description: 'Good luck, karma, cycles, destiny, a turning point, change, fate, fortune, unexpected events.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg',
    card_type: 'major',
    keywords: ['fate', 'cycles', 'destiny', 'change'],
    order: 10
  },
  {
    id: 'rw-major-11',
    deck_id: 'rider-waite',
    name: 'Justice',
    description: 'Fairness, truth, cause and effect, law, clarity, objectivity, integrity, accountability.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg',
    card_type: 'major',
    keywords: ['justice', 'fairness', 'truth', 'consequences'],
    order: 11
  },
  {
    id: 'rw-major-12',
    deck_id: 'rider-waite',
    name: 'The Hanged Man',
    description: 'Surrender, letting go, new perspectives, suspension, sacrifice, waiting, insight, enlightenment.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
    card_type: 'major',
    keywords: ['sacrifice', 'perspective', 'surrender', 'suspension'],
    order: 12
  },
  {
    id: 'rw-major-13',
    deck_id: 'rider-waite',
    name: 'Death',
    description: 'Endings, change, transformation, transition, letting go, powerful movement, evolution.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg',
    card_type: 'major',
    keywords: ['transformation', 'endings', 'change', 'transition'],
    order: 13
  },
  {
    id: 'rw-major-14',
    deck_id: 'rider-waite',
    name: 'Temperance',
    description: 'Balance, moderation, patience, purpose, harmony, synthesis, unity, finding middle ground.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg',
    card_type: 'major',
    keywords: ['balance', 'moderation', 'harmony', 'patience'],
    order: 14
  },
  {
    id: 'rw-major-15',
    deck_id: 'rider-waite',
    name: 'The Devil',
    description: 'Shadow self, attachment, addiction, restriction, power, materialism, bondage, fear, temptation.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg',
    card_type: 'major',
    keywords: ['bondage', 'materialism', 'temptation', 'fear'],
    order: 15
  },
  {
    id: 'rw-major-16',
    deck_id: 'rider-waite',
    name: 'The Tower',
    description: 'Sudden change, revelation, upheaval, chaos, awakening, truth, disruption, liberation.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg',
    card_type: 'major',
    keywords: ['chaos', 'sudden change', 'revelation', 'awakening'],
    order: 16
  },
  {
    id: 'rw-major-17',
    deck_id: 'rider-waite',
    name: 'The Star',
    description: 'Hope, faith, purpose, renewal, inspiration, serenity, healing, optimism, connection to the divine.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg',
    card_type: 'major',
    keywords: ['hope', 'inspiration', 'renewal', 'healing'],
    order: 17
  },
  {
    id: 'rw-major-18',
    deck_id: 'rider-waite',
    name: 'The Moon',
    description: 'Illusion, fear, anxiety, confusion, subconscious, intuition, unknown depths, dreams, emotions.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg',
    card_type: 'major',
    keywords: ['illusion', 'fear', 'subconscious', 'intuition'],
    order: 18
  },
  {
    id: 'rw-major-19',
    deck_id: 'rider-waite',
    name: 'The Sun',
    description: 'Success, joy, abundance, vitality, enlightenment, warmth, positivity, clarity, energy.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg',
    card_type: 'major',
    keywords: ['joy', 'success', 'vitality', 'enlightenment'],
    order: 19
  },
  {
    id: 'rw-major-20',
    deck_id: 'rider-waite',
    name: 'Judgement',
    description: 'Reflection, reckoning, awakening, rebirth, inner calling, absolution, atonement, forgiveness.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg',
    card_type: 'major',
    keywords: ['rebirth', 'inner calling', 'absolution', 'awakening'],
    order: 20
  },
  {
    id: 'rw-major-21',
    deck_id: 'rider-waite',
    name: 'The World',
    description: 'Completion, integration, accomplishment, fulfillment, wholeness, harmony, unity, infinite possibility.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg',
    card_type: 'major',
    keywords: ['completion', 'accomplishment', 'wholeness', 'unity'],
    order: 21
  }
]; 