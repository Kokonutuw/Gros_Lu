import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once)
client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Register slash commands
  const commands = [
    {
      name: 'test',
      description: 'Test command',
    },
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Listen for slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'test') {
    await interaction.reply('Test command works!');
  }
});


client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  // Get all words (letters only, including French accents)
  const words = msg.match(/[a-zàâçéèêëîïôûùüÿñæœ]+/gi);
  if (!words) return;

  const lastWord = words[words.length - 1];

  // Detect "quoi / pourquoi / variants"
  const isQuoiLike = /(qu?|k|c)((ou|w)a+|o(a+|i+))\W*$/.test(lastWord);

  if (isQuoiLike) {
    await message.reply('feur');
  }
});

client.login(process.env.DISCORD_TOKEN);
