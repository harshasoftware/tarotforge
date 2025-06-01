import { useState, useCallback } from 'react';

/**
 * @interface ModalStateControls
 * @description Defines the control functions and state for a modal.
 * @property {boolean} isOpen - Whether the modal is currently open.
 * @property {function(): void} openModal - Function to open the modal.
 * @property {function(): void} closeModal - Function to close the modal.
 * @property {function(): void} toggleModal - Function to toggle the modal's open/close state.
 * @property {function(isOpen: boolean): void} setModal - Function to directly set the modal's open/close state.
 */
export interface ModalStateControls {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setModal: (isOpen: boolean) => void; // Allow direct setting
}

/**
 * @hook useModalState
 * @description React hook to manage the state of a modal (open/closed).
 * Provides functions to open, close, toggle, and directly set the modal state.
 *
 * @param {boolean} [initialOpen=false] - The initial open state of the modal. Defaults to false.
 * @returns {ModalStateControls} An object containing the modal state and control functions.
 */
export function useModalState(initialOpen: boolean = false): ModalStateControls {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);
  const setModal = useCallback((shouldBeOpen: boolean) => setIsOpen(shouldBeOpen), []);

  return { isOpen, openModal, closeModal, toggleModal, setModal };
} 