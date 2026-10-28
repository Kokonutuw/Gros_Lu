import "dotenv/config";
import sonnex from "talisman/phonetics/french/sonnex.js";
// --- AJOUT anniversaires : imports ---
import { MessageFlags } from "discord.js";
import cron from "node-cron";
import Database from "better-sqlite3";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
  ],
});

// --- AJOUT anniversaires : base SQLite + fonctions ---
const BDAY_CHANNEL_ID = "1137681577422364713";

const db = new Database("./anniversaires.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS anniversaires (
    user_id        TEXT PRIMARY KEY,
    jour           INTEGER NOT NULL,
    mois           INTEGER NOT NULL,
    derniere_annee INTEGER
  )
`);

// Date et heure du jour à Paris, quel que soit le fuseau du serveur
function nowParis() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return {
    jour: get("day"),
    mois: get("month"),
    annee: get("year"),
    heure: get("hour"),
  };
}

async function souhaiterAnniversaires() {
  const { jour, mois, annee } = nowParis();

  // derniere_annee évite les doublons (redémarrage, double exécution)
  const membres = db
    .prepare(
      `SELECT user_id FROM anniversaires
       WHERE jour = ? AND mois = ?
         AND (derniere_annee IS NULL OR derniere_annee != ?)`
    )
    .all(jour, mois, annee);

  if (membres.length === 0) return;

  try {
    const channel = await client.channels.fetch(BDAY_CHANNEL_ID);

    for (const { user_id } of membres) {
      await channel.send(`🎉 Joyeux anniversaire <@${user_id}> ! 🎂`);
      db.prepare(
        "UPDATE anniversaires SET derniere_annee = ? WHERE user_id = ?"
      ).run(annee, user_id);
    }
  } catch (err) {
    console.error("Erreur anniversaires :", err);
  }
}
// --- FIN AJOUT anniversaires ---

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}!`);


  const commands = [
    {
      name: "ping",
      description: "get the bot's latency",
    },
    // --- AJOUT anniversaires : commande ---
    {
      name: "anniversaire",
      description: "Enregistre ta date d'anniversaire",
      options: [
        {
          type: 4,
          name: "jour",
          description: "Jour",
          required: true,
          min_value: 1,
          max_value: 31,
        },
        {
          type: 4,
          name: "mois",
          description: "Mois",
          required: true,
          min_value: 1,
          max_value: 12,
        },
      ],
    },
    // --- FIN AJOUT ---
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationCommands(process.env.APP_ID), {
      body: commands,
    });
  } catch (error) {
    console.error("Command registration error:", error);
  }

  // --- AJOUT anniversaires : tâche planifiée ---
  // Tous les jours à 9h00 (Paris)
  cron.schedule("0 9 * * *", souhaiterAnniversaires, {
    timezone: "Europe/Paris",
  });

  // Rattrapage si le bot était éteint à 9h (uniquement après 9h pour ne pas
  // souhaiter en pleine nuit lors d'un redémarrage)
  if (nowParis().heure >= 9) {
    souhaiterAnniversaires();
  }
  // --- FIN AJOUT ---
});
const eventMessages = new Map();
// Slash commands handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    const ping = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`Pong! ${ping}ms`);
  }

  // --- AJOUT anniversaires : handler de la commande ---
  if (interaction.commandName === "anniversaire") {
    const jour = interaction.options.getInteger("jour");
    const mois = interaction.options.getInteger("mois");

    // Validation (2024 est bissextile, donc le 29/02 est accepté)
    const d = new Date(2024, mois - 1, jour);
    if (d.getMonth() !== mois - 1) {
      return interaction.reply({
        content: "Date invalide.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Si la date change, on remet derniere_annee à NULL pour pouvoir
    // souhaiter l'anniversaire corrigé
    db.prepare(
      `INSERT INTO anniversaires (user_id, jour, mois)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         derniere_annee = CASE
           WHEN jour != excluded.jour OR mois != excluded.mois THEN NULL
           ELSE derniere_annee
         END,
         jour = excluded.jour,
         mois = excluded.mois`
    ).run(interaction.user.id, jour, mois);

    await interaction.reply({
      content: `Anniversaire enregistré : ${jour}/${mois} 🎂`,
      flags: MessageFlags.Ephemeral,
    });
  }
  // --- FIN AJOUT ---
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
  

  const match = message.content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/(\p{L}+)[^\p{L}]*$/u);

  if (!match) return;

  const lastWord = match[1].replace(/(.)\1+/g, "$1");

  //console.log("last word:", lastWord);

  const lastWordPhonetic = sonnex(lastWord);
  const index = QUOI_PHONETIC.indexOf(lastWordPhonetic);

  //console.log("phonetic:", lastWordPhonetic);

  if (index !== -1) {
    if (Math.random() < 0.3) {
      if (message.author.id === "262361761611644928") {
        await message.reply("C'est fine ^^");
      } else {
        await message.reply("feur");
	console.log("[QUOI] feur envoyé hehehehehe");
      }
    }else{
      console.log("[QUOI] '" + QUOI_PHONETIC[index] + "' détécté, mais pas feur");
    }
  }
});


client.on("guildScheduledEventCreate", async (event) => {
  try {
    // Forum channel
    const forum = await client.channels.fetch("1274388316803829840");

    // Announcement channel
    const announceChannel = await client.channels.fetch("1137681577422364713");

    // Tag selection
    const tagId =
      event.entityType === 2
        ? "1274391268511711322" // Discord voice event
        : "1274391005503688808"; // IRL / other event

    // Create forum post avec directement le lien de l'event
    const post = await forum.threads.create({
      name: event.name,
      message: {
        content: event.url,
      },
      appliedTags: [tagId],
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
