import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Keyboard, Navigation, BookOpen, Lightbulb, Users
} from 'lucide-react';
import { getPlatformShortcut } from '../../constants/shortcuts'; // Adjust path as necessary

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  // We can pass specific shortcut strings if they vary or keep getPlatformShortcut internal
}

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Keyboard shortcuts data - could be passed as props or defined here if static
  const shortcuts = [
    { label: 'Pan view', keys: 'Space + Drag' },
    { label: 'Pan up', keys: '↑' },
    { label: 'Pan down', keys: '↓' },
    { label: 'Pan left', keys: '←' },
    { label: 'Pan right', keys: '→' },
    { label: 'Navigate categories/layouts/questions', keys: '↑ ↓ ← →' },
    { label: 'Select item', keys: 'Enter' },
    { label: 'Pan to center', keys: 'C' },
    { label: 'Shuffle deck', keys: 'Left Shift' },
    { label: 'Zoom in', keys: '+ / =' },
    { label: 'Zoom out', keys: '- / _' },
    { label: 'Reset zoom', keys: 'Z' },
    { label: 'Zoom (mouse)', keys: getPlatformShortcut('ctrlOrCmd') + ' + Scroll' },
    { label: 'Navigate gallery', keys: '← →' },
    { label: 'Close gallery/modal', keys: 'Esc' },
    { label: 'Show help', keys: getPlatformShortcut('helpKey') }, // Use a generic key like 'helpKey'
    { label: 'Toggle theme', keys: 'T' },
    { label: 'Change deck', keys: 'D' },
    { label: 'Select layout', keys: 'L' },
    { label: 'Invite others', keys: 'I' },
    { label: 'Reveal all cards', keys: 'R' },
    { label: 'Reset cards', keys: getPlatformShortcut('resetCardsKey') }, // Use a generic key
    { label: 'View card details', keys: 'V' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            className="relative bg-card max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
              <h3 className="font-serif font-bold text-xl">TarotForge Reading Room Guide</h3>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-primary" />
                    Keyboard Shortcuts
                  </h4>
                  <div className="space-y-3">
                    {shortcuts.map(sc => (
                      <div key={sc.label} className="flex justify-between items-center">
                        <span className="text-sm">{sc.label}</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{sc.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    Navigation & Controls
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">Zoom Controls</div>
                      <div className="text-xs text-muted-foreground">Use zoom buttons or {getPlatformShortcut('ctrlOrCmd')}+Scroll. Pan with Space+Drag or arrow keys.</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">Card Interaction</div>
                      <div className="text-xs text-muted-foreground">Drag cards. Click to flip. Double-click revealed cards for details.</div>
                    </div>
                    {/* Add more sections as in ReadingRoom.tsx */}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Collaborative Features
                  </h4>
                  {/* Add content */}
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Reading Process
                  </h4>
                  {/* Add content */}
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Tips & Tricks
                  </h4>
                  {/* Add content */}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Need more help? Visit our documentation or contact support.
                </p>
                <button
                  onClick={onClose}
                  className="btn btn-primary px-6 py-2 mt-4"
                >
                  Got it!
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal; 