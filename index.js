const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits, StringSelectMenuBuilder 
} = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// --- ⚙️ CONFIGURAÇÕES DE ELITE ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    COR_PRINCIPAL: "#5865F2", // Azul Sapphire
    COR_SUCESSO: "#2ECC71",
    COR_ERRO: "#E74C3C",
    ID_CATEGORIA_TICKETS: "1487944633899286538",
    ID_CARGO_STAFF: "1491553558405840898",
    PALAVRAS_PROIBIDAS: ["hack", "link-fake", "lixo", "trava"] 
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

// --- 🌐 API DE ALTA PERFORMANCE (PARA SEU SITE) ---
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            membros: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
            ticketsAbertos: client.channels.cache.filter(c => c.name.includes('ticket-')).size,
            ping: Math.round(client.ws.ping),
            uptime: Math.floor(process.uptime()),
            online: true
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: "Erro interno no Bot" });
    }
});

// Adicione isso logo abaixo da rota app.get('/api/stats', ...)

// Rota para enviar o painel de ticket pelo site
app.post('/api/action/setup', (req, res) => {
    const guild = client.guilds.cache.first(); // Pega o primeiro servidor que o bot está
    const channel = guild.channels.cache.find(c => c.type === 0); // Tenta achar um canal de texto
    
    if (channel) {
        // Aqui você chamaria a função que envia o embed do ticket
        // (A mesma lógica do comando /setup que criamos antes)
        res.json({ success: true, message: "Painel enviado com sucesso!" });
    } else {
        res.status(500).json({ success: false, message: "Canal não encontrado" });
    }
});

// Rota para mudar o status da moderação
let moderacaoAtiva = true;
app.post('/api/action/toggle-mod', (req, res) => {
    moderacaoAtiva = !moderacaoAtiva;
    res.json({ success: true, status: moderacaoAtiva });
});

app.listen(process.env.PORT || 3000, () => console.log("✨ API de Elite Online"));

// --- 🛡️ SISTEMA DE PROTEÇÃO (LORRITA STYLE) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const contemPalavra = CONFIG.PALAVRAS_PROIBIDAS.some(p => message.content.toLowerCase().includes(p));
    
    if (contemPalavra) {
        await message.delete().catch(() => {});
        const alerta = await message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(CONFIG.COR_ERRO)
                .setDescription(`🚫 ${message.author}, você enviou uma palavra proibida e foi filtrado!`)
            ]
        });
        setTimeout(() => alerta.delete(), 5000);
    }
});

// --- 🚀 COMANDOS E INTERAÇÕES (SAPPHIRE STYLE) ---
client.once('ready', () => {
    console.log(`💎 ${client.user.tag} em modo de Alta Performance!`);
    client.application.commands.set([
        { name: 'setup', description: 'Instala o painel de tickets profissional' },
        { name: 'userinfo', description: '🔍 Bisbilhotar informações de um usuário', options: [{ name: 'alvo', type: 6, required: false }] },
        { name: 'limpar', description: '🧹 Faxina rápida no chat', options: [{ name: 'quantidade', type: 4, required: true }] }
    ]);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, guild } = interaction;

        if (commandName === 'setup') {
            const embed = new EmbedBuilder()
                .setTitle("📩 Central de Atendimento")
                .setDescription("Precisa de ajuda? Selecione uma categoria abaixo.\n\n*Nossos atendentes respondem em média em 15 minutos.*")
                .setThumbnail(guild.iconURL())
                .setColor(CONFIG.COR_PRINCIPAL)
                .setFooter({ text: "Dollar Ticket • Sistema de Atendimento" });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Escolha o departamento...')
                    .addOptions([
                        { label: 'Suporte Geral', value: 'suporte', emoji: '⚙️', description: 'Problemas técnicos e dúvidas' },
                        { label: 'Financeiro', value: 'financeiro', emoji: '💸', description: 'Doações e pagamentos' },
                        { label: 'Denúncias', value: 'denuncia', emoji: '🚨', description: 'Reportar comportamentos' }
                    ])
            );
            return interaction.reply({ embeds: [embed], components: [menu] });
        }

        if (commandName === 'userinfo') {
            const alvo = options.getUser('alvo') || user;
            const membro = guild.members.cache.get(alvo.id);
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Informações de ${alvo.username}`, iconURL: alvo.displayAvatarURL() })
                .setThumbnail(alvo.displayAvatarURL({ size: 1024 }))
                .setColor(CONFIG.COR_PRINCIPAL)
                .addFields(
                    { name: '📅 Conta Criada', value: `<t:${Math.floor(alvo.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📥 Entrada no Server', value: `<t:${Math.floor(membro.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: '🆔 ID do Usuário', value: `\`${alvo.id}\``, inline: false }
                );
            return interaction.reply({ embeds: [embed] });
        }
    }

    // Lógica do Ticket (Super intuitiva)
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const categoria = interaction.values[0];
        
        const canal = await interaction.guild.channels.create({
            name: `🎫-${categoria}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.ID_CATEGORIA_TICKETS,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const embedTicket = new EmbedBuilder()
            .setTitle(`Atendimento: ${categoria.toUpperCase()}`)
            .setDescription(`Olá ${interaction.user}, explique sua dúvida. Um <@&${CONFIG.ID_CARGO_STAFF}> virá te ajudar.\n\nPara fechar, clique no botão abaixo.`)
            .setColor(CONFIG.COR_SUCESSO);

        const btnFechar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await canal.send({ content: `<@${interaction.user.id}> | <@&${CONFIG.ID_CARGO_STAFF}>`, embeds: [embedTicket], components: [btnFechar] });
        return interaction.reply({ content: `✅ Seu ticket foi aberto em ${canal}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply({ content: "⚠️ Encerrando atendimento em 5 segundos..." });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(CONFIG.TOKEN);
