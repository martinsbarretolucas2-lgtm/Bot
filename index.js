const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// --- 🌐 API PARA O DASHBOARD ---
// Essa parte precisa vir ANTES do bot ligar para o Render não dar erro de porta
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) || 0,
        ticketsAbertos: client.channels.cache.filter(c => c.name.includes('ticket-')).size || 0,
        ping: client.ws.ping ? Math.round(client.ws.ping) : 0,
        online: true
    });
});

app.get('/', (req, res) => res.send("Bot Dollar Ticket Online!"));

app.listen(process.env.PORT || 3000, () => console.log("✅ API do Site ligada!"));

// --- 🤖 CONFIGURAÇÃO DO BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`✅ Logado no Discord como ${client.user.tag}`);
});

// --- 🔑 LOGIN ---
// O TOKEN deve ser uma Environment Variable no Render
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ Erro no Token! Verifique se a variável TOKEN está certa no Render.");
});
client.login(process.env.TOKEN);
