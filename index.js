const cors = require('cors'); // Você precisará dar 'npm install cors'
app.use(cors());

// Rota para pegar estatísticas do servidor para o seu site
app.get('/api/stats', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        ticketsAbertos: client.channels.cache.filter(c => c.name.startsWith('ticket-')).size,
        status: "Online"
    });
});

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Premium com Transcript Online!'));
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
    console.log(`🚀 Sistema de Logs e Transcripts Ativo em ${client.user.tag}`);
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets' },
        { name: 'limpar', description: 'Limpa o chat', options: [{ name: 'qtd', type: 4, description: 'Quantidade', required: true }] }
    ]);
});

client.on('interactionCreate', async interaction => {
    const { guild, user, channel, customId } = interaction;

    // --- SETUP TICKET ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Central de Suporte")
            .setDescription("Selecione uma categoria abaixo para iniciar o atendimento.")
            .setColor("#5865F2")
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_ticket')
                .setPlaceholder('Escolha o motivo do contato...')
                .addOptions([
                    { label: 'Dúvidas', value: 'duvidas', emoji: '💡' },
                    { label: 'Financeiro', value: 'financeiro', emoji: '💸' },
                    { label: 'Denúncia', value: 'denuncia', emoji: '🚫' },
                ])
        );
        return interaction.reply({ embeds: [embed], components: [menu] });
    }

    // --- ABRIR TICKET (Lógica com Botão de Ir ao Ticket) ---
    if (interaction.isStringSelectMenu() && customId === 'menu_ticket') {
        const categoria = interaction.values[0];
        
        const ticketAtivo = await db.get(`user_${user.id}_ticket`);
        if (ticketAtivo && guild.channels.cache.has(ticketAtivo)) {
            return interaction.reply({ content: `❌ Você já possui um ticket: <#${ticketAtivo}>`, ephemeral: true });
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

        // LOG BONITO DE ABERTURA
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
        if (canalLog) {
            const embedLog = new EmbedBuilder()
                .setTitle("✅ Ticket Criado")
                .setColor("#2ECC71")
                .addFields(
                    { name: "👤 Usuário", value: `${user.tag} (${user.id})`, inline: true },
                    { name: "📂 Categoria", value: categoria, inline: true }
                )
                .setTimestamp();

            const btnIrAoTicket = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel("Ir para o Ticket").setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${canal.id}`)
            );

            canalLog.send({ embeds: [embedLog], components: [btnIrAoTicket] });
        }

        await interaction.reply({ content: `✅ Canal criado: ${canal}`, ephemeral: true });

        const embedTicket = new EmbedBuilder()
            .setTitle(`Suporte: ${categoria.toUpperCase()}`)
            .setDescription(`Olá ${user}, aguarde um <@&${CONFIG.ID_CARGO_STAFF}>.`)
            .setColor("#5865F2");

        const btnTicket = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
            new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await canal.send({ content: `${user} | <@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [btnTicket] });
    }

    // --- BOTÕES (Assumir / Fechar com Transcript) ---
    if (interaction.isButton()) {
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);

        if (customId === 'claim') {
            await interaction.reply(`🙋‍♂️ ${user} assumiu o atendimento.`);
            if (canalLog) {
                const embedClaim = new EmbedBuilder()
                    .setDescription(`👤 **${user.tag}** assumiu o ticket <#${channel.id}>`)
                    .setColor("#F1C40F");
                canalLog.send({ embeds: [embedClaim] });
            }
        }

        if (customId === 'close') {
            await interaction.reply("🔒 Gerando histórico e fechando...");

            // --- GERAÇÃO DE TRANSCRIPT ---
            const mensagens = await channel.messages.fetch({ limit: 100 });
            let transcript = `HISTÓRICO DO TICKET: #${channel.name}\n\n`;
            mensagens.reverse().forEach(m => {
                transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
            });

            if (canalLog) {
                const buffer = Buffer.from(transcript, 'utf-8');
                const embedClose = new EmbedBuilder()
                    .setTitle("🔒 Ticket Encerrado")
                    .addFields(
                        { name: "Canal", value: `#${channel.name}`, inline: true },
                        { name: "Fechado por", value: user.tag, inline: true }
                    )
                    .setColor("#E74C3C")
                    .setTimestamp();

                await canalLog.send({ 
                    embeds: [embedClose], 
                    files: [{ attachment: buffer, name: `transcript-${channel.name}.txt` }] 
                });
            }

            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
