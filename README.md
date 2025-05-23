# TarotForge: AI-Powered Tarot Platform

TarotForge is an innovative platform that empowers users to explore the mystical world of tarot through the lens of artificial intelligence. It provides a comprehensive suite of tools for creating, customizing, sharing, and utilizing unique tarot decks. Whether you're a tarot enthusiast, a spiritual seeker, a professional reader, or a creative artist, TarotForge offers a space to bring your tarot visions to life.

With TarotForge, you can:

*   **Design Custom Decks:** Leverage cutting-edge AI (powered by Google's Gemini and Imagen models) to generate unique card imagery and insightful descriptions based on your chosen themes and prompts.
*   **Manage Your Collection:** Organize your created and acquired decks in a personal digital library.
*   **Engage in Readings:** Utilize your custom decks in an interactive Reading Room, complete with video chat capabilities for live sessions and AI-powered interpretations.
*   **Explore a Marketplace:** Discover and share AI-generated tarot decks within the TarotForge community.
*   **Become a Certified Reader:** Test your tarot knowledge and gain certification through our integrated quiz system.

This document provides an overview of TarotForge's architecture, features (Product Requirements), and pricing model.

## Application Architecture

TarotForge is built with a modern technology stack, leveraging powerful tools and services to deliver a seamless and feature-rich user experience.

### Frontend

*   **Framework:** React (v18) with TypeScript for a robust and type-safe user interface.
*   **Build Tool:** Vite for fast development and optimized builds.
*   **Routing:** React Router (v6) for client-side navigation.
*   **Styling:** Tailwind CSS for utility-first styling and responsive design.
*   **State Management:** Zustand for lightweight and flexible global state management.
*   **Animations:** Framer Motion for engaging and fluid UI animations.
*   **Progressive Web App (PWA):** Designed to be installable with offline capabilities, using `vite-plugin-pwa`.

### Backend & Platform

*   **Supabase:** Utilized as the primary backend-as-a-service (BaaS) solution.
    *   **Database:** PostgreSQL for relational data storage (user profiles, decks, readings, etc.).
    *   **Authentication:** Manages user sign-up, login (email/password, Google OAuth), and session handling.
    *   **Serverless Functions:** Node.js/TypeScript functions deployed on Supabase Edge for backend logic (e.g., Stripe integration, deck limit checks, WebRTC signaling).
    *   **Storage:** Used for storing user-uploaded files like profile images and AI-generated tarot card images.
    *   **Realtime:** Powers real-time features, likely including aspects of the Reading Room and notifications.

### AI Integration

*   **Google Cloud AI:** TarotForge heavily relies on Google's Generative AI models:
    *   **Text Generation (`gemini-2.0-flash`, `gemini-1.5-pro`):** Used for generating tarot card descriptions, detailed theme elaborations, AI-powered reading interpretations, mystical usernames, and questions for the Tarot Quiz.
    *   **Image Generation (`imagen-3.0-generate-002`):** Powers the AI tarot card image creation, allowing users to generate unique visuals based on prompts, themes, and styles.

### Payments

*   **Stripe:** Integrated for processing payments for subscriptions and one-time purchases (like the Explorer Plus deck upgrade).
    *   Checkout sessions are created securely via a Supabase Edge Function (`stripe-checkout`) to protect API keys.
    *   Manages subscription statuses and webhooks (via `stripe-webhook` Supabase Function) to update user entitlements.

### Real-time Communication (Reading Room)

*   **WebRTC:** The `simple-peer` library is used to enable direct peer-to-peer video and audio chat within the Reading Room.
*   **Signaling:** A Supabase Function (`webrtc-signaling`) likely handles the exchange of metadata needed to establish WebRTC connections.

### Monitoring & Analytics

*   **Sentry:** For real-time error tracking and performance monitoring.
*   **LogRocket:** Provides session replay capabilities for debugging and product analytics to understand user behavior.
*   **Mixpanel:** Used for tracking key user events and product metrics.

## Product Requirements (Features)

This section outlines the key features and functionalities of TarotForge, derived from the application's structure and capabilities.

### 1. User Account Management

*   **Authentication:**
    *   Secure user sign-up using email/password.
    *   Sign-in with email/password or Google OAuth.
    *   Password recovery options.
    *   Robust session management and persistence.
*   **User Profile:**
    *   View and edit profile information (username, bio).
    *   Upload and manage profile image.
    *   View activity logs (e.g., created decks, readings history - inferred).
    *   Access to subscription and billing details.

### 2. AI Tarot Deck Creation & Customization

*   **Deck Generation:**
    *   Create new tarot decks using AI.
    *   Choose from AI-suggested themes or input custom themes.
    *   Generate card imagery and descriptions using Google's Gemini & Imagen AI models.
    *   Support for Major Arcana (22 cards) and full 78-card decks.
*   **Customization:**
    *   Edit AI-generated card names and descriptions.
    *   Regenerate individual card images or descriptions.
    *   Select image styles and quality (medium, high - tier-dependent).
    *   Option for custom card back designs (higher tiers).
    *   "Style consistency engine" to maintain visual harmony (higher tiers).
*   **Deck Settings:**
    *   Set deck privacy (public or private - tier-dependent).
    *   Define deck name and description.

### 3. Deck Management

*   **User Collection:**
    *   Personalized library to view and manage all created or acquired tarot decks.
    *   Deck storage limits based on the user's subscription tier.
*   **Deck Details View:**
    *   View all cards within a deck.
    *   Inspect individual card images and descriptions.
    *   Access options to edit or use the deck.

### 4. Marketplace

*   **Browse Decks:**
    *   Explore a public marketplace of AI-generated tarot decks created by other users.
    *   Filter and search for decks (inferred capability).
*   **Deck Listings:**
    *   View detailed information about listed decks (creator, theme, style, card previews).
*   **Selling Decks (For Creators):**
    *   Ability for users (especially on paid tiers) to list their created decks for others.
    *   Platform fees on sales, varying by the seller's subscription tier.
*   **Purchasing Decks:**
    *   Mechanism for users to acquire decks from the marketplace (details may vary - e.g., direct purchase, unlocking access).

### 5. Tarot Readings

*   **Reading Room:**
    *   Interactive digital environment for conducting tarot readings.
    *   Select any owned or accessible deck for a reading.
    *   Various card spread layouts (inferred capability).
*   **Live Readings:**
    *   Integrated video and audio chat (WebRTC) for real-time readings with others.
*   **AI Interpretations:**
    *   Option to receive AI-generated interpretations for drawn cards and spreads.

### 6. Reader Certification Program

*   **Tarot Quiz:**
    *   An integrated quiz to test users' knowledge of tarot symbolism, meanings, and practices.
    *   Questions generated by AI (Gemini).
    *   Different difficulty levels (inferred).
*   **Certification:**
    *   Users can earn a "Certified Reader" status upon successful quiz completion.
*   **Reader Dashboard:**
    *   A dedicated dashboard for certified readers to manage their status or reader-specific features.
*   **Shareable Certificates:**
    *   Publicly shareable digital certificates to showcase certification.

### 7. Monetization & Subscription Management

*   **Tiered Subscription Model:**
    *   Multiple subscription plans (Free, Mystic, Creator, Visionary) with varying features, limits, and pricing (monthly/yearly).
    *   Clear presentation of features per tier.
*   **One-Time Purchases:**
    *   Specific upgrades available for a single payment (e.g., "Explorer Plus" to expand a free deck).
*   **Payment Processing:**
    *   Secure payment handling via Stripe.
    *   Users can manage their active subscriptions and view billing history.
*   **Credit System (Potential):**
    *   The codebase contains elements like `CreditContext.tsx` and `CreditSummaryCard.tsx`, suggesting a possible system for credits (e.g., for specific actions like additional regenerations or generations beyond monthly quotas). The primary pricing model on the `PricingPage` focuses on deck counts per month.

### 8. Potential Future Features
As suggested by the "Additional Services" section on the pricing page:

*   **Expanded Reading Platform:** Booking professional tarot readings from certified readers.
*   **Physical Products:** Print-on-demand services for physical copies of created tarot decks.
*   **NFT Marketplace:** Integration for minting and trading tarot decks as Non-Fungible Tokens (NFTs).

## Pricing Model

TarotForge offers a flexible pricing structure to accommodate various user needs, from casual explorers to professional tarot creators and readers.

### Free Tier: Explorer

*   **Cost:** $0/month
*   **Core Features:**
    *   Generate 1 Major Arcana deck (22 cards) per month.
    *   Access to basic AI generation features.
    *   Personal use only for created decks.
    *   Decks are public by default.
    *   Browse the marketplace.

### One-Time Purchase: Explorer Plus

*   **Cost:** $5.00 (one-time payment)
*   **Core Features:**
    *   Upgrade any single Major Arcana deck (created under the free Explorer tier) to a complete 78-card deck.
    *   Includes 56 additional cards for the selected deck.
    *   5 card regenerations for the upgraded deck.
    *   Medium quality card images.
    *   Personal use only.
    *   Option to make the upgraded deck private.

### Subscription Tiers

TarotForge offers the following subscription tiers with monthly and yearly billing options (yearly plans typically include a ~20% discount compared to monthly rates).

#### 1. Mystic Tier

*   **Monthly Cost:** $12.99
*   **Yearly Cost:** $124.70 (equivalent to ~$10.39/month)
*   **Key Features:**
    *   **Deck Generation:** 2 complete 78-card decks per month (total 156 cards).
    *   **Image Quality:** Medium quality images with enhanced style options.
    *   **Usage Rights:** Personal use and limited commercial rights.
    *   **Privacy:** Option for public or private deck visibility.
    *   **Storage:** Save up to 15 complete decks.
    *   **Marketplace:** Seller profile with a 30% platform fee on sales.
    *   **Other:** Custom layouts, deck sharing, unlimited card regenerations. Free decks automatically upgrade to full versions.

#### 2. Creator Tier (Popular)

*   **Monthly Cost:** $29.99
*   **Yearly Cost:** $287.90 (equivalent to ~$23.99/month)
*   **Key Features:**
    *   **Deck Generation:** 4 complete 78-card decks per month (total 312 cards).
    *   **Image Quality:** Medium and High quality image options.
    *   **Usage Rights:** Full commercial rights for created decks.
    *   **Privacy:** Complete privacy controls for decks.
    *   **Storage:** Store up to 50 complete decks.
    *   **Marketplace:** Enhanced seller profile with a 25% platform fee on sales.
    *   **Advanced Features:** Professional reader tools, batch deck generation, style consistency engine, custom card back designs, priority generation queue.

#### 3. Visionary Tier

*   **Monthly Cost:** $79.99
*   **Yearly Cost:** $767.99 (equivalent to ~$63.99/month)
*   **Key Features:**
    *   **Deck Generation:** 8 complete 78-card decks per month (total 624 cards).
    *   **Image Quality:** High quality card images with premium finish options.
    *   **Usage Rights:** Extended commercial and merchandising rights.
    *   **Privacy:** Advanced content protection features.
    *   **Storage:** Unlimited deck storage.
    *   **Marketplace:** Verified creator badge with a 15% platform fee on sales.
    *   **Premium Features:** White-label reading room, priority generation queue, advanced AI customization, animated card effects, style transfer from uploaded images, API access for integrations, dedicated account support.

*(Note: Prices and specific features are based on the information available in `src/lib/stripe-config.ts` and `src/pages/pricing/PricingPage.tsx` as of the last review and are subject to change.)*

## Basic Setup (Placeholder)

To get TarotForge running locally, you'll need to configure your environment and install dependencies.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd tarotforge
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add the necessary environment variables. These will include keys for Supabase, Stripe, and Google Cloud AI services.
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_pk_key
    # Note: Stripe secret keys should only be used in backend functions (Supabase Edge Functions)

    VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key
    
    # Other potential variables related to Sentry, LogRocket, Mixpanel
    VITE_SENTRY_DSN=your_sentry_dsn
    VITE_LOGROCKET_APP_ID=your_logrocket_app_id
    VITE_MIXPANEL_TOKEN=your_mixpanel_token
    ```
    *Please refer to the specific service documentation for obtaining these keys and ensuring your Supabase backend functions and database schema are correctly set up.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:5173`.

*(Note: This is a generalized setup guide. Specific details regarding Supabase database migrations, function deployment, and Stripe webhook configuration are managed within their respective platforms and may require additional steps.)*

## Contributing

Contributions to TarotForge are welcome! If you'd like to contribute, please follow these general guidelines:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b fix/your-bug-fix`.
3.  **Make your changes** and commit them with clear, descriptive messages.
4.  **Ensure your code adheres to the project's linting standards** (`npm run lint`).
5.  **Push your changes** to your forked repository.
6.  **Open a Pull Request** to the main TarotForge repository, detailing the changes you've made.

Please ensure your contributions are well-tested and align with the project's goals.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
*(Assuming a LICENSE file exists or will be created. If not, this can be stated as "This project is currently not licensed" or updated accordingly.)*
