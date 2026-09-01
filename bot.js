import "dotenv/config";
import sonnex from "talisman/phonetics/french/sonnex.js";
import { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
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
  } catch (error) {
    console.error("Command registration error:", error);
  }
});
const eventMessages = new Map();
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
    if (Math.random() < 0.1) {
      if (message.author.id === "262361761611644928") {
        await message.reply("C'est fine ^^");
      } else {
        await message.reply("feur");
      }
    }
  }
});


client.on("guildScheduledEventCreate", async (event) => {
  try {
    // Forum channel
    const forum = await client.channels.fetch("1274388316803829840");

    // Announcement channel
    const announceChannel = await client.channels.fetch("1137681577422364713");

    const location = event.entityMetadata?.location;

    // Tag selection
    let tagId;

    // Discord voice event
    if (event.entityType === 2) {
      tagId = "1274391268511711322";
    }
    // IRL / other event
    else {
      tagId = "1274391005503688808";
    }

    // Create forum post (simple message)
    const post = await forum.threads.create({
      name: event.name,
      message: {
        content: "Détails de l'événement ci-dessous",
      },
      appliedTags: [tagId],
    });

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(event.name)
      .setDescription(event.description || "Aucune description")
      .addFields({
        name: "Emplacement",
        value: location || "Non défini",
        inline: true,
      })
      .setColor(0x5865f2)
      .setTimestamp();

    // Add start date if exists
    if (event.scheduledStartAt) {
      embed.addFields({
        name: "Début",
        value: event.scheduledStartAt.toLocaleString("fr-FR"),
        inline: true,
      });
    }

    // Add end date if exists
    if (event.scheduledEndAt) {
      embed.addFields({
        name: "Fin",
        value: event.scheduledEndAt.toLocaleString("fr-FR"),
        inline: true,
      });
    }

    // Add cover image if exists
    const coverImage = event.coverImageURL({
      size: 1024,
      extension: "png",
    });

    if (coverImage) {
      embed.setImage(coverImage);
    }

    // Send embed inside forum post
    await post.send({
      embeds: [embed],
    });

    // Send simple announcement
    await announceChannel.send({
      content:
        "Nouvel événement créé !\n\n" +
        "Pour en discuter :\n" +
        `${post.url}\n\n` +
        `${event.url}`,
    });
  } catch (err) {
    console.error(err);
  }
});
client.login(process.env.DISCORD_TOKEN);
