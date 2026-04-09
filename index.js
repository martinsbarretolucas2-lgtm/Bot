const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// --- ⚙️ CONFIGURAÇÕES ---
const CONFIG = {
    TOKEN: process.env.TOKEN, // Verifique se o nome no Render está EXATAMENTE "TOKEN"
    COR: "#5865F2",
    ID_CATEGORIA: "1487944633899286538" 
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// --- 🌐 API PARA O SITE ---
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) || 0,
            ticketsAbertos: client.channels.cache.filter(c => c.name.includes('ticket-')).size || 0,
            ping: client.ws.ping ? Math.round(client.ws.ping) : 0,
            online: true
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: "Erro interno no Bot" });
    }
});

app.get('/', (req, res) => res.send("Bot Online!"));

// Porta obrigatória para o Render
app.listen(process.env.PORT || 3000, () => {
    console.log("✅ Servidor API ligado!");
});

// --- 🤖 LÓGICA DO BOT ---
client.once('ready', () => {
    console.log(`✅ Logado como ${client.user.tag}`);
    
    // Registrar comandos
    client.application.commands.set([
        { name: 'setup', description: 'Envia o painel de tickets' },
        { name: 'userinfo', description: 'Mostra info de um usuário', options: [{ name: 'alvo', type: 6 }] }
    ]);
});

// Sistema de Tickets e Comandos
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
            const embed = new EmbedBuilder()
                .setTitle("🎫 Central de Suporte")
                .setDescription("Clique no botão abaixo para abrir um ticket")
                .setColor(CONFIG.COR);
            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
            );
            return interaction.reply({ embeds: [embed], components: [btn] });
        }
    }

    if (interaction.isButton() && interaction.customId === 'abrir_ticket') {
        const canal = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ID_CATEGORIA,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        interaction.reply({ content: `✅ Ticket criado em ${canal}`, ephemeral: true });
    }
});

// --- 🔑 LOGIN ---
client.login(CONFIG.TOKEN).catch(err => {
    console.error("❌ Erro no Token! Verifique as Environment Variables no Render.");
});
