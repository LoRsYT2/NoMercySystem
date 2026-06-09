require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const Enmap = require('enmap');
const express = require('express');
const app = express();

// Keep-alive server for Render
app.get('/', (req, res) => res.send('NoMercy Bot is Online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Enmap setup for persistence
const levels = new (Enmap.default || Enmap)({ name: "levels" });

client.once('ready', async () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('profile').setDescription('View your level and rank card'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('View the top 10 ranked players'),
        new SlashCommandBuilder().setName('reset').setDescription('Clear all levels (Admin only)')
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    // XP Configuration
    const xpChannels = { "1509335030982512751": 15, "1509335059302187110": 5 };
    if (!xpChannels[message.channel.id]) return;

    const key = `${message.guild.id}-${message.author.id}`;
    levels.ensure(key, { xp: 0, level: 0, userId: message.author.id });
    levels.math(key, "+", xpChannels[message.channel.id], "xp");
    
    let data = levels.get(key);
    let neededXp = 150 * Math.pow(2, data.level);

    if (data.xp >= neededXp) {
        levels.math(key, "+", 1, "level");
        levels.set(key, 0, "xp");
        message.channel.send(`🎉 Congratulations ${message.author}, you reached **Level ${data.level + 1}**!`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const key = `${interaction.guild.id}-${interaction.user.id}`;

    if (interaction.commandName === 'profile') {
        const data = levels.ensure(key, { xp: 0, level: 0, userId: interaction.user.id });
        const neededXp = 150 * Math.pow(2, data.level);
        const progress = Math.round((data.xp / neededXp) * 10);
        const bar = '▓'.repeat(progress) + '░'.repeat(10 - progress);
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle(`📊 Profile: ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '⭐ Level', value: `\`${data.level}\``, inline: true },
                { name: '✨ Experience', value: `\`${data.xp} / ${neededXp} XP\``, inline: true },
                { name: 'Progress', value: `\`${bar}\` ${progress * 10}%`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'NoMercy Network System' });
            
        await interaction.reply({ embeds: [embed] });
    }

    else if (interaction.commandName === 'leaderboard') {
        const sorted = Array.from(levels.values()).sort((a, b) => b.level - a.level).slice(0, 10);
        let list = sorted.map((u, i) => `**#${i + 1}** <@${u.userId}> - **LVL ${u.level}**`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle("🥇 Global Leaderboard (Top 10)")
            .setDescription(list || "No data available yet.")
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
