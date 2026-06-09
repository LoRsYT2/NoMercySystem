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
        const key = `${interaction.guild.id}-${interaction.user.id}`;
        const data = levels.ensure(key, { xp: 0, level: 0 });
        
        // رسم بسيط جداً للتأكد من ظهور شيء
        const canvas = createCanvas(400, 100);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`User: ${interaction.user.username}`, 20, 40);
        ctx.fillText(`Level: ${data.level}`, 20, 70);

        await interaction.editReply({ files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'test.png' })] });
    }
});

client.login(process.env.TOKEN);
