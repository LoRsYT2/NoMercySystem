require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const Enmap = require('enmap');
const { createCanvas, loadImage } = require('canvas');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot is active'));
app.listen(process.env.PORT || 3000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const levels = new Enmap({ name: "levels" });

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'level') {
        await interaction.deferReply();
        const data = levels.ensure(key, { xp: 0, level: 0, userId: interaction.user.id });
        const neededXp = 150 * Math.pow(2, data.level);
        
        const canvas = createCanvas(900, 250);
        const ctx = canvas.getContext('2d');
        
        // الخلفية والنيون
        const grd = ctx.createLinearGradient(0, 0, 900, 250);
        grd.addColorStop(0, '#0f0c29'); grd.addColorStop(1, '#050505');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 900, 250);

        // شريط الـ XP
        ctx.fillStyle = '#111'; ctx.fillRect(200, 150, 600, 20);
        const progress = Math.min((data.xp / neededXp) * 600, 600);
        ctx.shadowColor = '#8a2be2'; ctx.shadowBlur = 15;
        ctx.fillStyle = '#8a2be2'; ctx.fillRect(200, 150, progress, 20);
        ctx.shadowBlur = 0;

        // النصوص
        ctx.fillStyle = '#fff'; ctx.font = 'bold 35px Arial';
        ctx.fillText(interaction.user.username, 200, 100);
        ctx.fillStyle = '#b3b3b3'; ctx.font = 'bold 20px Arial';
        ctx.fillText(`XP: ${data.xp} / ${neededXp} XP`, 200, 140);
        ctx.fillStyle = '#8a2be2'; ctx.font = 'bold 25px Arial';
        ctx.fillText(`LVL ${data.level}`, 750, 100);
        
        // الصورة
        ctx.beginPath(); ctx.arc(100, 125, 60, 0, Math.PI*2);
        ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.clip();
        try {
            const avatar = await loadImage(interaction.user.displayAvatarURL({ extension: 'png' }));
            ctx.drawImage(avatar, 40, 65, 120, 120);
        } catch(e) {}

        await interaction.editReply({ files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'level.png' })] });
    }

    else if (interaction.commandName === 'lb') {
        await interaction.deferReply();
        const sorted = Array.from(levels.values()).sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 10);
        const canvas = createCanvas(800, 850);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 800, 850);
        
        ctx.fillStyle = '#fff'; ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center'; ctx.fillText("TOP 10", 400, 80);

        for (let i = 0; i < sorted.length; i++) {
            const member = await interaction.guild.members.fetch(sorted[i].userId).catch(() => null);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(50, 130 + (i * 70), 700, 50);
            ctx.fillStyle = i < 3 ? '#ffcc00' : '#fff';
            ctx.font = 'bold 22px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}. ${member?.user.username || "User"}`, 80, 163 + (i * 70));
            ctx.fillStyle = '#8a2be2'; ctx.textAlign = 'right';
            ctx.fillText(`LVL ${sorted[i].level}`, 730, 163 + (i * 70));
        }
        await interaction.editReply({ files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'lb.png' })] });
    }

    else if (interaction.commandName === 'reset') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        levels.clear();
        await interaction.reply('✅ Reset.');
    }
});

client.login(process.env.TOKEN);
