require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder 
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

// --- نظام تحديث الأوامر الاحترافي ---
client.once('ready', async () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('level').setDescription('View your current rank and XP'),
        new SlashCommandBuilder().setName('lb').setDescription('View the Top 10 players'),
        new SlashCommandBuilder().setName('reset').setDescription('Clear all server data')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        // تحديث الأوامر لكل السيرفرات (Global)
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// --- باقي الكود كما هو ---
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

    if (interaction.commandName === 'level') {
        const data = levels.ensure(key, { xp: 0, level: 0, userId: interaction.user.id });
        const neededXp = 150 * Math.pow(2, data.level);
        const progress = Math.round((data.xp / neededXp) * 10);
        const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle(`👤 Player Profile: ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '⭐ Rank / Level', value: `\`Level ${data.level}\``, inline: true },
                { name: '🔥 Current XP', value: `\`${data.xp} / ${neededXp}\``, inline: true },
                { name: '📈 Progress Bar', value: `\`${bar}\` **${progress * 10}%**` }
            )
            .setFooter({ text: 'NoMercy Network | System Online' })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }

    else if (interaction.commandName === 'lb') {
        const sorted = Array.from(levels.values()).sort((a, b) => b.level - a.level).slice(0, 10);
        let list = sorted.map((u, i) => `${i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'} **#${i + 1}** <@${u.userId}> • Level: **${u.level}**`).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x8A2BE2)
            .setTitle("🏆 NoMercy Global Leaderboard")
            .setDescription(list || "No players ranked yet.")
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
