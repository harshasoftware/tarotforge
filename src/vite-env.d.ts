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
            select_by?: string;
            clientId?: string;
          }) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          // FedCM specific options
          use_fedcm?: boolean;
          use_fedcm_for_prompt?: boolean;
          fedcm_account_purge?: boolean;
          itp_support?: boolean;
          state_cookie_domain?: string;
          prompt_parent_id?: string;
          context?: 'signin' | 'signup' | 'use';
          // Error callback property for native API
          onerror?: (error: any) => void;
        }) => void;
        // FedCM migration - prompt no longer requires a callback
        prompt: (callbackOrParams?: ((notification: {
          // Legacy moment callbacks - DEPRECATED
          isNotDisplayed?: () => boolean;
          getNotDisplayedReason?: () => string;
          isSkippedMoment?: () => boolean;
          getSkippedReason?: () => string;
          isDismissedMoment?: () => boolean;
          getDismissedReason?: () => string;
          getMomentType?: () => string;
        }) => void) | {
          // FedCM prompt parameters
          display?: 'page' | 'popup' | 'touch';
          native?: boolean;
          moment_listener?: boolean;
        }) => void;
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
        cancel: () => void;
      };
    };
  };
}