import { useState, useCallback } from 'react';

export interface ModalStateControls {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setModal: (isOpen: boolean) => void; // Allow direct setting
}

export function useModalState(initialOpen: boolean = false): ModalStateControls {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);
  const setModal = useCallback((shouldBeOpen: boolean) => setIsOpen(shouldBeOpen), []);

  return { isOpen, openModal, closeModal, toggleModal, setModal };
} 