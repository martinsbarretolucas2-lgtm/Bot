const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot de Tickets Profissional Online!'));
app.listen(port, () => console.log(`Servidor na porta ${port}`));

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

const CONFIG = {
    TOKEN: process.env.TOKEN,
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    ID_CANAL_LOGS: "1491553429288521758"
};

client.once('ready', () => {
    console.log(`🤖 Bot online: ${client.user.tag}`);
    client.application.commands.create({
        name: 'setup-ticket',
        description: 'Envia o painel de tickets',
    });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Central de Atendimento")
            .setDescription("Precisa de ajuda? Clique no botão abaixo.\n\n*Atenção: Spam de tickets resulta em punição!*")
            .setColor("#5865F2");

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩')
        );

        return interaction.reply({ embeds: [embed], components: [btn] });
    }

    if (interaction.isButton()) {
        const { customId, guild, user, channel } = interaction;

        // --- FUNÇÃO: ABRIR TICKET (COM ANTI-SPAM) ---
        if (customId === 'abrir_ticket') {
            // Verifica se o usuário já tem um ticket no banco de dados
            const ticketAtivo = await db.get(`user_${user.id}_ticket`);
            if (ticketAtivo && guild.channels.cache.has(ticketAtivo)) {
                return interaction.reply({ content: `❌ Você já possui um ticket aberto em <#${ticketAtivo}>!`, ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

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

            // Salva no banco que este usuário abriu um ticket
            await db.set(`user_${user.id}_ticket`, canal.id);

            const staffEmbed = new EmbedBuilder()
                .setTitle("🛠️ Painel de Controle")
                .setDescription(`Ticket aberto por: ${user}\n\n**Aguarde um membro da equipe.**`)
                .setColor("#2ECC71");

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await canal.send({ content: `${user} | <@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [staffEmbed], components: [botoes] });
            
            // LOG DE ABERTURA
            const logChan = guild.channels.cache.get(
