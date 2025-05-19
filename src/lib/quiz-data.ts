import type { QuizQuestion } from '../types';

/**
 * Sample quiz questions for the tarot reader certification
 * These are used as fallback when AI-generated questions aren't available
 */
export const sampleQuizQuestions: QuizQuestion[] = [
  {
    id: 0,
    question: "What is the traditional meaning of The Fool?",
    options: ["Endings", "New beginnings", "Confusion", "Success"],
    correctAnswer: 1,
    explanation: "The Fool traditionally represents new beginnings, innocence, and stepping into the unknown."
  },
  {
    id: 1,
    question: "Which suit in the Minor Arcana is associated with emotions and relationships?",
    options: ["Wands", "Cups", "Swords", "Pentacles"],
    correctAnswer: 1,
    explanation: "Cups represent emotions, relationships, intuition, and the water element."
  },
  {
    id: 2,
    question: "What does the Death card typically symbolize in tarot?",
    options: ["Physical death", "Transformation and change", "Bad luck", "Financial loss"],
    correctAnswer: 1,
    explanation: "The Death card primarily symbolizes transformation, endings, and new beginnings—rarely literal death."
  },
  {
    id: 3,
    question: "How many cards are in a traditional Rider-Waite tarot deck?",
    options: ["72", "78", "52", "64"],
    correctAnswer: 1,
    explanation: "A traditional tarot deck contains 78 cards: 22 Major Arcana and 56 Minor Arcana."
  },
  {
    id: 4,
    question: "Which of these is considered a Celtic Cross position?",
    options: ["The Crown", "The Root", "The Crossing", "The Sun"],
    correctAnswer: 2,
    explanation: "The Crossing (or what crosses the querent) is a position in the Celtic Cross spread representing challenges."
  },
  {
    id: 5,
    question: "What does it mean when a card appears reversed in a reading?",
    options: [
      "The meaning is the opposite of the upright card",
      "The card's energy is blocked, delayed, or internalized",
      "The card should be ignored",
      "The reading should be restarted"
    ],
    correctAnswer: 1,
    explanation: "Reversed cards typically indicate blocked or internalized energy of the card's meaning, not simply the opposite."
  },
  {
    id: 6,
    question: "Which of the following is NOT a traditional element associated with tarot suits?",
    options: ["Fire", "Water", "Earth", "Lightning"],
    correctAnswer: 3,
    explanation: "The traditional elements in tarot are Fire (Wands), Water (Cups), Air (Swords), and Earth (Pentacles)."
  },
  {
    id: 7,
    question: "What is the ethical approach when reading a concerning health issue in tarot?",
    options: [
      "Make a precise medical diagnosis",
      "Suggest specific medical treatments",
      "Recommend they speak to a medical professional",
      "Promise a cure through spiritual means"
    ],
    correctAnswer: 2,
    explanation: "Ethical readers should never diagnose or treat medical conditions and should advise consulting healthcare professionals."
  },
  {
    id: 8,
    question: "What does the Seven of Cups typically represent?",
    options: [
      "Clarity and focus",
      "Celebration and joy",
      "Illusions and choices",
      "Success and achievement"
    ],
    correctAnswer: 2,
    explanation: "The Seven of Cups typically represents illusions, choices, dreams, and fantasies."
  },
  {
    id: 9,
    question: "The High Priestess card is primarily associated with:",
    options: [
      "Authority and structure",
      "Intuition and the subconscious",
      "Fertility and abundance",
      "Balance and moderation"
    ],
    correctAnswer: 1,
    explanation: "The High Priestess represents intuition, the subconscious mind, mystery, and hidden knowledge."
  },
  {
    id: 10,
    question: "What is the 'Shadow Side' in tarot reading?",
    options: [
      "Reading only with reversed cards",
      "The repressed or unconscious aspects of self",
      "Reading in darkened rooms",
      "Using black candles during readings"
    ],
    correctAnswer: 1,
    explanation: "The Shadow Side refers to the repressed, unconscious, or denied aspects of ourselves that can be revealed through tarot."
  },
  {
    id: 11,
    question: "Which card traditionally represents balance and moderation?",
    options: ["Justice", "Temperance", "The Star", "The Hermit"],
    correctAnswer: 1,
    explanation: "Temperance represents balance, moderation, patience, and finding the middle path between extremes."
  },
  {
    id: 12,
    question: "In the Rider-Waite tradition, what animal is commonly featured on The Moon card?",
    options: ["Eagles", "Lions", "Wolves and dogs", "Horses"],
    correctAnswer: 2,
    explanation: "The Moon card typically features a wolf and a dog, representing the wild and tame aspects of our instinctual nature."
  },
  {
    id: 13,
    question: "What should you do if a client asks you to predict the exact date of someone's death?",
    options: [
      "Provide your best prediction",
      "Charge extra for this specialized reading",
      "Explain that this is beyond tarot's ethical boundaries",
      "Use astrology instead of tarot for this question"
    ],
    correctAnswer: 2,
    explanation: "Ethical tarot practice avoids predictions about death, health diagnoses, or other potentially harmful specifics."
  },
  {
    id: 14,
    question: "Which of these spreads would be most appropriate for a general life overview?",
    options: ["Yes/No spread", "Celtic Cross", "Three-card spread", "Relationship spread"],
    correctAnswer: 1,
    explanation: "The Celtic Cross is comprehensive enough to provide insight into many aspects of the querent's life situation."
  }
];

/**
 * Get quiz questions based on difficulty level
 * @param count Number of questions to return
 * @param difficulty Difficulty level
 * @returns Array of quiz questions
 */
export const getQuizQuestions = (count: number = 10, difficulty: string = 'novice'): QuizQuestion[] => {
  // For now, just return the sample questions
  // In a real implementation, you would have different question pools for different difficulty levels
  return sampleQuizQuestions.slice(0, count);
};