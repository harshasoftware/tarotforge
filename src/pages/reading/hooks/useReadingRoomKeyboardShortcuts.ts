import { useEffect } from 'react';
import { Card, ReadingLayout } from '../../../types';
import { User } from '../../../stores/authStore'; // Assuming User type is exported
import { KEY_CODES, KEY_VALUES, getPlatformShortcut } from '../constants/shortcuts';
import { questionCategories as defaultQuestionCategories } from '../constants/questionCategories';

// Define a more specific type for readingStep if possible, using string for now
type ReadingStep = 'setup' | 'drawing' | 'interpretation' | 'ask-question' | string;

export interface ReadingRoomKeyboardShortcutsProps {
  // States read by the hook
  showCardGallery: boolean;
  showCardDescription: boolean;
  isMobile: boolean;
  readingStep: ReadingStep;
  zoomLevel: number;
  selectedLayout: ReadingLayout | null | undefined;
  deckId: string | undefined;
  user: User | null;
  selectedCards: Card[];
  showShareModal: boolean;
  showHelpModal: boolean;
  showExitModal: boolean;
  showSignInModal: boolean;
  showGuestUpgrade: boolean;
  isChangingDeckMidSession: boolean;
  showLayoutDropdown: boolean;
  highlightedLayoutIndex: number;
  highlightedSetupLayoutIndex: number;
  selectedCategory: string | null;
  highlightedCategoryIndex: number;
  generatedQuestions: string[];
  isLoadingQuestions: boolean;
  highlightedQuestionIndex: number;
  showCustomQuestionInput: boolean;
  isQuestionHighlightingActive: boolean; // Read by the hook
  isCategoryHighlightingActive: boolean; // Read by the hook
  sharedModalState: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null;
  } | null | undefined;
  participantId: string | null | undefined;

  // Callbacks used by the hook
  closeCardGallery: () => void;
  navigateGallery: (direction: 'prev' | 'next') => void;
  panDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  resetPan: () => void;
  shuffleDeck: () => void;
  toggleHelpModal: () => void;
  toggleTheme: () => void;
  setZoomLevelWrapped: (level: number) => void;
  getDefaultZoomLevel: (layout: ReadingLayout | null | undefined) => number;
  setZoomFocusWrapped: (focus: { x: number; y: number } | null) => void;
  openDeckSelection: () => void;
  setShowShareModal: (show: boolean) => void;
  setShowHelpModal: (show: boolean) => void;
  setShowExitModal: (show: boolean) => void;
  setShowSignInModal: (show: boolean) => void;
  setShowGuestUpgrade: (show: boolean) => void;
  setIsChangingDeckMidSession: (changing: boolean) => void;
  fetchAndSetDeck: (deckId: string) => Promise<void>;
  revealAllCards: () => void;
  resetCards: () => void;
  openCardGallery: (index: number) => void;
  setShowLayoutDropdown: (show: boolean) => void;
  setHighlightedLayoutIndex: (index: number) => void;
  setHighlightedSetupLayoutIndex: (index: number) => void;
  handleLayoutSelect: (layout: ReadingLayout) => void;
  readingLayouts: ReadingLayout[];
  handleCategorySelect: (category: string | null) => void; // Allow null for deselecting
  questionCategories: typeof defaultQuestionCategories;
  handleQuestionSelect: (question: string) => void;
  setGeneratedQuestions: (questions: string[]) => void;
  updateSharedModalState: (state: ReadingRoomKeyboardShortcutsProps['sharedModalState']) => void;
  setIsSpacePressed: (pressed: boolean) => void;
  setSelectedCategory: (category: string | null) => void; // Added for ESC in ask-question
  setHighlightedCategoryIndex: (updater: (prev: number) => number) => void; // Added to fix linter error
  setHighlightedQuestionIndex: (updater: (prev: number) => number) => void; // Added to fix linter error
  toggleMute: () => void;
}

