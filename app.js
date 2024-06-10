import 'dotenv/config';
import express from 'express';
import discord from 'discord.js';
const { Client, GatewayIntentBits, Partials, REST, Routes } = discord;
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { VerifyDiscordRequest, DiscordRequest } from './utils.js';
import { grantCoin, redeemCoin } from './coinManager.js';
import { saveMessageId, getMessageId } from './messageManager.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent, // Ensure this is enabled in the Discord Developer Portal
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const commands = [
  {
    name: 'grantcoin',
    description: 'Grants a redemption coin to a specified user',
    options: [
      {
        type: 6, // USER type
        name: 'user',
        description: 'The user to grant a coin to',
        required: true,
      },
    ],
  },
  {
    name: 'redeem',
    description: 'Redeem a coin to remove your timeout',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
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
})();

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const hallOfJusticeChannel = client.channels.cache.get('1249559645677162505'); // Ensure this is your correct channel ID

  if (hallOfJusticeChannel) {
    const existingMessageId = getMessageId();

    // Try to fetch the existing message
    let existingMessage = null;
    if (existingMessageId) {
      try {
        existingMessage = await hallOfJusticeChannel.messages.fetch(existingMessageId);
      } catch (err) {
        console.error('Failed to fetch existing message:', err);
      }
    }

    // If the existing message is found, edit it, otherwise send a new message
    if (existingMessage) {
      await existingMessage.edit({ content: 'If you are timed out, DM me with the /redeem command to use your coin.' });
    } else {
      const newMessage = await hallOfJusticeChannel.send({ content: 'If you are timed out, DM me with the /redeem command to use your coin.' });
      saveMessageId(newMessage.id);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  if (commandName === 'grantcoin') {
    const targetUser = options.getUser('user');
    grantCoin(targetUser.id);
    await interaction.reply({ content: `Granted a redemption coin to <@${targetUser.id}>.`, ephemeral: true });
  } else if (commandName === 'redeem') {
    redeemCoin(user.id, async (success) => {
      if (success) {
        try {
          const guilds = await client.guilds.cache;
          for (const [guildId, guild] of guilds) {
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member && member.communicationDisabledUntilTimestamp) {
              await member.timeout(null);
              await interaction.reply({ content: `Your timeout has been cleared in ${guild.name}!`, ephemeral: true });
              return;
            }
          }
          await interaction.reply({ content: 'You are not timed out in any guilds.', ephemeral: true });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: 'Failed to clear timeout.', ephemeral: true });
        }
      } else {
        await interaction.reply({ content: 'You do not have any redemption coins.', ephemeral: true });
      }
    });
  }
});

client.on('messageCreate', async message => {
  if (message.channel.type === 'DM' && message.content === '/redeem') {
    redeemCoin(message.author.id, async (success) => {
      if (success) {
        try {
          const guilds = await client.guilds.cache;
          for (const [guildId, guild] of guilds) {
            const member = await guild.members.fetch(message.author.id).catch(() => null);
            if (member && member.communicationDisabledUntilTimestamp) {
              await member.timeout(null);
              await message.author.send(`Your timeout has been cleared in ${guild.name}`);
              return;
            }
          }
          await message.author.send('You are not timed out in any guilds.');
        } catch (err) {
          console.error(err);
          await message.author.send('Failed to clear timeout.');
        }
      } else {
        await message.author.send('You do not have any redemption coins.');
      }
    });
  }
});

app.post('/interactions', async function (req, res) {
  const { type, data, member } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'cleartimeout') {
      const userId = member.user.id;
      const guildId = req.body.guild_id;

      try {
        await DiscordRequest(`guilds/${guildId}/members/${userId}`, {
          method: 'PATCH',
          body: {
            communication_disabled_until: null,
          },
        });

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Your timeout has been cleared.`,
          },
        });
      } catch (err) {
        console.error(err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Failed to clear your timeout.',
          },
        });
      }
    }

    if (name === 'grantcoin') {
      const userId = data.options[0].value;
      grantCoin(userId);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Granted a redemption coin to <@${userId}>.`,
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

client.login(process.env.DISCORD_TOKEN);
