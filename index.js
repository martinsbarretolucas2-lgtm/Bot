const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(port, () => console.log(`Servidor na porta ${port}`));

const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits, StringSelectMenuBuilder 
} = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
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
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets' },
        { name: 'limpar', description: 'Limpa o chat', options: [{ name: 'qtd', type: 4, description: 'Quantidade', required: true }] }
    ]);
});

client.on('interactionCreate', async interaction => {
    // Comando Setup
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Central de Atendimento")
            .setDescription("Selecione o motivo do contato no menu abaixo:")
            .setColor("#5865F2");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_ticket')
                .setPlaceholder('Escolha uma categoria...')
                .addOptions([
                    { label: 'Dúvidas / Geral', value: 'geral', emoji: '💡' },
                    { label: 'Financeiro', value: 'financeiro', emoji: '💸' },
                    { label: 'Denúncias', value: 'denuncia', emoji: '🚫' },
                ])
        );

        return interaction.reply({ embeds: [embed], components: [menu] });
    }

    // Lógica do Menu (AQUI ESTAVA O ERRO)
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket') {
        const categoria = interaction.values[0];
        const { guild, user } = interaction;

        // Anti-Spam: Verifica se já tem ticket
        const ticketAtivo = await db.get(`user_${user.id}_ticket`);
        if (ticketAtivo && guild.channels.cache.has(ticketAtivo)) {
            return interaction.reply({ content: `❌ Você já tem um ticket em <#${ticketAtivo}>`, ephemeral: true });
        }

        await interaction.reply({ content: `Criando seu ticket de **${categoria}**...`, ephemeral: true });

        // CRIAÇÃO REAL DO CANAL
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

        await db.set(`user_${user.id}_ticket`, canal.id);

        const embedTicket = new EmbedBuilder()
            .setTitle(`Atendimento: ${categoria.toUpperCase()}`)
            .setDescription(`Olá ${user}, aguarde um momento. Um <@&${CONFIG.ID_CARGO_STAFF}> virá te ajudar.`)
            .setColor("Green");

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
            new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await canal.send({ content: `${user} | <@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [botoes] });
    }

    // Lógica dos Botões (Fechar/Assumir)
    if (interaction.isButton()) {
        const { customId, channel, user } = interaction;

        if (customId === 'claim') {
            await interaction.reply({ content: `✅ Este ticket agora está sendo atendido por ${user}` });
        }

        if (customId === 'close') {
            await interaction.reply("🔒 Fechando canal em 5 segundos...");
            // Opcional: deletar do banco de dados aqui para o usuário poder abrir outro
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
