const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// API para o seu site ler os números
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        ping: Math.round(client.ws.ping),
        online: true
    });
});

app.get('/', (req, res) => res.send("Bot Online!"));

app.listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`✅ Logado como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
