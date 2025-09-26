/**
 * Comprehensive Chat Bot Example
 *
 * This example demonstrates how to build a full-featured chat bot using OAuth authentication.
 *
 * Prerequisites:
 * 1. Create an OAuth app at https://kick.com/settings/developer
 * 2. Set redirect URI to: http://localhost:3000/callback
 * 3. Add your credentials to .env file
 * 4. Run: npm run getOauthToken
 * 5. Run this bot: node examples/comprehensiveChatBot.js
 */

import { createClient } from "@retconned/kick-js";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// Configuration
const CHANNEL_NAME = "your-channel-name"; // Replace with your channel name
const BOT_PREFIX = "!"; // Command prefix

// Create the client
const client = createClient(CHANNEL_NAME, {
  logger: true // Enable logging to see connection status
});

// Track bot statistics
const stats = {
  messagesReceived: 0,
  commandsExecuted: 0,
  startTime: new Date(),
};

/**
 * Command handlers
 */
const commands = {
  // Ping command - responds with "Pong!"
  ping: async (message) => {
    await client.sendMessage("Pong! 🏓");
    stats.commandsExecuted++;
  },

  // Help command - shows available commands
  help: async (message) => {
    const helpText = `Available commands: ${BOT_PREFIX}ping, ${BOT_PREFIX}help, ${BOT_PREFIX}stats, ${BOT_PREFIX}uptime`;
    await client.sendMessage(helpText);
    stats.commandsExecuted++;
  },

  // Stats command - shows bot statistics
  stats: async (message) => {
    const statsText = `📊 Stats: ${stats.messagesReceived} messages | ${stats.commandsExecuted} commands executed`;
    await client.sendMessage(statsText);
    stats.commandsExecuted++;
  },

  // Uptime command - shows how long the bot has been running
  uptime: async (message) => {
    const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const uptimeText = `⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`;
    await client.sendMessage(uptimeText);
    stats.commandsExecuted++;
  },

  // Echo command - echoes back the message
  echo: async (message, args) => {
    if (args.length === 0) {
      await client.sendMessage("Usage: !echo <message>");
      return;
    }
    await client.sendMessage(args.join(" "));
    stats.commandsExecuted++;
  },
};

/**
 * Process incoming chat messages
 */
function handleChatMessage(message) {
  stats.messagesReceived++;

  const username = message.sender.username;
  const content = message.content;

  console.log(`[${username}]: ${content}`);

  // Check if message is a command
  if (content.startsWith(BOT_PREFIX)) {
    const args = content.slice(BOT_PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Execute command if it exists
    if (commands[commandName]) {
      commands[commandName](message, args).catch((error) => {
        console.error(`Error executing command ${commandName}:`, error);
      });
    }
  }
}

/**
 * Main bot initialization
 */
async function startBot() {
  try {
    console.log("🤖 Starting chat bot...");
    console.log(`📺 Connecting to channel: ${CHANNEL_NAME}`);

    // Login with OAuth (uses KICK_ACCESS_TOKEN from .env)
    await client.login({
      type: "oauth",
    });

    // Set up event listeners
    client.on("ready", (user) => {
      console.log(`✅ Bot connected as: ${user.username}`);
      console.log(`📝 Bot ID: ${user.id}`);
      console.log(`🎯 Command prefix: ${BOT_PREFIX}`);
      console.log(`💬 Listening for messages...`);
      console.log("");
    });

    client.on("ChatMessage", handleChatMessage);

    client.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n\n👋 Shutting down bot...");
      console.log(`📊 Final stats: ${stats.messagesReceived} messages | ${stats.commandsExecuted} commands`);
      process.exit(0);
    });

  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
}

// Start the bot
startBot();