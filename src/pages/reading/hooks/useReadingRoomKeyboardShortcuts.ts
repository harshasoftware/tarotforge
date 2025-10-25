import { useEffect, useRef } from 'react';
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
  isMuted?: boolean; // Optional: to show current state in help if needed
  toggleMute?: () => void;

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
  setHighlightedQuestionIndex: (value: number | ((prev: number) => number)) => void; 
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
    isMuted,
    toggleMute,
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
    setHighlightedCategoryIndex, // Added to fix linter error
    setHighlightedQuestionIndex, // Added to fix linter error
  } = props;

  // Create refs for all callback functions to avoid stale closures
  const closeCardGalleryRef = useRef(closeCardGallery);
  const navigateGalleryRef = useRef(navigateGallery);
  const panDirectionRef = useRef(panDirection);
  const resetPanRef = useRef(resetPan);
  const shuffleDeckRef = useRef(shuffleDeck);
  const toggleHelpModalRef = useRef(toggleHelpModal);
  const toggleThemeRef = useRef(toggleTheme);
  const setZoomLevelWrappedRef = useRef(setZoomLevelWrapped);
  const getDefaultZoomLevelRef = useRef(getDefaultZoomLevel);
  const setZoomFocusWrappedRef = useRef(setZoomFocusWrapped);
  const openDeckSelectionRef = useRef(openDeckSelection);
  const setShowShareModalRef = useRef(setShowShareModal);
  const setShowHelpModalRef = useRef(setShowHelpModal);
  const setShowExitModalRef = useRef(setShowExitModal);
  const setShowSignInModalRef = useRef(setShowSignInModal);
  const setShowGuestUpgradeRef = useRef(setShowGuestUpgrade);
  const setIsChangingDeckMidSessionRef = useRef(setIsChangingDeckMidSession);
  const fetchAndSetDeckRef = useRef(fetchAndSetDeck);
  const revealAllCardsRef = useRef(revealAllCards);
  const resetCardsRef = useRef(resetCards);
  const openCardGalleryRef = useRef(openCardGallery);
  const setShowLayoutDropdownRef = useRef(setShowLayoutDropdown);
  const setHighlightedLayoutIndexRef = useRef(setHighlightedLayoutIndex);
  const setHighlightedSetupLayoutIndexRef = useRef(setHighlightedSetupLayoutIndex);
  const handleLayoutSelectRef = useRef(handleLayoutSelect);
  const handleCategorySelectRef = useRef(handleCategorySelect);
  const handleQuestionSelectRef = useRef(handleQuestionSelect);
  const setGeneratedQuestionsRef = useRef(setGeneratedQuestions);
  const updateSharedModalStateRef = useRef(updateSharedModalState);
  const setIsSpacePressedRef = useRef(setIsSpacePressed);
  const setSelectedCategoryRef = useRef(setSelectedCategory);
  const setHighlightedCategoryIndexRef = useRef(setHighlightedCategoryIndex);
  const setHighlightedQuestionIndexRef = useRef(setHighlightedQuestionIndex);
  const toggleMuteRef = useRef(toggleMute);

  // Create refs for complex objects/arrays that are only used for actions, not conditionals
  const sharedModalStateRef = useRef(sharedModalState);
  const participantIdRef = useRef(participantId);
  const selectedLayoutRef = useRef(selectedLayout);
  const userRef = useRef(user);
  const deckIdRef = useRef(deckId);
  const selectedCardsRef = useRef(selectedCards);
  const readingLayoutsRef = useRef(readingLayouts);
  const questionCategoriesRef = useRef(questionCategories);
  const generatedQuestionsRef = useRef(generatedQuestions);

  // Update refs whenever callbacks change (outside useEffect to avoid stale closures)
  closeCardGalleryRef.current = closeCardGallery;
  navigateGalleryRef.current = navigateGallery;
  panDirectionRef.current = panDirection;
  resetPanRef.current = resetPan;
  shuffleDeckRef.current = shuffleDeck;
  toggleHelpModalRef.current = toggleHelpModal;
  toggleThemeRef.current = toggleTheme;
  setZoomLevelWrappedRef.current = setZoomLevelWrapped;
  getDefaultZoomLevelRef.current = getDefaultZoomLevel;
  setZoomFocusWrappedRef.current = setZoomFocusWrapped;
  openDeckSelectionRef.current = openDeckSelection;
  setShowShareModalRef.current = setShowShareModal;
  setShowHelpModalRef.current = setShowHelpModal;
  setShowExitModalRef.current = setShowExitModal;
  setShowSignInModalRef.current = setShowSignInModal;
  setShowGuestUpgradeRef.current = setShowGuestUpgrade;
  setIsChangingDeckMidSessionRef.current = setIsChangingDeckMidSession;
  fetchAndSetDeckRef.current = fetchAndSetDeck;
  revealAllCardsRef.current = revealAllCards;
  resetCardsRef.current = resetCards;
  openCardGalleryRef.current = openCardGallery;
  setShowLayoutDropdownRef.current = setShowLayoutDropdown;
  setHighlightedLayoutIndexRef.current = setHighlightedLayoutIndex;
  setHighlightedSetupLayoutIndexRef.current = setHighlightedSetupLayoutIndex;
  handleLayoutSelectRef.current = handleLayoutSelect;
  handleCategorySelectRef.current = handleCategorySelect;
  handleQuestionSelectRef.current = handleQuestionSelect;
  setGeneratedQuestionsRef.current = setGeneratedQuestions;
  updateSharedModalStateRef.current = updateSharedModalState;
  setIsSpacePressedRef.current = setIsSpacePressed;
  setSelectedCategoryRef.current = setSelectedCategory;
  setHighlightedCategoryIndexRef.current = setHighlightedCategoryIndex;
  setHighlightedQuestionIndexRef.current = setHighlightedQuestionIndex;
  toggleMuteRef.current = toggleMute;

  // Update refs for complex objects/arrays
  sharedModalStateRef.current = sharedModalState;
  participantIdRef.current = participantId;
  selectedLayoutRef.current = selectedLayout;
  userRef.current = user;
  deckIdRef.current = deckId;
  selectedCardsRef.current = selectedCards;
  readingLayoutsRef.current = readingLayouts;
  questionCategoriesRef.current = questionCategories;
  generatedQuestionsRef.current = generatedQuestions;

  useEffect(() => {
    console.log('[KEYBOARD-SHORTCUTS] Adding keydown listener', {
      timestamp: new Date().toISOString(),
      showCardGallery,
      showLayoutDropdown,
      isMobile
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('[KEYBOARD-SHORTCUTS] keydown event fired', {
        key: event.key,
        code: event.code,
        showCardGallery,
        showLayoutDropdown
      });

      if (event.target instanceof HTMLElement &&
          (event.target.tagName === 'INPUT' ||
           event.target.tagName === 'TEXTAREA' ||
           event.target.contentEditable === 'true')) {
        console.log('[KEYBOARD-SHORTCUTS] Ignoring - target is input/textarea');
        return;
      }

      if (event.code === KEY_CODES.SPACE && !event.repeat && !isMobile) {
        setIsSpacePressedRef.current(true);
        event.preventDefault();
        return;
      }

      if (showCardGallery) {
        switch (event.key) {
          case KEY_VALUES.ESCAPE:
            if (showCardDescription && sharedModalStateRef.current) {
              updateSharedModalStateRef.current({
                ...sharedModalStateRef.current,
                showDescription: false,
                triggeredBy: participantIdRef.current || null
              });
            } else {
              closeCardGalleryRef.current();
            }
            break;
          case KEY_VALUES.ARROW_LEFT:
            event.preventDefault();
            navigateGalleryRef.current('prev');
            break;
          case KEY_VALUES.ARROW_RIGHT:
            event.preventDefault();
            navigateGalleryRef.current('next');
            break;
        }
        return;
      }

      if (event.key === KEY_VALUES.ENTER && showExitModal && (readingStep === 'setup' || readingStep === 'drawing' || readingStep === 'interpretation')) {
        event.preventDefault();
        window.location.href = userRef.current ? '/collection' : '/';
        return;
      }

      if (event.key === KEY_VALUES.ESCAPE && (readingStep === 'setup' || readingStep === 'drawing' || readingStep === 'interpretation' || readingStep === 'ask-question')) {
        if (showShareModal) { setShowShareModalRef.current(false); event.preventDefault(); return; }
        if (showHelpModal) { setShowHelpModalRef.current(false); event.preventDefault(); return; }
        if (showExitModal) { setShowExitModalRef.current(false); event.preventDefault(); return; }
        if (showSignInModal) { setShowSignInModalRef.current(false); event.preventDefault(); return; }
        if (showGuestUpgrade) { setShowGuestUpgradeRef.current(false); event.preventDefault(); return; }
        if (isChangingDeckMidSession) {
          setIsChangingDeckMidSessionRef.current(false);
          fetchAndSetDeckRef.current(deckIdRef.current || 'rider-waite-classic');
          event.preventDefault();
          return;
        }
        setShowExitModalRef.current(true);
        event.preventDefault();
        return;
      }

      if (readingStep === 'setup') {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP:
            event.preventDefault();
            setHighlightedSetupLayoutIndexRef.current(highlightedSetupLayoutIndex > 0 ? highlightedSetupLayoutIndex - 1 : readingLayoutsRef.current.length - 1);
            return;
          case KEY_VALUES.ARROW_DOWN:
            event.preventDefault();
            setHighlightedSetupLayoutIndexRef.current(highlightedSetupLayoutIndex < readingLayoutsRef.current.length - 1 ? highlightedSetupLayoutIndex + 1 : 0);
            return;
          case KEY_VALUES.ENTER:
            event.preventDefault();
            if (readingLayoutsRef.current[highlightedSetupLayoutIndex]) {
                handleLayoutSelectRef.current(readingLayoutsRef.current[highlightedSetupLayoutIndex]);
            }
            return;
        }
      }

      if (readingStep === 'ask-question') {
        if (!selectedCategory && !showCustomQuestionInput) {
          switch (event.key) {
            case KEY_VALUES.ARROW_UP:
              event.preventDefault();
              setHighlightedCategoryIndexRef.current(prev => {
                const newIndex = prev - 2;
                return newIndex >= 0 ? newIndex : questionCategoriesRef.current.length + newIndex;
              });
              return;
            case KEY_VALUES.ARROW_DOWN:
              event.preventDefault();
              setHighlightedCategoryIndexRef.current(prev => {
                const newIndex = prev + 2;
                return newIndex < questionCategoriesRef.current.length ? newIndex : newIndex - questionCategoriesRef.current.length;
              });
              return;
            case KEY_VALUES.ARROW_LEFT:
              event.preventDefault();
              setHighlightedCategoryIndexRef.current(prev => prev > 0 ? prev - 1 : questionCategoriesRef.current.length - 1);
              return;
            case KEY_VALUES.ARROW_RIGHT:
              event.preventDefault();
              setHighlightedCategoryIndexRef.current(prev => prev < questionCategoriesRef.current.length - 1 ? prev + 1 : 0);
              return;
            case KEY_VALUES.ENTER:
              event.preventDefault();
              if (isCategoryHighlightingActive && questionCategoriesRef.current[highlightedCategoryIndex]) {
                handleCategorySelectRef.current(questionCategoriesRef.current[highlightedCategoryIndex].id);
              }
              return;
          }
        } else if (selectedCategory && generatedQuestions.length > 0 && !isLoadingQuestions && !showCustomQuestionInput) {
          switch (event.key) {
            case KEY_VALUES.ARROW_UP:
              event.preventDefault();
              setHighlightedQuestionIndexRef.current(prev => prev > 0 ? prev - 1 : generatedQuestionsRef.current.length - 1);
              return;
            case KEY_VALUES.ARROW_DOWN:
              event.preventDefault();
              setHighlightedQuestionIndexRef.current(prev => prev < generatedQuestionsRef.current.length - 1 ? prev + 1 : 0);
              return;
            case KEY_VALUES.ENTER:
              event.preventDefault();
              if (isQuestionHighlightingActive && generatedQuestionsRef.current[highlightedQuestionIndex]) {
                handleQuestionSelectRef.current(generatedQuestionsRef.current[highlightedQuestionIndex]);
              }
              return;
            case KEY_VALUES.ESCAPE: // Specific escape for this sub-state
              event.preventDefault();
              setSelectedCategoryRef.current(null); // Changed from handleCategorySelect('') for clarity
              setGeneratedQuestionsRef.current([]);
              setHighlightedQuestionIndexRef.current(prev => 0); // Use updater function for consistency
              // setIsQuestionHighlightingActive(true); // This state is controlled by parent for mouse, keyboard doesn't need to set it here.
              return;
          }
        }
      }

      if (showLayoutDropdown && readingStep === 'drawing') {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP:
            event.preventDefault();
            setHighlightedLayoutIndexRef.current(highlightedLayoutIndex > 0 ? highlightedLayoutIndex - 1 : readingLayoutsRef.current.length - 1);
            break;
          case KEY_VALUES.ARROW_DOWN:
            event.preventDefault();
            setHighlightedLayoutIndexRef.current(highlightedLayoutIndex < readingLayoutsRef.current.length - 1 ? highlightedLayoutIndex + 1 : 0);
            break;
          case KEY_VALUES.ENTER:
            event.preventDefault();
            if (readingLayoutsRef.current[highlightedLayoutIndex]) {
                handleLayoutSelectRef.current(readingLayoutsRef.current[highlightedLayoutIndex]);
            }
            setShowLayoutDropdownRef.current(false);
            break;
          case KEY_VALUES.ESCAPE:
            event.preventDefault();
            setShowLayoutDropdownRef.current(false);
            break;
        }
        return;
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.key) {
          case KEY_VALUES.ARROW_UP: event.preventDefault(); panDirectionRef.current('up'); break;
          case KEY_VALUES.ARROW_DOWN: event.preventDefault(); panDirectionRef.current('down'); break;
          case KEY_VALUES.ARROW_LEFT: event.preventDefault(); panDirectionRef.current('left'); break;
          case KEY_VALUES.ARROW_RIGHT: event.preventDefault(); panDirectionRef.current('right'); break;
          case KEY_VALUES.ENTER:
          case KEY_VALUES.C_LOWER:
            event.preventDefault(); resetPanRef.current(); break;
          case KEY_VALUES.PLUS:
          case KEY_VALUES.EQUALS:
            event.preventDefault(); setZoomLevelWrappedRef.current(Math.min(zoomLevel + 0.2, 3)); break;
          case KEY_VALUES.MINUS:
          case KEY_VALUES.UNDERSCORE:
            event.preventDefault(); setZoomLevelWrappedRef.current(Math.max(zoomLevel - 0.2, 0.5)); break;
          case KEY_VALUES.Z_LOWER:
            event.preventDefault();
            setZoomLevelWrappedRef.current(getDefaultZoomLevelRef.current(selectedLayoutRef.current));
            setZoomFocusWrappedRef.current(null);
            break;
        }
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.code) {
          case KEY_CODES.SHIFT_LEFT:
            event.preventDefault();
            shuffleDeckRef.current();
            break;
        }
      }

      if (!isMobile && (readingStep === 'drawing' || readingStep === 'interpretation')) {
        switch (event.key) {
          case KEY_VALUES.R_LOWER:
            if (!event.metaKey && !event.ctrlKey) {
              const hasPlacedCards = selectedCardsRef.current.some(card => !!card);
              const hasUnrevealedCards = selectedCardsRef.current.some(card => card && !(card as any).revealed);
              if (hasPlacedCards && hasUnrevealedCards) {
                event.preventDefault();
                revealAllCardsRef.current();
              }
            } else {
              const hasPlacedCards = selectedCardsRef.current.some(card => !!card);
              if (hasPlacedCards) {
                event.preventDefault();
                resetCardsRef.current();
              }
            }
            break;
        }
      }

      if (!isMobile) {
        switch (event.key) {
          case KEY_VALUES.F1:
            if (!navigator.platform.toLowerCase().includes('mac')) {
              event.preventDefault(); toggleHelpModalRef.current();
            }
            break;
          case KEY_VALUES.H_LOWER:
            if (navigator.platform.toLowerCase().includes('mac') || event.metaKey || event.ctrlKey) {
              event.preventDefault(); toggleHelpModalRef.current();
            }
            break;
          case KEY_VALUES.T_LOWER: event.preventDefault(); toggleThemeRef.current(); break;
          case KEY_VALUES.D_LOWER: event.preventDefault(); openDeckSelectionRef.current(); break;
          case KEY_VALUES.V_LOWER:
            const hasPlacedCards = selectedCardsRef.current.some(card => !!card);
            const allCardsRevealed = hasPlacedCards && selectedCardsRef.current.every(card => !card || (card as any).revealed);
            if (allCardsRevealed && !showCardGallery) {
              event.preventDefault();
              const firstRevealedIndex = selectedCardsRef.current.findIndex(card => card && (card as any).revealed);
              if (firstRevealedIndex !== -1) {
                openCardGalleryRef.current(firstRevealedIndex);
              }
            }
            break;
          case KEY_VALUES.L_LOWER:
            if (readingStep === 'drawing') {
              event.preventDefault();
              if (!showLayoutDropdown) {
                const currentIndex = readingLayoutsRef.current.findIndex(layout => layout.id === selectedLayoutRef.current?.id);
                setHighlightedLayoutIndexRef.current(currentIndex >= 0 ? currentIndex : 0);
              }
              setShowLayoutDropdownRef.current(!showLayoutDropdown);
            }
            break;
          case KEY_VALUES.M_LOWER:
            if (toggleMuteRef.current) {
              event.preventDefault();
              toggleMuteRef.current();
            }
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === KEY_CODES.SPACE && !isMobile) {
        setIsSpacePressedRef.current(false);
        event.preventDefault();
      }
    };

    console.log('[KEYBOARD-SHORTCUTS] Registering event listeners');
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[KEYBOARD-SHORTCUTS] Cleanup - removing event listeners', {
        timestamp: new Date().toISOString()
      });
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    // ONLY primitive/boolean state values that are checked in conditionals
    // All callbacks and complex objects/arrays are handled via refs to prevent constant re-running

    // Boolean flags checked in conditionals
    showCardGallery,
    showCardDescription,
    isMobile,
    showShareModal,
    showHelpModal,
    showExitModal,
    showSignInModal,
    showGuestUpgrade,
    isChangingDeckMidSession,
    showLayoutDropdown,
    showCustomQuestionInput,
    isCategoryHighlightingActive,
    isQuestionHighlightingActive,
    isLoadingQuestions,

    // String/primitive values checked in conditionals
    readingStep,
    selectedCategory,

    // Numeric values used in comparisons
    highlightedLayoutIndex,
    highlightedSetupLayoutIndex,
    highlightedCategoryIndex,
    highlightedQuestionIndex,
    zoomLevel,

    // Array length checked (but array accessed via ref)
    generatedQuestions.length,
  ]);
}; 