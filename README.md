![Version](https://img.shields.io/npm/v/@retconned/kick-js?label=Version)
![License](https://img.shields.io/npm/l/@retconned/kick-js?label=License)

❇️ **@retconned/kick-js**

## **What is kick-js**

**kick-js** is a TypeScript-based library for [kick.com](https://kick.com)'s chat system. It provides a simple interface that allows developers to build chat bots and other chat-related applications.

### :construction: This library is still active for now as a selfbot library for Kick, but it will be fully updated to match their official documentation once they implement WebSocket support for messages. :construction:

## Features :rocket:

-   Supports reading & writing to Kick.com chat.
-   Moderation actions (ban, slowmode).
-   Written in TypeScript.

## Installation :package:

Install the @retconned/kick-js package using the following command:

```sh
npm install @retconned/kick-js
```

## Example code :computer:

```ts
import { createClient } from "@retconned/kick-js";
import "dotenv/config";

const client = createClient("xqc", { logger: true, readOnly: true });
// readOnly: true will make the client only read messages from the chat, and disable all other authenticated actions.

client.login({
    type: "login",
    credentials: {
        username: "xqc",
        password: "bigschnozer420",
        otp_secret: "your-2fa-secret",
    },
});
// to get your OTP secret, you need to go to https://kick.com/settings/security and enable Two-Factor Authentication and copy the secret from there

// you can also authenticate using tokens obtained from the kick website directly by switching the type to 'tokens'
client.login({
    type: "tokens",
    credentials: {
        bearerToken: process.env.BEARER_TOKEN,
        cookies: process.env.COOKIES,
    },
});

client.on("ready", () => {
    console.log(`Bot ready & logged into ${client.user?.tag}!`);
});

client.on("ChatMessage", async (message) => {
    console.log(`${message.sender.username}: ${message.content}`);
});

// get information about a vod
// your-video-id = vod uuid
const { title, duration, thumbnail, views } = await client.vod("your-video-id");

// get leaderboards for a channel
const leaderboards = await client.getLeaderboards();
// you can also pass in a kick-channel-name to get leaderboards for a different channel
// example: const leaderboards = await client.getLeaderboards("xqc");

// get polls for a channel
const polls = await client.getPolls();
// you can also pass in a kick-channel-name to get polls for a different channel
// example: const polls = await client.getPolls("xqc");
```

## Development :wrench:

### Running Tests

```sh
# Run all tests (both mock and integration)
npm test

# Run only mock tests (no real API calls)
npm run test:mock

# Run integration tests with real tokens (requires environment variables)
npm run test:tokens

# Run tests in watch mode during development
npm run dev

# Run specific test files
npm test -- client.test.ts
npm run test:mock -- client.test.ts

# Using the test runner script
npm run test:script mock      # Mock tests only
npm run test:script tokens    # Token-based tests only
npm run test:script all       # All tests
```

**Setting up Integration Tests:**

To run integration tests with real Kick.com tokens:

1. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```

2. Get your tokens from Kick.com:
   - Open browser developer tools (F12)
   - Go to Network tab
   - Visit kick.com and login
   - Find any API request and copy the headers:
     - `Authorization: Bearer ...` → `KICK_BEARER_TOKEN`
     - `X-CSRF-TOKEN: ...` → `KICK_XSRF_TOKEN`
     - `Cookie: ...` → `KICK_COOKIES`

3. Set your channel name in `.env`:
   ```
   KICK_CHANNEL=your-channel-name
   ```

4. Install Chrome for Puppeteer:
   ```sh
   npx puppeteer browsers install chrome
   ```

### Test Status

- **Mock Tests**: ✅ 52/54 tests passing (2 complex Puppeteer mocking edge cases)
- **Integration Tests**: Require real tokens and Chrome browser
- **Overall Coverage**: Excellent coverage of client functionality, error handling, and EventEmitter methods

**Note**: Some complex Puppeteer authentication flow tests are skipped in mock mode due to the complexity of mocking browser interactions. These are tested in integration mode with real tokens.

### Building

```sh
# Build the library
npm run build

# Type check
npm run lint:ts

# Format code
npm run format:fix
```

## Disclaimer :warning:

@retconned/kick-js is not affiliated with or endorsed by [Kick.com](https://kick.com). It is an independent tool created to facilitate making moderation bots & other chat-related applications.
