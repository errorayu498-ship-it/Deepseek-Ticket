const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { Panel } = require('../../database/mongodb');
const EmbedCreator = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('🔄 Refresh ticket panel with latest configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const panel = await Panel.findOne({ guildId: interaction.guild.id });
            if (!panel || !panel.channelId || !panel.messageId) {
                return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('No panel found! Use `/ticket-setup` or portal first.')] });
            }

            const channel = interaction.guild.channels.cache.get(panel.channelId);
            if (!channel) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Panel channel not found.')] });

            const message = await channel.messages.fetch(panel.messageId).catch(() => null);
            if (!message) return interaction.editReply({ embeds: [EmbedCreator.errorEmbed('Panel message not found.')] });

            const embed = await EmbedCreator.createTicketPanel(panel);
            const selectOptions = panel.options.map(opt => ({
                label: opt.label.substring(0, 100),
                description: (opt.description || '').substring(0, 100),
                emoji: opt.emoji || '🎫',
                value: opt.label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 100)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_create')
                .setPlaceholder('SELECT TICKET CATEGORY')
                .addOptions(selectOptions);

            await message.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });

            await interaction.editReply({ embeds: [EmbedCreator.successEmbed('Panel refreshed!')] });

        } catch (error) {
            await interaction.editReply({ embeds: [EmbedCreator.errorEmbed(error.message)] });
        }
    }
};
