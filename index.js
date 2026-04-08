const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Premium Online!'));
app.listen(process.env.PORT || 3000);

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
    console.log(`🤖 Bot Full operante: ${client.user.tag}`);
    
    // REGISTRO DE TODOS OS COMANDOS
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets' },
        { name: 'ping', description: 'Latência do bot' },
        { name: 'limpar', description: 'Limpa mensagens', options: [{ name: 'qtd', type: 4, description: 'Quantidade', required: true }] },
        { name: 'avatar', description: 'Veja o avatar de alguém', options: [{ name: 'user', type: 6, description: 'Selecione o usuário', required: true }] },
        { name: 'serverinfo', description: 'Informações do servidor' },
        { name: 'lock', description: 'Tranca o canal atual' },
        { name: 'unlock', description: 'Destranca o canal atual' },
        { name: 'slowmode', description: 'Define modo lento', options: [{ name: 'tempo', type: 4, description: 'Tempo em segundos', required: true }] },
        { name: 'setnick', description: 'Muda o nick de alguém', options: [
            { name: 'user', type: 6, description: 'Usuário', required: true },
            { name: 'nick', type: 3, description: 'Novo apelido', required: true }
        ]}
    ]);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, channel, member } = interaction;

        // --- INFO COMANDOS ---
        if (commandName === 'ping') return interaction.reply(`🏓 **${client.ws.ping}ms**`);

        if (commandName === 'avatar') {
            const user = options.getUser('user');
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${user.username}`)
                .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
                .setColor("Random");
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'serverinfo') {
            const embed = new EmbedBuilder()
                .setTitle(`🏰 ${guild.name}`)
                .addFields(
                    { name: '🆔 ID', value: guild.id, inline: true },
                    { name: '👥 Membros', value: `${guild.memberCount}`, inline: true },
                    { name: '📅 Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
                )
                .setThumbnail(guild.iconURL())
                .setColor("Blue");
            return interaction.reply({ embeds: [embed] });
        }

        // --- MODERAÇÃO ---
        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "Sem permissão.", ephemeral: true });
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
            return interaction.reply("🔒 Este canal foi trancado.");
        }

        if (commandName === 'unlock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "Sem permissão.", ephemeral: true });
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: true });
            return interaction.reply("🔓 Este canal foi destrancado.");
        }

        if (commandName === 'slowmode') {
            const tempo = options.getInteger('tempo');
            await channel.setRateLimitPerUser(tempo);
            return interaction.reply(`⏳ Modo lento definido para ${tempo} segundos.`);
        }

        if (commandName === 'setnick') {
            const alvo = options.getMember('user');
            const nick = options.getString('nick');
            await alvo.setNickname(nick);
            return interaction.reply(`✅ Nick de ${alvo} alterado para **${nick}**.`);
        }

        if (commandName === 'limpar') {
            const qtd = options.getInteger('qtd');
            await channel.bulkDelete(qtd > 100 ? 100 : qtd);
            return interaction.reply({ content: `🧹 ${qtd} mensagens limpas.`, ephemeral: true });
        }

        if (commandName === 'setup-ticket') {
            const embed = new EmbedBuilder()
                .setTitle("🎫 Central de Suporte")
                .setDescription("Escolha uma opção no menu abaixo para abrir um ticket.")
                .setColor("#2B2D31");
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket')
                    .setPlaceholder('Selecione uma categoria...')
                    .addOptions([
                        { label: 'Dúvidas', value: 'duvidas', emoji: '💡' },
                        { label: 'Financeiro', value: 'financeiro', emoji: '💰' },
                        { label: 'Denúncia', value: 'denuncia', emoji: '🚫' },
                    ])
            );
            return interaction.reply({ embeds: [embed], components: [menu] });
        }
    }

    // --- LÓGICA DO MENU DE TICKETS ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket') {
        const categoria = interaction.values[0];
        const { guild, user } = interaction;

        const ticketAtivo = await db.get(`user_${user.id}_ticket`);
        if (ticketAtivo && guild.channels.cache.has(ticketAtivo)) {
            return interaction.reply({ content: `❌ Você já tem um ticket: <#${ticketAtivo}>`, ephemeral: true });
        }

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
        await interaction.reply({ content: `Ticket criado: ${canal}`, ephemeral: true });

        // LOG DE ABERTURA
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
        if (canalLog) canalLog.send(`✅ **Novo Ticket:** ${user.tag} abriu em **${categoria}**`);

        const embedTicket = new EmbedBuilder()
            .setTitle(`Suporte: ${categoria}`)
            .setDescription(`Olá ${user}, aguarde um <@&${CONFIG.ID_CARGO_STAFF}>.`)
            .setColor("Green");

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger)
        );
        await canal.send({ content: `<@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [btn] });
    }

    // --- BOTÕES ---
    if (interaction.isButton()) {
        const { customId, channel, user, guild } = interaction;
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);

        if (customId === 'claim') {
            await interaction.reply(`🙋‍♂️ ${user} assumiu o ticket.`);
            if (canalLog) canalLog.send(`🙋‍♂️ **Ticket Assumido:** ${user.tag} em ${channel}`);
        }

        if (customId === 'close') {
            await interaction.reply("🔒 Fechando...");
            if (canalLog) canalLog.send(`🔒 **Ticket Fechado:** #${channel.name} por ${user.tag}`);
            setTimeout(() => channel.delete(), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
