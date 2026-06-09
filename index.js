require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');
const Enmap = require('enmap');
const { createCanvas, loadImage } = require('canvas');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('NoMercy Bot is Online!'));
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const levels = new Enmap({ name: "levels" });

client.once('clientReady', async () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('level').setDescription('عرض بطاقة المستوى'),
        new SlashCommandBuilder().setName('lb').setDescription('عرض قائمة المتصدرين توب 10'),
        new SlashCommandBuilder().setName('reset').setDescription('تصفير المستويات')
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const xpChannels = { "1509335030982512751": 15, "1509335059302187110": 5 };
    if (!xpChannels[message.channel.id]) return;

    const key = `${message.guild.id}-${message.author.id}`;
    levels.ensure(key, { xp: 0, level: 0, userId: message.author.id });
    levels.math(key, "+", xpChannels[message.channel.id], "xp");
    
    let userData = levels.get(key);
    let neededXp = 150 * Math.pow(2, userData.level);

    if (userData.xp >= neededXp) {
        levels.math(key, "+", 1, "level");
        levels.set(key, 0, "xp");
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'level') {
        await interaction.deferReply();
        const key = `${interaction.guild.id}-${interaction.user.id}`;
        const data = levels.ensure(key, { xp: 0, level: 0, userId: interaction.user.id });
        const neededXp = 150 * Math.pow(2, data.level);
        
        const canvas = createCanvas(900, 250);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 900, 250);

        ctx.fillStyle = '#111'; ctx.fillRect(200, 150, 600, 20);
        const progress = Math.min((data.xp / neededXp) * 600, 600);
        ctx.fillStyle = '#8a2be2'; ctx.fillRect(200, 150, progress, 20);

        ctx.fillStyle = '#fff'; ctx.font = 'bold 35px Arial';
        ctx.fillText(interaction.user.username, 200, 100);
        ctx.font = '20px Arial'; ctx.fillStyle = '#aaa';
        ctx.fillText(`LVL: ${data.level} | XP: ${data.xp} / ${neededXp}`, 200, 135);
        
        try {
            const avatar = await loadImage(interaction.user.displayAvatarURL({ extension: 'png' }));
            ctx.save(); ctx.beginPath(); ctx.arc(100, 125, 60, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(avatar, 40, 65, 120, 120); ctx.restore();
        } catch(e) {}

        await interaction.editReply({ files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'level.png' })] });
    }

    else if (interaction.commandName === 'lb') {
        await interaction.deferReply();
        const sorted = Array.from(levels.values()).sort((a, b) => b.level - a.level).slice(0, 10);
        const canvas = createCanvas(800, 850);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 800, 850);
        
        ctx.fillStyle = '#fff'; ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center'; ctx.fillText("TOP 10 PLAYERS", 400, 80);

        for (let i = 0; i < sorted.length; i++) {
            const member = await interaction.guild.members.fetch(sorted[i].userId).catch(() => null);
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(50, 130 + (i * 70), 700, 50);
            ctx.fillStyle = i < 3 ? '#ffcc00' : '#fff';
            ctx.font = 'bold 22px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}. ${member?.user.username || "User"}`, 80, 163 + (i * 70));
            ctx.textAlign = 'right'; ctx.fillStyle = '#8a2be2';
            ctx.fillText(`LVL ${sorted[i].level}`, 730, 163 + (i * 70));
        }
        await interaction.editReply({ files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'lb.png' })] });
    }
});

client.login(process.env.TOKEN);