export const useReadingRoomKeyboardShortcuts = (props: ReadingRoomKeyboardShortcutsProps) => {
  const {
    showCardGallery,
    showCardDescription,
    isMobile,
    readingStep,
    zoomLevel,
    selectedLayout,
    deckId,
    user,
    selectedCards,
    showShareModal,
    showHelpModal,
    showExitModal,
    showSignInModal,
    showGuestUpgrade,
    isChangingDeckMidSession,
    showLayoutDropdown,
    highlightedLayoutIndex,
    highlightedSetupLayoutIndex,
    selectedCategory,
    highlightedCategoryIndex,
    generatedQuestions,
    isLoadingQuestions,
    highlightedQuestionIndex,
    showCustomQuestionInput,
    isQuestionHighlightingActive,
    isCategoryHighlightingActive,
    sharedModalState,
    participantId,
    closeCardGallery,
    navigateGallery,
    panDirection,
    resetPan,
    shuffleDeck,
    toggleHelpModal,
    toggleTheme,
    setZoomLevelWrapped,
    getDefaultZoomLevel,
    setZoomFocusWrapped,
    openDeckSelection,
    setShowShareModal,
    setShowHelpModal,
    setShowExitModal,
    setShowSignInModal,
    setShowGuestUpgrade,
    setIsChangingDeckMidSession,
    fetchAndSetDeck,
    revealAllCards,
    resetCards,
    openCardGallery,
    setShowLayoutDropdown,
    setHighlightedLayoutIndex,
    setHighlightedSetupLayoutIndex,
    handleLayoutSelect,
    readingLayouts,
    handleCategorySelect,
    questionCategories,
    handleQuestionSelect,
    setGeneratedQuestions,
    updateSharedModalState,
    setIsSpacePressed,
    setSelectedCategory,
    setHighlightedCategoryIndex,
    setHighlightedQuestionIndex,
    toggleMute,
  } = props;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement &&
          (event.target.tagName === 'INPUT' ||
           event.target.tagName === 'TEXTAREA' ||
           event.target.contentEditable === 'true')) {
        return;
      }

      if (event.code === KEY_CODES.SPACE && !event.repeat && !isMobile) {
        setIsSpacePressed(true);
        event.preventDefault();
        return;
      }

      if (showCardGallery) {
        switch (event.key) {
          case KEY_VALUES.ESCAPE:
            if (showCardDescription && sharedModalState) {
              updateSharedModalState({
                ...sharedModalState,
                showDescription: false,
                triggeredBy: participantId || null
              });
            } else {
              closeCardGallery();
            }
            break;
          case KEY_VALUES.ARROW_LEFT:
            event.preventDefault();
            navigateGallery('prev');
            break;
          case KEY_VALUES.ARROW_RIGHT:
            event.preventDefault();
            navigateGallery('next');
            break;
        }
        return;
      }

      if (event.key === KEY_VALUES.ENTER && showExitModal && (readingStep === 'setup' || readingStep === 'drawing' || readingStep === 'interpretation')) {
        event.preventDefault();
        window.location.href = user ? '/collection' : '/';
        return;
      }

      if (event.key === KEY_VALUES.ESCAPE && (readingStep === 'setup' || readingStep === 'drawing' || readingStep === 'interpretation' || readingStep === 'ask-question')) {
        if (showShareModal) { setShowShareModal(false); event.preventDefault(); return; }
        if (showHelpModal) { setShowHelpModal(false); event.preventDefault(); return; }
        if (showExitModal) { setShowExitModal(false); event.preventDefault(); return; }
        if (showSignInModal) { setShowSignInModal(false); event.preventDefault(); return; }
        if (showGuestUpgrade) { setShowGuestUpgrade(false); event.preventDefault(); return; }
        if (isChangingDeckMidSession) {
          setIsChangingDeckMidSession(false);
          fetchAndSetDeck(deckId || 'rider-waite-classic');
          event.preventDefault();
          return;
        }
        setShowExitModal(true);
        event.preventDefault();
        return;
      }

      if (readingStep === 'setup') {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP:
            event.preventDefault();
            setHighlightedSetupLayoutIndex(highlightedSetupLayoutIndex > 0 ? highlightedSetupLayoutIndex - 1 : readingLayouts.length - 1);
            return;
          case KEY_VALUES.ARROW_DOWN:
            event.preventDefault();
            setHighlightedSetupLayoutIndex(highlightedSetupLayoutIndex < readingLayouts.length - 1 ? highlightedSetupLayoutIndex + 1 : 0);
            return;
          case KEY_VALUES.ENTER:
            event.preventDefault();
            if (readingLayouts[highlightedSetupLayoutIndex]) {
                handleLayoutSelect(readingLayouts[highlightedSetupLayoutIndex]);
            }
            return;
        }
      }

      if (readingStep === 'ask-question') {
        if (!selectedCategory && !showCustomQuestionInput) {
          switch (event.key) {
            case KEY_VALUES.ARROW_UP:
              event.preventDefault();
              setHighlightedCategoryIndex(prev => {
                const newIndex = prev - 2;
                return newIndex >= 0 ? newIndex : questionCategories.length + newIndex;
              });
              return;
            case KEY_VALUES.ARROW_DOWN:
              event.preventDefault();
              setHighlightedCategoryIndex(prev => {
                const newIndex = prev + 2;
                return newIndex < questionCategories.length ? newIndex : newIndex - questionCategories.length;
              });
              return;
            case KEY_VALUES.ARROW_LEFT:
              event.preventDefault();
              setHighlightedCategoryIndex(prev => prev > 0 ? prev - 1 : questionCategories.length - 1);
              return;
            case KEY_VALUES.ARROW_RIGHT:
              event.preventDefault();
              setHighlightedCategoryIndex(prev => prev < questionCategories.length - 1 ? prev + 1 : 0);
              return;
            case KEY_VALUES.ENTER:
              event.preventDefault();
              if (isCategoryHighlightingActive && questionCategories[highlightedCategoryIndex]) {
                handleCategorySelect(questionCategories[highlightedCategoryIndex].id);
              }
              return;
          }
        } else if (selectedCategory && generatedQuestions.length > 0 && !isLoadingQuestions && !showCustomQuestionInput) {
          switch (event.key) {
            case KEY_VALUES.ARROW_UP:
              event.preventDefault();
              setHighlightedQuestionIndex(prev => prev > 0 ? prev - 1 : generatedQuestions.length - 1);
              return;
            case KEY_VALUES.ARROW_DOWN:
              event.preventDefault();
              setHighlightedQuestionIndex(prev => prev < generatedQuestions.length - 1 ? prev + 1 : 0);
              return;
            case KEY_VALUES.ENTER:
              event.preventDefault();
              if (isQuestionHighlightingActive && generatedQuestions[highlightedQuestionIndex]) {
                handleQuestionSelect(generatedQuestions[highlightedQuestionIndex]);
              }
              return;
            case KEY_VALUES.ESCAPE: // Specific escape for this sub-state
              event.preventDefault();
              setSelectedCategory(null); // Changed from handleCategorySelect('') for clarity
              setGeneratedQuestions([]);
              setHighlightedQuestionIndex(prev => 0); // Use updater function for consistency
              // setIsQuestionHighlightingActive(true); // This state is controlled by parent for mouse, keyboard doesn't need to set it here.
              return;
          }
        }
      }

      if (showLayoutDropdown && readingStep === 'drawing') {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP:
            event.preventDefault();
            setHighlightedLayoutIndex(highlightedLayoutIndex > 0 ? highlightedLayoutIndex - 1 : readingLayouts.length - 1);
            break;
          case KEY_VALUES.ARROW_DOWN:
            event.preventDefault();
            setHighlightedLayoutIndex(highlightedLayoutIndex < readingLayouts.length - 1 ? highlightedLayoutIndex + 1 : 0);
            break;
          case KEY_VALUES.ENTER:
            event.preventDefault();
            if (readingLayouts[highlightedLayoutIndex]) {
                handleLayoutSelect(readingLayouts[highlightedLayoutIndex]);
            }
            setShowLayoutDropdown(false);
            break;
          case KEY_VALUES.ESCAPE:
            event.preventDefault();
            setShowLayoutDropdown(false);
            break;
        }
        return;
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP: event.preventDefault(); panDirection('up'); break;
          case KEY_VALUES.ARROW_DOWN: event.preventDefault(); panDirection('down'); break;
          case KEY_VALUES.ARROW_LEFT: event.preventDefault(); panDirection('left'); break;
          case KEY_VALUES.ARROW_RIGHT: event.preventDefault(); panDirection('right'); break;
          case KEY_VALUES.ENTER:
          case KEY_VALUES.C_LOWER:
            event.preventDefault(); resetPan(); break;
          case KEY_VALUES.PLUS:
          case KEY_VALUES.EQUALS:
            event.preventDefault(); setZoomLevelWrapped(Math.min(zoomLevel + 0.2, 3)); break;
          case KEY_VALUES.MINUS:
          case KEY_VALUES.UNDERSCORE:
            event.preventDefault(); setZoomLevelWrapped(Math.max(zoomLevel - 0.2, 0.5)); break;
          case KEY_VALUES.Z_LOWER:
            event.preventDefault();
            setZoomLevelWrapped(getDefaultZoomLevel(selectedLayout));
            setZoomFocusWrapped(null);
            break;
        }
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.code) {
          case KEY_CODES.SHIFT_LEFT:
            event.preventDefault();
            shuffleDeck();
            break;
        }
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.key) {
          case KEY_VALUES.R_LOWER:
            if (!event.metaKey && !event.ctrlKey) {
              const hasPlacedCards = selectedCards.some(card => !!card);
              const hasUnrevealedCards = selectedCards.some(card => card && !(card as any).revealed);
              if (hasPlacedCards && hasUnrevealedCards) {
                event.preventDefault();
                revealAllCards();
              }
            } else {
              const hasPlacedCards = selectedCards.some(card => !!card);
              if (hasPlacedCards) {
                event.preventDefault();
                resetCards();
              }
            }
            break;
        }
      }

      // General check to prevent shortcuts while typing in inputs/textareas
      const targetElement = event.target as HTMLElement;
      const isTyping = targetElement.tagName === 'INPUT' || 
                       targetElement.tagName === 'TEXTAREA' || 
                       targetElement.contentEditable === 'true';

      // If typing, and the key is not Escape or Enter (which might be needed for forms),
      // then don't process other shortcuts.
      if (isTyping && event.key !== KEY_VALUES.ESCAPE && event.key !== KEY_VALUES.ENTER) {
        return;
      }

      if (!isMobile) {
        switch (event.key) {
          case KEY_VALUES.F1:
            if (!navigator.platform.toLowerCase().includes('mac')) {
              event.preventDefault(); toggleHelpModal();
            }
            break;
          case KEY_VALUES.H_LOWER:
            if (navigator.platform.toLowerCase().includes('mac') || event.metaKey || event.ctrlKey) {
              event.preventDefault(); toggleHelpModal();
            }
            break;
          case KEY_VALUES.T_LOWER: event.preventDefault(); toggleTheme(); break;
          case KEY_VALUES.D_LOWER: event.preventDefault(); openDeckSelection(); break;
          case KEY_VALUES.V_LOWER:
            const hasPlacedCards = selectedCards.some(card => !!card);
            const allCardsRevealed = hasPlacedCards && selectedCards.every(card => !card || (card as any).revealed);
            if (allCardsRevealed && !showCardGallery) {
              event.preventDefault();
              const firstRevealedIndex = selectedCards.findIndex(card => card && (card as any).revealed);
              if (firstRevealedIndex !== -1) {
                openCardGallery(firstRevealedIndex);
              }
            }
            break;
          case KEY_VALUES.L_LOWER:
            if (readingStep === 'drawing') {
              event.preventDefault();
              if (!showLayoutDropdown) {
                const currentIndex = readingLayouts.findIndex(layout => layout.id === selectedLayout?.id);
                setHighlightedLayoutIndex(currentIndex >= 0 ? currentIndex : 0);
              }
              setShowLayoutDropdown(!showLayoutDropdown);
            }
            break;
          case KEY_VALUES.M_LOWER:
            if (!isTyping && !isMobile) {
              event.preventDefault();
              toggleMute();
            }
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === KEY_CODES.SPACE && !isMobile) {
        setIsSpacePressed(false);
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    showCardGallery, showCardDescription, isMobile, readingStep, zoomLevel, selectedLayout, deckId, user,
    selectedCards, showShareModal, showHelpModal, showExitModal, showSignInModal, showGuestUpgrade,
    isChangingDeckMidSession, showLayoutDropdown, highlightedLayoutIndex, highlightedSetupLayoutIndex,
    selectedCategory, highlightedCategoryIndex, generatedQuestions, isLoadingQuestions, highlightedQuestionIndex,
    showCustomQuestionInput, isQuestionHighlightingActive, isCategoryHighlightingActive, sharedModalState, participantId,
    closeCardGallery, navigateGallery, panDirection, resetPan, shuffleDeck, toggleHelpModal, toggleTheme,
    setZoomLevelWrapped, getDefaultZoomLevel, setZoomFocusWrapped, openDeckSelection, setShowShareModal,
    setShowHelpModal, setShowExitModal, setShowSignInModal, setShowGuestUpgrade, setIsChangingDeckMidSession,
    fetchAndSetDeck, revealAllCards, resetCards, openCardGallery, setShowLayoutDropdown, setHighlightedLayoutIndex,
    setHighlightedSetupLayoutIndex, handleLayoutSelect, readingLayouts, handleCategorySelect, questionCategories,
    handleQuestionSelect, setGeneratedQuestions, updateSharedModalState, setIsSpacePressed, setSelectedCategory,
    setHighlightedCategoryIndex,
    setHighlightedQuestionIndex,
    toggleMute,
  ]);
}; 