const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const { Panel } = require('../../database/mongodb');
const EmbedCreator = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('📨 Send ticket panel using current portal configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel').setDescription('Channel for ticket panel').setRequired(true).addChannelTypes(ChannelType.GuildText)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = interaction.options.getChannel('channel');
            const guildId = interaction.guild.id;

            let panel = await Panel.findOne({ guildId });
            if (!panel || !panel.options || panel.options.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ No Configuration')
                        .setDescription('No ticket panel configured! Use the **Web Portal** to create a template and apply it first.\n\n🔗 Configure at: ' + (process.env.PORTAL_URL || 'http://localhost:' + (process.env.PORTAL_PORT || 3000)))
                        .setColor('#FF0000')
                    ]
                });
            }

            // Delete old panel if exists
            if (panel.messageId && panel.channelId) {
                try {
                    const oldCh = interaction.guild.channels.cache.get(panel.channelId);
                    if (oldCh) {
                        const oldMsg = await oldCh.messages.fetch(panel.messageId).catch(() => null);
                        if (oldMsg) await oldMsg.delete().catch(() => {});
                    }
                } catch (e) {}
            }

            const embed = await EmbedCreator.createTicketPanel(panel);
            const selectOptions = panel.options.map(opt => ({
                label: opt.label.substring(0, 100),
                description: (opt.description || 'Open ticket').substring(0, 100),
                emoji: opt.emoji || '🎫',
                value: opt.label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_create')
                .setPlaceholder('🔴 SELECT TICKET CATEGORY')
                .addOptions(selectOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const message = await channel.send({ embeds: [embed], components: [row] });

            panel.channelId = channel.id;
            panel.messageId = message.id;
            await panel.save();

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Panel Sent!')
                    .setDescription(`Panel sent to ${channel}\n\n💡 Use **\`/refresh\`** to update the panel after config changes.`)
                    .setColor('#00FF00')
                ]
            });

        } catch (error) {
            console.error('Setup error:', error);
            await interaction.editReply({ embeds: [EmbedCreator.errorEmbed(error.message)] });
        }
    }
};
