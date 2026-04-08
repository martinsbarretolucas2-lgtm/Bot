const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Premium Online!'));
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
    console.log(`✅ ${client.user.tag} operando com novos comandos!`);
    
    client.application.commands.set([
        { name: 'setup-ticket', description: 'Envia o painel de tickets com menu' },
        { name: 'ping', description: 'Verifica a latência do bot' },
        { name: 'limpar', description: 'Deleta mensagens', options: [{ name: 'qtd', type: 4, description: 'Quantidade', required: true }] },
        { name: 'userinfo', description: 'Informações de um usuário', options: [{ name: 'user', type: 6, description: 'Usuário', required: true }] },
        { name: 'anunciar', description: 'Faz um anúncio em Embed', options: [
            { name: 'canal', type: 7, description: 'Canal do anúncio', required: true },
            { name: 'titulo', type: 3, description: 'Título', required: true },
            { name: 'texto', type: 3, description: 'Mensagem', required: true }
        ]},
        { name: 'ban', description: 'Bane um usuário', options: [{ name: 'user', type: 6, description: 'Usuário', required: true }, { name: 'motivo', type: 3, description: 'Motivo' }] },
        { name: 'kick', description: 'Expulsa um usuário', options: [{ name: 'user', type: 6, description: 'Usuário', required: true }] }
    ]);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, channel } = interaction;

        // --- PING ---
        if (commandName === 'ping') {
            return interaction.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
        }

        // --- USER INFO ---
        if (commandName === 'userinfo') {
            const alvo = options.getMember('user');
            const embed = new EmbedBuilder()
                .setTitle(`Info de ${alvo.user.username}`)
                .setThumbnail(alvo.user.displayAvatarURL())
                .addFields(
                    { name: 'ID', value: alvo.id, inline: true },
                    { name: 'Entrou no Servidor', value: `<t:${Math.floor(alvo.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Cargos', value: alvo.roles.cache.map(r => r).join(' ').replace('@everyone', '') || 'Nenhum' }
                )
                .setColor("Random");
            return interaction.reply({ embeds: [embed] });
        }

        // --- ANUNCIAR ---
        if (commandName === 'anunciar') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply("Sem permissão.");
            const canalAlvo = options.getChannel('canal');
            const embed = new EmbedBuilder()
                .setTitle(options.getString('titulo'))
                .setDescription(options.getString('texto'))
                .setColor("Blue")
                .setFooter({ text: `Anúncio por: ${interaction.user.tag}` });
            await canalAlvo.send({ embeds: [embed] });
            return interaction.reply({ content: "Anúncio enviado!", ephemeral: true });
        }

        // --- BAN / KICK ---
        if (commandName === 'ban') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply("Sem permissão.");
            const alvo = options.getUser('user');
            const motivo = options.getString('motivo') || "Não informado";
            await guild.members.ban(alvo, { reason: motivo });
            return interaction.reply(`🔨 ${alvo.tag} foi banido. Motivo: ${motivo}`);
        }

        // --- SETUP TICKET (COM DROPDOWN) ---
        if (commandName === 'setup-ticket') {
            const embed = new EmbedBuilder()
                .setTitle("🎟️ Suporte Especializado")
                .setDescription("Selecione a categoria do seu atendimento abaixo:")
                .setColor("#2f3136");

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket')
                    .setPlaceholder('Escolha uma opção...')
                    .addOptions([
                        { label: 'Dúvidas / Geral', value: 'geral', emoji: '💡' },
                        { label: 'Financeiro / Compras', value: 'financeiro', emoji: '💸' },
                        { label: 'Denúncias', value: 'denuncia', emoji: '🚫' },
                    ])
            );

            return interaction.reply({ embeds: [embed], components: [menu] });
        }
    }

    // --- LÓGICA DO MENU DE SELEÇÃO ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'menu_ticket') {
            const categoria = interaction.values[0];
            // Aqui você usa a mesma lógica do 'abrir_ticket' que fizemos antes
            // Mas pode mudar o nome do canal baseado na categoria escolhida!
            await interaction.reply({ content: `Iniciando seu ticket de **${categoria}**...`, ephemeral: true });
            
            // Reutilize a função de criar canal aqui...
        }
    }
});

client.login(CONFIG.TOKEN);
