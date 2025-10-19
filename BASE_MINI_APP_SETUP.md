# Base Mini App Setup Complete

Your Tarot Forge app has been successfully configured as a Base mini app for Farcaster.

## What's Been Added

### 1. Configuration Files

#### `farcaster.json`
- Main configuration file for Base mini app
- Contains owner address and app metadata
- Located in the project root

#### `src/config/minikit.config.ts`
- TypeScript configuration with full mini app settings
- Includes account association placeholders
- Contains all metadata for app discovery

### 2. Webhook Handler

#### `supabase/functions/base-webhook/`
- Supabase Edge Function for handling Base/Farcaster events
- Supports various event types:
  - User authentication
  - App installation/uninstallation
  - User interactions
  - Frame actions
  - Cast mentions

### 3. Asset Preparation

#### `scripts/prepare-miniapp-assets.sh`
- Script to generate required PNG assets from your SVG icon
- Creates icons, splash screens, and placeholders for screenshots
- Run with: `bash scripts/prepare-miniapp-assets.sh`

### 4. Environment Variables

Added to `.env.example`:
```env
VITE_APP_URL=https://tarotforge.xyz
```

## Setup Instructions

### 1. Generate Assets
```bash
# Install ImageMagick if not already installed
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux

# Run the asset preparation script
bash scripts/prepare-miniapp-assets.sh
```

### 2. Deploy Supabase Function
```bash
# Deploy the webhook function
supabase functions deploy base-webhook
```

### 3. Update Environment Variables
Add to your `.env` file:
```env
VITE_APP_URL=https://tarotforge.xyz  # Your actual domain
```

### 4. Replace Placeholder Screenshots
Replace the generated placeholder screenshots with actual app screenshots:
- `public/screenshot-portrait.png` (1170x2532)
- `public/screenshot-landscape.png` (2532x1170)

## Account Association

When implementing user authentication, you'll need to update the `accountAssociation` object in `minikit.config.ts` with actual values:
- `header`: Authentication header
- `payload`: User/account payload
- `signature`: Cryptographic signature

## Webhook Events

The webhook handler (`supabase/functions/base-webhook`) processes these events:
- `user.authenticated` - User signs in
- `user.interaction` - User performs an action
- `app.installed` - App is installed
- `app.uninstalled` - App is removed
- `frame.action` - Farcaster frame interaction
- `cast.created` - App is mentioned in a cast

## Testing

1. Ensure all assets are generated
2. Deploy your app
3. Test the webhook endpoint:
   ```
   https://[your-supabase-url]/functions/v1/base-webhook
   ```
4. Verify the app loads correctly within Farcaster

## Next Steps

1. Implement proper account association logic
2. Add real screenshots of your app
3. Set up analytics for webhook events
4. Test the app within Farcaster's mini app environment
5. Submit your app for review in the Base ecosystem

## Resources

- [Base Documentation](https://docs.base.org)
- [Farcaster Documentation](https://docs.farcaster.xyz)
- [Mini Apps Guide](https://docs.farcaster.xyz/developers/mini-apps)