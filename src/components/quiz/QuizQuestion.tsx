import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '../../types';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  userAnswer: number | null;
  onAnswerSelect: (answer: number) => void;
  showResults?: boolean;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  userAnswer,
  onAnswerSelect,
  showResults = false
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
        {showResults ? (
          userAnswer === question.correctAnswer ? (
            <span className="flex items-center text-success text-sm">
              <Check className="h-4 w-4 mr-1" />
              Correct
            </span>
          ) : (
            <span className="flex items-center text-destructive text-sm">
              <X className="h-4 w-4 mr-1" />
              Incorrect
            </span>
          )
        ) : null}
      </div>
      
      <h2 className="text-lg font-medium mb-4">{question.question}</h2>
      
      <div className="space-y-3 mb-4">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => !showResults && onAnswerSelect(index)}
            className={`w-full text-left p-3 rounded-md transition-colors ${
              userAnswer === index
                ? showResults
                  ? index === question.correctAnswer
                    ? 'bg-success/20 border border-success/50'
                    : 'bg-destructive/20 border border-destructive/50'
                  : 'bg-primary/20 border border-primary/50'
                : showResults && index === question.correctAnswer
                  ? 'bg-success/20 border border-success/50'
                  : 'bg-card hover:bg-secondary/50 border border-border'
            } ${
              showResults ? 'cursor-default' : 'cursor-pointer'
            }`}
            disabled={showResults}
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full mr-3 flex items-center justify-center ${
                userAnswer === index
                  ? showResults
                    ? index === question.correctAnswer
                      ? 'bg-success text-success-foreground'
                      : 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                  : showResults && index === question.correctAnswer
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {showResults ? (
                  index === question.correctAnswer ? (
                    <Check className="h-4 w-4" />
                  ) : userAnswer === index ? (
                    <X className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + index) // A, B, C, D
                  )
                ) : (
                  String.fromCharCode(65 + index) // A, B, C, D
                )}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Explanation shown only in results view */}
      {showResults && question.explanation && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-3 bg-muted/30 rounded-md"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <h4 className="text-sm font-medium mb-1">Explanation</h4>
              <p className="text-sm">{question.explanation}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuizQuestion;