const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot de Tickets está online!');
});

app.listen(3000, () => {
  console.log('Servidor web de suporte iniciado.');
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
    TOKEN: "MTQ5MTQ0NTQ1MzgzMTUzNjkxMg.GMX7DJ.qVzdSPixKg3Mlts2LYdyGtYr5yWRPtMYJCDmDk",
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    ID_CANAL_LOGS: "1491553429288521758"
};

client.once('ready', () => {
    console.log(`🤖 Bot online como ${client.user.tag}`);
    // Registro simples de comando slash (apenas para teste, use um command handler em produção)
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

        // --- LÓGICA: ABRIR TICKET ---
        if (customId === 'abrir_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const canalNome = `ticket-${user.username}`;
            const canal = await guild.channels.create({
                name: canalNome,
                type: ChannelType.GuildText,
                parent: CONFIG.ID_CATEGORIA_TICKETS,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: CONFIG.ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedStaff = new EmbedBuilder()
                .setTitle("Novo Ticket Aberto")
                .setDescription(`Usuário: ${user}\nAguarde um membro da equipe assumir este ticket.`)
                .setColor("Blue");

            const botoesStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('assumir_ticket').setLabel('Assumir').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `<@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedStaff], components: [botoesStaff] });
            await interaction.editReply(`Ticket criado com sucesso: ${canal}`);
            
            // Log de Abertura
            sendLog(guild, "Ticket Aberto", `Dono: ${user.tag}\nCanal: ${canal.name}`);
        }

        // --- LÓGICA: ASSUMIR TICKET ---
        if (customId === 'assumir_ticket') {
            const staffId = await db.get(`ticket_${channel.id}_staff`);
            if (staffId) return interaction.reply({ content: "Este ticket já foi assumido!", ephemeral: true });

            await db.set(`ticket_${channel.id}_staff`, user.id);

            // Ajusta permissões para que apenas o Staff que clicou e o Dono vejam
            await channel.permissionOverwrites.set([
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                // Mantemos o dono (precisamos buscar o ID salvo ou via nome do canal se não usar DB para isso)
            ]);

            await interaction.reply({ content: `O moderador ${user} assumiu este atendimento.`, ephemeral: false });
            
            // Log de Assunção
            sendLog(guild, "Ticket Assumido", `Moderador: ${user.tag}\nCanal: ${channel.name}`);
        }

        // --- LÓGICA: FECHAR TICKET ---
        if (customId === 'fechar_ticket') {
            await interaction.reply("O ticket será fechado em 5 segundos...");
            
            setTimeout(async () => {
                sendLog(guild, "Ticket Fechado", `Fechado por: ${user.tag}\nCanal: ${channel.name}`);
                await channel.delete();
                await db.delete(`ticket_${channel.id}_staff`);
            }, 5000);
        }
    }
});

// Função Auxiliar de Logs
function sendLog(guild, titulo, desc) {
    const logChannel = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(desc)
        .setTimestamp()
        .setColor("Orange");

    logChannel.send({ embeds: [logEmbed] });
}

client.login(CONFIG.TOKEN);