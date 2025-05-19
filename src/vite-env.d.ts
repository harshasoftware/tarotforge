/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_AI_API_KEY?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_SUPABASE_S3_STORAGE?: string;
  readonly VITE_SUPABASE_S3_STORAGE_REGION?: string;
  readonly VITE_USE_PLACEHOLDER_IMAGES?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google One Tap types
interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: {
            credential: string;
            select_by: string;
            clientId: string;
          }) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          use_fedcm_for_prompt?: boolean;
        }) => void;
        prompt: (callback?: (notification: {
          isNotDisplayed: () => boolean;
          getNotDisplayedReason: () => string;
          isSkippedMoment: () => boolean;
          getSkippedReason: () => string;
          isDismissedMoment: () => boolean;
          getDismissedReason: () => string;
        }) => void) => void;
        renderButton: (
          element: HTMLElement, 
          options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            logo_alignment?: 'left' | 'center';
            width?: number;
          }
        ) => void;
        disableAutoSelect: () => void;
      };
    };
  };
}