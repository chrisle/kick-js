![Version](https://img.shields.io/npm/v/@retconned/kick-js?label=Version)
![License](https://img.shields.io/npm/l/@retconned/kick-js?label=License)

❇️ **@retconned/kick-js**

## **What is kick-js**

**kick-js** is a TypeScript-based library for [kick.com](https://kick.com)'s chat system. It provides a simple interface that allows developers to build chat bots and other chat-related applications.

## Features ✨

- 📬 **Real-time Chat** - Read chat messages via WebSocket connection
- 💬 **Send Messages** - Send messages to your own channel or any other channel
- 🔐 **Multiple Auth Methods** - OAuth, login credentials, browser tokens
- 🔄 **Automatic Token Refresh** - OAuth tokens refresh automatically before expiration
- 📊 **Public APIs** - Categories, channels, events, livestreams, users, moderation
- 🔧 **Private APIs** - Channel data, VOD data, advanced moderation (via Puppeteer)
- 📘 **Full TypeScript Support** - Complete type definitions included
- ✅ **Well Tested** - 147+ passing tests with comprehensive coverage

## Quick Start :rocket:

### 1. Install the Library

```bash
npm install @retconned/kick-js
```

### 2. Create a Kick.com OAuth Application

1. Go to [kick.com/settings/developer](https://kick.com/settings/developer)
2. Click the **"Developer"** tab
3. Click **"Create New Application"**
4. Fill in the application details:
   - **Name**: Your bot/app name (e.g., "My Chat Bot")
   - **Redirect URI**: `http://localhost:3000/callback` (must be exact)
   - **Scopes**: Select all of them (you can change this later)
5. Click **"Create"**
6. Copy your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```bash
KICK_CLIENT_ID=your-client-id-here
KICK_CLIENT_SECRET=your-client-secret-here
```

### 4. Generate OAuth Tokens

Run the token generation utility:

```bash
npm run getOauthToken
```

This will:
- Open your browser for authorization
- Request all available OAuth scopes
- Save your access token and refresh token to `.env`
- Enable automatic token refresh

### 5. Build Your Bot

Create a file (e.g., `bot.js`):

```javascript
import { createClient } from "@retconned/kick-js";

const client = createClient("your-channel-name", { logger: true });

// Authenticate with OAuth (uses tokens from .env)
await client.login({
  type: "oauth"
});

// Listen for messages
client.on("ChatMessage", async (message) => {
  console.log(`${message.sender.username}: ${message.content}`);

  // Respond to !ping
  if (message.content === "!ping") {
    await client.sendMessage("Pong!");
  }
});

// Bot is ready
client.on("ready", (user) => {
  console.log(`✅ Bot connected as ${user.username}!`);
});
```

Run your bot:

```bash
node bot.js
```

That's it! Your bot is now connected and will respond to `!ping` with "Pong!". The OAuth token will automatically refresh when it expires.

## APIs Overview

**kick-js** provides access to both **Public APIs** (official Kick.com REST endpoints) and **Private APIs** (web scraping via Puppeteer).

### Public APIs (OAuth Authentication)
- ✅ **Chat messaging** - Send messages to channels
- ✅ **Categories** - Search and get category data
- ✅ **Channels** - Get and update channel information
- ✅ **Events** - Manage event subscriptions
- ✅ **Livestreams** - Get livestream data and stats
- ✅ **Users** - Get user information and token introspection
- ✅ **Moderation** - Ban/unban users (public API)

### Private APIs (Puppeteer Scraping)

⚠️ **Warning**: Private APIs use web scraping and browser automation. These methods may break at any time if Kick.com changes their website structure, updates their anti-bot detection, or modifies their authentication flow. Use at your own risk and be prepared to handle failures gracefully.

- ✅ **Channel data** - Detailed channel information
- ✅ **Video data** - VOD information and metadata
- ✅ **Authentication** - Login with username/password

## Authentication Methods

### 1. OAuth (Recommended for Public APIs)

```ts
// Using environment variable (KICK_ACCESS_TOKEN)
await client.login({
  type: "oauth"
});

// Using explicit token
await client.login({
  type: "oauth",
  credentials: {
    accessToken: "your-oauth-access-token"
  }
});
```

### 2. Browser Tokens (For Private APIs)

```ts
await client.login({
  type: "tokens",
  credentials: {
    bearerToken: "captured-bearer-token",
    xsrfToken: "captured-xsrf-token",
    cookies: "captured-cookies"
  }
});
```

### 3. Login Credentials (For Private APIs)

```ts
await client.login({
  type: "login",
  credentials: {
    username: "your-username",
    password: "your-password",
    otp_secret: "your-2fa-secret" // if 2FA enabled
  }
});
```

### 4. Multi-Authentication (Public + Private APIs)

You can authenticate with both OAuth and private credentials to access all APIs:

```ts
const client = createClient("channelname", { logger: true });

// First authenticate with OAuth for public APIs
await client.login({ type: "oauth" });

// Then authenticate with credentials for private APIs
await client.login({
  type: "login",
  credentials: {
    username: "your-username",
    password: "your-password",
    otp_secret: "your-2fa-secret"
  }
});

// Now you can use both API types
await client.sendMessage("Hello!"); // Uses OAuth (public API)
const vodData = await client.vod("video-id"); // Uses private API
await client.deleteMessage("message-id"); // Uses private API
```

## Advanced Usage

### Cross-Channel Messaging

```ts
// Send to own channel (as bot)
await client.sendMessage("Hello!");

// Send to different channel (as user)
await client.sendMessage("Hello other channel!", "otherchannel");
```

### Using Public APIs Directly

```ts
import { searchCategories, getChannels } from "@retconned/kick-js";

// Search categories
const categories = await searchCategories(bearerToken, "gaming", 1);

// Get channel data
const channels = await getChannels(bearerToken, { slug: ["xqc"] });
```

### Private API Usage

```ts
import { getChannelData, getVideoData } from "@retconned/kick-js";

// Get channel data via scraping
const channelInfo = await getChannelData("channelname");

// Get video data
const videoInfo = await getVideoData("video-uuid");
```

## Examples

### Comprehensive Chat Bot
[`examples/comprehensiveChatBot.js`](./examples/comprehensiveChatBot.js) demonstrates:

- OAuth authentication
- Reading chat messages
- Responding to commands (!ping, !help, !stats, !uptime, !echo)
- Bot statistics tracking
- Graceful shutdown handling

### Cross-Channel Messaging
[`examples/crossChannelMessaging.js`](./examples/crossChannelMessaging.js) demonstrates:

- OAuth authentication
- Sending messages to your own channel
- Sending messages to different channels

## OAuth Setup

1. **Create OAuth App**: Visit [kick.com/developer/applications](https://kick.com/developer/applications)
2. **Set Redirect URI**: `http://localhost:3000/callback`
3. **Get Credentials**: Note your Client ID and Client Secret
4. **Generate Tokens**: Run `npm run getOauthToken` (creates/updates .env file with tokens)

### Available OAuth Scopes

By default, `npm run getOauthToken` requests all available scopes:

- `user:read` - View user information (username, streamer ID, etc.)
- `channel:read` - View channel information (description, category, etc.)
- `channel:write` - Update livestream metadata
- `chat:write` - Send chat messages and enable chat bots
- `streamkey:read` - Read stream URL and stream key
- `events:subscribe` - Subscribe to channel events (chat messages, follows, subscriptions)
- `moderation:ban` - Execute moderation actions

You can customize scopes by setting `KICK_SCOPES` in your `.env` file.

## Running Tests

```bash
# Run unit tests (with mocks, no real API calls)
npm test

# Run integration tests (with real API calls, requires credentials in .env)
npm run test:integration

# Run integration tests with browser visible (for debugging Puppeteer)
npm run test:integration:headful
```

**Note**: Integration tests require environment variables to be set in a `.env` file. Copy `.env.example` to `.env` and fill in your credentials.

## Features :gear:

| Feature | Authentication Required | Notes |
|---------|------------------------|-------|
| Read chat messages | Any | WebSocket connection |
| Send messages | OAuth | Public API |
| Get channel data | None (scraping) | Private API via Puppeteer |
| Get VOD data | None (scraping) | Private API via Puppeteer |
| Delete messages | Login/Tokens | Private API |
| Slow mode | Login/Tokens | Private API |
| Ban/Unban users | OAuth | Public API |
| Search categories | OAuth | Public API |
| Get/Update channels | OAuth | Public API |
| Manage event subscriptions | OAuth | Public API |
| Get livestreams | OAuth | Public API |
| Get users | OAuth | Public API |

## Disclaimer :warning:

@retconned/kick-js is not affiliated with or endorsed by [Kick.com](https://kick.com). It is an independent tool created to facilitate making chat-related applications.