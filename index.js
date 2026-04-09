const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Rota para o seu site (GitHub Pages) buscar dados
app.get('/status', (req, res) => {
    res.json({
        membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        ping: client.ws.ping,
        online: true
    });
});

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
    console.log(`🚀 Bot e API Online: ${client.user.tag}`);
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets' },
        { name: 'limpar', description: 'Limpa o chat', options: [{ name: 'qtd', type: 4, description: 'Quantidade', required: true }] }
    ]);
});

client.on('interactionCreate', async interaction => {
    const { guild, user, channel, customId } = interaction;

    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const embed = new EmbedBuilder()
            .setTitle("🎫 Central de Suporte")
            .setDescription("Selecione uma categoria abaixo no menu:")
            .setColor("#5865F2");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_ticket')
                .setPlaceholder('Escolha o motivo...')
                .addOptions([
                    { label: 'Dúvidas', value: 'duvidas', emoji: '💡' },
                    { label: 'Financeiro', value: 'financeiro', emoji: '💸' },
                    { label: 'Denúncia', value: 'denuncia', emoji: '🚫' },
                ])
        );
        return interaction.reply({ embeds: [embed], components: [menu] });
    }

    if (interaction.isStringSelectMenu() && customId === 'menu_ticket') {
        const categoria = interaction.values[0];
        
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

        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);
        if (canalLog) {
            const embedLog = new EmbedBuilder()
                .setTitle("✅ Ticket Criado")
                .setColor("#2ECC71")
                .addFields(
                    { name: "👤 Usuário", value: `${user.tag}`, inline: true },
                    { name: "📂 Categoria", value: categoria, inline: true }
                );
            const btnLink = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel("Ir ao Ticket").setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${canal.id}`)
            );
            canalLog.send({ embeds: [embedLog], components: [btnLink] });
        }

        await interaction.reply({ content: `✅ Ticket aberto em ${canal}`, ephemeral: true });

        const embedTicket = new EmbedBuilder()
            .setDescription(`Olá ${user}, suporte em breve.`)
            .setColor("Green");

        const btnTicket = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim').setLabel('Assumir').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close').setLabel('Fechar').setStyle(ButtonStyle.Danger)
        );

        await canal.send({ content: `<@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [btnTicket] });
    }

    if (interaction.isButton()) {
        const canalLog = guild.channels.cache.get(CONFIG.ID_CANAL_LOGS);

        if (customId === 'claim') {
            await interaction.reply(`🙋‍♂️ ${user} assumiu este ticket.`);
        }

        if (customId === 'close') {
            await interaction.reply("🔒 Gerando transcript e fechando...");
            const mensagens = await channel.messages.fetch({ limit: 100 });
            let transcript = mensagens.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');

            if (canalLog) {
                const buffer = Buffer.from(transcript, 'utf-8');
                canalLog.send({ 
                    content: `🔒 Ticket #${channel.name} fechado por ${user.tag}`,
                    files: [{ attachment: buffer, name: `transcript-${channel.name}.txt` }] 
                });
            }
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
