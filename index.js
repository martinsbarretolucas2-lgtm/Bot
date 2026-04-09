const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(cors());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Rota que o seu site procura
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        ticketsAbertos: 0, // Aqui você pode somar seus tickets depois
        ping: Math.round(client.ws.ping),
        online: true
    });
});

app.get('/', (req, res) => res.send('Bot Online!'));

// Porta obrigatória para o Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));

client.on('ready', () => console.log(`Bot ${client.user.tag} logado!`));

client.login(process.env.TOKEN);
