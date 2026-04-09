const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits, StringSelectMenuBuilder 
} = require('discord.js');
const express = require('express');
const cors = require('cors');
const { QuickDB } = require("quick.db");

const app = express();
const db = new QuickDB();
app.use(cors());

// --- CONFIGURAÇÃO (AJUSTE SEUS IDs AQUI) ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    ID_CANAL_LOGS: "1491553429288521758"
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

// --- API PARA O SEU SITE ---
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) || 0,
        ticketsAbertos: client.channels.cache.filter(c => c.name.includes('ticket-')).size || 0,
        ping: Math.round(client.ws.ping),
        online: true
    });
});

app.get('/', (req, res) => res.send('Bot Premium Online!'));
app.listen(process.env.PORT || 3000);

// --- QUANDO O BOT LIGA ---
client.once('ready', () => {
    console.log(`🚀 Logado como ${client.user.tag}`);
    
    // Registra todos os comandos de uma vez
    client.application.commands.set([
        { name: 'enviar-painel', description: 'Envia o painel de tickets' },
        { name: 'userinfo', description: 'Mostra info de um usuário', options: [{ name: 'usuario', type: 6, required: false }] },
        { name: 'serverinfo', description: 'Mostra info do servidor' },
        { name: 'limpar', description: 'Limpa mensagens', options: [{ name: 'qtd', type: 4, required: true }] }
    ]);
});

// --- TRATAMENTO DE COMANDOS E INTERAÇÕES ---
client.on('interactionCreate', async interaction => {
    const { guild, user, channel, customId, commandName, options } = interaction;

    // 1. COMANDOS DE SLASH (/)
    if (interaction.isChatInputCommand()) {
        
        if (commandName === 'setup-ticket') {
            const embed = new EmbedBuilder()
                .setTitle("🎫 Central de Suporte")
                .setDescription("Selecione uma categoria para abrir um ticket.")
                .setColor("#5865F2");

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket')
                    .setPlaceholder('Escolha o motivo...')
                    .addOptions([
                        { label: 'Suporte', value: 'suporte', emoji: '🛠️' },
                        { label: 'Financeiro', value: 'financeiro', emoji: '💸' }
                    ])
            );
            return interaction.reply({ embeds: [embed], components: [menu] });
        }

        if (commandName === 'userinfo') {
            const alvo = options.getUser('usuario') || user;
            const membro = guild.members.cache.get(alvo.id);
            const embed = new EmbedBuilder()
                .setTitle(`👤 Info de ${alvo.username}`)
                .setThumbnail(alvo.displayAvatarURL())
                .setColor("Blue")
                .addFields(
                    { name: '🆔 ID', value: `\`${alvo.id}\``, inline: true },
                    { name: '📅 Criado', value: `<t:${Math.floor(alvo.createdTimestamp / 1000)}:R>`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'limpar') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply("Sem permissão.");
            const qtd = options.getInteger('qtd');
            await channel.bulkDelete(qtd > 100 ? 100 : qtd);
            return interaction.reply({ content: `✅ Limpei ${qtd} mensagens.`, ephemeral: true });
        }
    }

    // 2. LÓGICA DO TICKET (MENU E BOTÕES)
    if (interaction.isStringSelectMenu() && customId === 'menu_ticket') {
        const canal = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ID_CATEGORIA_TICKETS,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger)
        );

        await canal.send({ content: `Olá ${user}, aguarde um <@&${CONFIG.ID_CARGO_STAFF}>.`, components: [btn] });
        return interaction.reply({ content: `Ticket criado: ${canal}`, ephemeral: true });
    }

    if (interaction.isButton() && customId === 'fechar_ticket') {
        await interaction.reply("Fechando em 5 segundos...");
        setTimeout(() => channel.delete(), 5000);
    }
});

client.login(CONFIG.TOKEN);
