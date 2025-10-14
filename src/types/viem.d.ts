declare module 'viem' {
  export type Address = `0x${string}`;
  export type Hex = `0x${string}`;

  // Add other viem types as needed
  export * from 'viem/types';
}
