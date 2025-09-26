/**
 * Cross-Channel Messaging Example
 *
 * This example demonstrates how to send messages to different channels using OAuth authentication.
 *
 * Features:
 * - OAuth authentication (recommended for public API access)
 * - Send messages to your bot's own channel
 * - Send messages to other channels (cross-channel messaging)
 *
 * Setup:
 * 1. Create a Kick.com OAuth application at https://kick.com/settings/developer
 * 2. Set redirect URI to: http://localhost:3000/callback
 * 3. Create a .env file with:
 *    KICK_CLIENT_ID=your-client-id
 *    KICK_CLIENT_SECRET=your-client-secret
 * 4. Run: npm run getOauthToken (to generate access tokens)
 * 5. Update BOT_CHANNEL and TARGET_CHANNEL below
 * 6. Run: node examples/crossChannelMessaging.js
 *
 * Note:
 * - Your bot must have permission to send messages in the target channel
 * - The target channel must exist and be accessible
 * - OAuth tokens automatically refresh before expiration
 */

import { createClient } from "@retconned/kick-js";
import { config } from "dotenv";

config();

const BOT_CHANNEL = "your-bot-channel-name";
const TARGET_CHANNEL = "target-channel-name";

const client = createClient(BOT_CHANNEL, {
  logger: true,
});

async function sendCrossChannelMessage() {
  try {
    await client.login({
      type: "oauth",
    });

    client.on("ready", async (user) => {
      console.log(`✅ Bot connected as: ${user.username}`);

      console.log(`Sending message to your own channel (${BOT_CHANNEL})...`);
      await client.sendMessage("Hello from my bot channel!");

      console.log(
        `\nSending message to different channel (${TARGET_CHANNEL})...`,
      );
      await client.sendMessage(
        "Hello from a different channel!",
        TARGET_CHANNEL,
      );

      console.log("\n✅ Messages sent successfully!");
      process.exit(0);
    });

    client.on("error", (error) => {
      console.error("❌ Client error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to send messages:", error);
    process.exit(1);
  }
}

sendCrossChannelMessage();