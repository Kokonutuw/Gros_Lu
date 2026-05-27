import "dotenv/config";
import sonnex from "talisman/phonetics/french/sonnex.js";
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
      description: "get the bot's latency",
    },
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(process.env.APP_ID), {
      body: commands,
    });

    console.log("Slash commands registered!");
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
const QUOI_PHONETIC = [
  "koi",
  "kua",
  "kUa",
  "kva",
  "koa",
  "kuUa",
  "kuva",
  "kuua",
  "kUua",
  "kuoa",
  "kUva",
  "kUUa",
  "kUoa",
  "kUa",
  "kUaa",
  "keva",
  "kwa",
  "kvUa",
  "kvoa",
  "kvea",
  "kea",
];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // React to thesillyfroggg's messages with 0.1% chance
  if (message.author.id === "1072896926711816252") {
    const randomValue = Math.floor(Math.random() * 1000);
    console.log("Random value:", randomValue);
    if (randomValue === 1) {
      try {
        await message.react("🤢");
        await message.react("🌈");
      } catch (err) {
        console.error("Erreur réactions :", err);
      }
    }
  }

  const match = message.content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/(\p{L}+)[^\p{L}]*$/u);

  if (!match) return;

  const lastWord = match[1].replace(/(.)\1+/g, "$1");

  //console.log("last word:", lastWord);

  const lastWordPhonetic = sonnex(lastWord);

  //console.log("phonetic:", lastWordPhonetic);

  if (QUOI_PHONETIC.includes(lastWordPhonetic)) {
    await message.reply("feur");
  }
});

client.login(process.env.DISCORD_TOKEN);
