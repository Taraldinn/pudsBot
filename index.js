require('dotenv').config();
const dis_token = process.env.DISCORD_TOKEN;

const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping,
    ],
});

const TOKEN = dis_token;

let timer;
let secondsRemaining = 0;
let isPaused = true; // Initially paused
let timerMessage; // To hold the message object for updates
let notifiedLastMinute = false; // Track if notification for last minute has been sent

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
    keepAlive(); // Add this line to start the keep-alive mechanism
});

client.on(Events.MessageCreate, async (message) => {
    // Timer command
    if (message.content.startsWith('/timer')) {
        const timeString = message.content.split(' ')[1];
        const totalSeconds = parseTime(timeString);

        if (totalSeconds) {
            secondsRemaining = totalSeconds;
            isPaused = true; // Ensure it is paused initially
            notifiedLastMinute = false; // Reset notification tracker
            await sendTimerMessage(message.channel);
        } else {
            message.channel.send('Please provide a valid time in the format: XhYmZs (e.g., 1h30m15s).');
        }
    }

    // Coin flip command
    if (message.content.startsWith('/coinflip')) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        message.channel.send(`The coin landed on: **${result}**`);
    }
});

function parseTime(timeString) {
    const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
    const match = timeString.match(regex);
    if (!match) return null;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
}

async function sendTimerMessage(channel) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start')
                .setLabel('Start')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('pause')
                .setLabel('Pause')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('resume')
                .setLabel('Resume')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('reset')
                .setLabel('Start Over')
                .setStyle(ButtonStyle.Danger)
        );

    timerMessage = await channel.send({
        content: `${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s remaining...`,
        components: [row],
    });
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
        case 'start':
            if (isPaused && secondsRemaining > 0) {
                isPaused = false;
                await interaction.reply({ content: 'Timer started!', ephemeral: true });
                startTimer(interaction.channel);
            } else {
                await interaction.reply({ content: 'Cannot start the timer. Please ensure the timer is set with a valid duration.', ephemeral: true });
            }
            break;
        case 'pause':
            isPaused = true;
            await interaction.reply({ content: 'Timer paused!', ephemeral: true });
            break;
        case 'resume':
            isPaused = false;
            await interaction.reply({ content: 'Timer resumed!', ephemeral: true });
            break;
        case 'reset':
            clearInterval(timer);
            secondsRemaining = 0; // Reset to zero or prompt for new time input
            notifiedLastMinute = false; // Reset notification tracker
            await interaction.reply({ content: 'Timer reset! Use `/timer` command to set a new time.', ephemeral: true });
            break;
    }
});

function startTimer(channel) {
    timer = setInterval(async () => {
        if (!isPaused) {
            if (secondsRemaining > 0) {
                // Check if there's 1 minute (60 seconds) left
                if (secondsRemaining === 60 && !notifiedLastMinute) {
                    await channel.send('⚠️ One minute remaining! ⚠️');
                    notifiedLastMinute = true; // Set the notification tracker
                }
                secondsRemaining--;
            } else {
                clearInterval(timer);
                await channel.send({ content: 'Time is up!', components: [] });
                return;
            }
            
            // Update the timer message only when seconds remaining changes
            await timerMessage.edit({ content: `${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s remaining...` });
        }
    }, 1000);
}



client.login(TOKEN);
