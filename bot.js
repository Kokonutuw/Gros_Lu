import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const commands = [
    {
      name: "ping",
      description: "get the bot's latency ",
    },
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("Registering slash commands...");

    await rest.put(Routes.applicationCommands(process.env.APP_ID), {
      body: commands,
    });

    console.log("Slash commands registered.");
  } catch (error) {
    console.error("Command registration error:", error);
  }
});

// Slash commands handler

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    const start = Date.now();

    await interaction.reply("Pong!");

    const ping = Date.now() - start;

    await interaction.editReply(`Pong! ${ping}ms`);
  }
});

// Detect "quoi / pourquoi / variants"

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  const words = msg.match(/[a-zàâçéèêëîïôûùüÿñæœ]+/gi);
  if (!words) return;

  const lastWord = words[words.length - 1];

  const isQuoiLike = /(qu?|k|c)((ou|w)a+|o(a+|i+))\W*$/.test(lastWord);

  if (isQuoiLike) {
    await message.reply("feur");
  }
});

client.login(process.env.DISCORD_TOKEN);
