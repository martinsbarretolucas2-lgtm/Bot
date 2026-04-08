const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000);

const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits, StringSelectMenuBuilder 
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
});

const CONFIG = {
    TOKEN: process.env.TOKEN,
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    ID_CANAL_LOGS: "1491553429288521758" // <--- Verifique se este ID está correto!
};

client.once('ready', () => console.log(`🤖 Logado como ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
    // SETUP
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Central de Atendimento")
            .setDescription("Selecione uma categoria abaixo:")
            .setColor("Blue");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_ticket')
                .setPlaceholder('Escolha o motivo...')
                .addOptions([
                    { label: 'Dúvidas', value: 'duvidas', emoji: '💡' },
                    { label: 'Financeiro', value: 'financeiro', emoji: '💸' },
                ])
        );
        return interaction.reply({ embeds: [embed], components: [menu] });
    }

    // MENU (ABRIR TICKET + LOG)
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket') {
        const categoria = interaction.values[0];
        const { guild, user } = interaction;

        await interaction.reply({ content: `Criando ticket de ${categoria}...`, ephemeral: true });

        const canal = await guild.channels.create({
            name: `${categoria}-${user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ID_CATEGORIA_TICKETS,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        // ENVIAR LOG DE ABERTURA
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
        if (canalLog) {
            const embedLog = new EmbedBuilder()
                .setTitle("✅ Ticket Aberto")
                .addFields(
                    { name: "Usuário", value: `${user} (${user.id})` },
                    { name: "Categoria", value: categoria },
                    { name: "Canal", value: `${canal}` }
                )
                .setColor("Green")
                .setTimestamp();
            canalLog.send({ embeds: [embedLog] });
        }

        const embedTicket = new EmbedBuilder()
            .setDescription(`Olá ${user}, suporte em breve.`)
            .setColor("Green");

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger)
        );

        await canal.send({ content: `<@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [botoes] });
    }

    // BOTÕES (LOG DE ASSUMIR E FECHAR)
    if (interaction.isButton()) {
        const { customId, channel, user, guild } = interaction;
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);

        if (customId === 'claim') {
            await interaction.reply({ content: `🙋‍♂️ ${user} assumiu este ticket.` });
            if (canalLog) canalLog.send(`🙋‍♂️ **Ticket Assumido:** ${user.tag} assumiu o canal ${channel}`);
        }

        if (customId === 'close') {
            await interaction.reply("🔒 Fechando...");
            if (canalLog) canalLog.send(`🔒 **Ticket Fechado:** Canal #${channel.name} deletado por ${user.tag}`);
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
