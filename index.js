require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionsBitField 
} = require('discord.js');
const Enmap = require('enmap');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('NoMercy Bot is Online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const levels = new (Enmap.default || Enmap)({ name: "levels" });

client.once('ready', async () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('level').setDescription('View your current rank and XP'),
        new SlashCommandBuilder().setName('lb').setDescription('View the Top 10 players'),
        new SlashCommandBuilder().setName('reset').setDescription('Clear all server data (Admin Only)')
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
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
        message.channel.send(`🎉 **Level Up!** ${message.author} reached **Level ${data.level + 1}**.`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const key = `${interaction.guild.id}-${interaction.user.id}`;

    // أمر الـ Level
    if (interaction.commandName === 'level') {
        const data = levels.ensure(key, { xp: 0, level: 0, userId: interaction.user.id });
        const neededXp = 150 * Math.pow(2, data.level);
        const progress = Math.round((data.xp / neededXp) * 10);
        const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle(`👤 Player Profile: ${interaction.user.username}`)
            .addFields(
                { name: '⭐ Level', value: `\`${data.level}\``, inline: true },
                { name: '🔥 XP', value: `\`${data.xp} / ${neededXp}\``, inline: true },
                { name: 'Progress', value: `\`${bar}\` **${progress * 10}%**` }
            );
        await interaction.reply({ embeds: [embed] });
    }

    // أمر الـ LB (بدون إيموجي)
    else if (interaction.commandName === 'lb') {
        const sorted = Array.from(levels.values()).sort((a, b) => b.level - a.level).slice(0, 10);
        let list = sorted.map((u, i) => `**${i + 1}.** <@${u.userId}> - Level: **${u.level}**`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle("🏆 Global Leaderboard")
            .setDescription(list || "No players ranked yet.");
        await interaction.reply({ embeds: [embed] });
    }

    // أمر الـ Reset (للأدمن فقط)
    else if (interaction.commandName === 'reset') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
        }
        levels.clear();
        await interaction.reply("✅ All server level data has been cleared.");
    }
});

client.login(process.env.TOKEN);
