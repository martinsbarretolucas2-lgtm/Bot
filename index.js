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
            const logChan = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
            if (logChan) logChan.send(`✅ **Ticket Aberto:** ${user.tag} (${user.id}) | Canal: ${canal.name}`);

            return interaction.editReply(`Seu ticket foi criado: ${canal}`);
        }

        // --- FUNÇÃO: ASSUMIR (CLAIM) ---
        if (customId === 'claim') {
            const responsavel = await db.get(`ticket_${channel.id}_staff`);
            if (responsavel) return interaction.reply({ content: `Este ticket já está sendo atendido por <@${responsavel}>`, ephemeral: true });

            await db.set(`ticket_${channel.id}_staff`, user.id);
            
            // LOG DE ASSUMIR
            const logChan = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
            if (logChan) logChan.send(`👤 **Ticket Assumido:** ${user.tag} assumiu o ticket de <#${channel.id}>`);

            return interaction.reply({ content: `O moderador ${user} agora é o responsável por este ticket!` });
        }

        // --- FUNÇÃO: FECHAR ---
        if (customId === 'close') {
            await interaction.reply("🔒 Este ticket será fechado e o histórico registrado.");
            
            // Remove o ticket do banco de dados do usuário para ele poder abrir outro
            // (Busca quem era o dono pelo nome do canal ou metadados)
            const logChan = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
            if (logChan) logChan.send(`🔒 **Ticket Fechado:** Canal #${channel.name} fechado por ${user.tag}`);

            // Pequeno delay para o pessoal ler o aviso
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
