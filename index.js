const express = require('express');
const app = express();

// Servidor Web para o Render não desligar
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot de Tickets Online!'));
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits 
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

// --- CONFIGURAÇÃO ---
const CONFIG = {
    TOKEN: process.env.TOKEN, // Segurança: Puxa das variáveis do Render
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    ID_CANAL_LOGS: "1491553429288521758"
};

client.once('ready', () => {
    console.log(`🤖 Bot online como ${client.user.tag}`);
    client.application.commands.create({
        name: 'setup-ticket',
        description: 'Envia o painel inicial de tickets',
    });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup-ticket') {
            const embed = new EmbedBuilder()
                .setTitle("Central de Suporte")
                .setDescription("Clique no botão abaixo para abrir um ticket de atendimento.")
                .setColor(0x2f3136);

            const botao = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Abrir Ticket')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [botao] });
        }
    }

    if (interaction.isButton()) {
        const { customId, guild, user, channel } = interaction;

        if (customId === 'abrir_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const canal = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                parent: CONFIG.ID_CATEGORIA_TICKETS,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: CONFIG.ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedStaff = new EmbedBuilder()
                .setTitle("Novo Ticket")
                .setDescription(`Usuário: ${user}\nAguarde um staff assumir.`)
                .setColor("Blue");

            const botoesStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `<@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedStaff], components: [botoesStaff] });
            await interaction.editReply(`Ticket criado: ${canal}`);
        }

        if (customId === 'assumir_ticket') {
            const jaAssumido = await db.get(`ticket_${channel.id}_staff`);
            if (jaAssumido) return interaction.reply({ content: "Já assumido!", ephemeral: true });

            await db.set(`ticket_${channel.id}_staff`, user.id);
            await interaction.reply({ content: `${user} assumiu este ticket.` });
        }

        if (customId === 'fechar_ticket') {
            await interaction.reply("Fechando em 5 segundos...");
            setTimeout(() => channel.delete(), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
