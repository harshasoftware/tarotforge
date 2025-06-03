export const getPlatformShortcut = (key: string, withModifier = false): string => {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  switch (key) {
    case 'help':
      return isMac ? 'H' : 'F1';
    case 'reset':
      return withModifier ? (isMac ? 'Cmd+R' : 'Ctrl+R') : 'R';
    default:
      return key;
  }
};

export const KEY_CODES = {
  SPACE: 'Space',
  SHIFT_LEFT: 'ShiftLeft',
  // Add other event.code constants here if needed
};

export const KEY_VALUES = {
  ESCAPE: 'Escape',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ENTER: 'Enter',
  C_LOWER: 'c',
  PLUS: '+',
  EQUALS: '=',
  MINUS: '-',
  UNDERSCORE: '_', // Note: event.key for underscore is often just '_' itself
  Z_LOWER: 'z',
  R_LOWER: 'r',
  F1: 'F1',
  H_LOWER: 'h',
  T_LOWER: 't',
  D_LOWER: 'd',
  V_LOWER: 'v',
  L_LOWER: 'l',
  I_LOWER: 'i',
  M_LOWER: 'm',
  // Add other event.key constants here
}; 