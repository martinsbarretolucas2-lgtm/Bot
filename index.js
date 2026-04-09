const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
});

// Configurações
const CONFIG = {
    TOKEN: process.env.TOKEN,
    ID_CATEGORIA: "1487944633899286538",
    PALAVRAS_PROIBIDAS: ["hack", "link-fake", "lixo"] // Adicione mais aqui
};

// API para o Site
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) || 0,
        ticketsAbertos: client.channels.cache.filter(c => c.name.includes('ticket-')).size || 0,
        ping: Math.round(client.ws.ping),
        online: true
    });
});

app.listen(process.env.PORT || 3000, () => console.log("API Online"));

// Auto-Moderação
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (CONFIG.PALAVRAS_PROIBIDAS.some(p => message.content.toLowerCase().includes(p))) {
        await message.delete().catch(() => {});
        message.channel.send(`⚠️ ${message.author}, palavra proibida detectada!`).then(m => setTimeout(() => m.delete(), 5000));
    }
});

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}`);
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets' },
        { name: 'userinfo', description: 'Mostra info de um usuário', options: [{ name: 'usuario', type: 6 }] }
    ]);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'userinfo') {
        const alvo = interaction.options.getUser('usuario') || interaction.user;
        const embed = new EmbedBuilder()
            .setTitle(`👤 Info de ${alvo.username}`)
            .setThumbnail(alvo.displayAvatarURL())
            .setColor("#5865F2")
            .addFields({ name: 'ID', value: alvo.id });
        return interaction.reply({ embeds: [embed] });
    }
    // ... restante da sua lógica de ticket aqui
});

client.login(CONFIG.TOKEN);
