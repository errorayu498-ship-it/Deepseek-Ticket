const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Panel } = require('../../database/mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-panel')
        .setDescription('🗑️ Completely reset ticket panel configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Delete existing panel message
            const panel = await Panel.findOne({ guildId: interaction.guild.id });
            if (panel?.channelId && panel?.messageId) {
                const channel = interaction.guild.channels.cache.get(panel.channelId);
                if (channel) {
                    const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
                    if (msg) await msg.delete().catch(() => {});
                }
            }

            // Reset database
            await Panel.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { $set: { channelId: null, messageId: null, ticketCount: 0 } },
                { upsert: true }
            );

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Panel Reset')
                    .setDescription('Panel has been reset. Use the portal or `/ticket-setup` to create a new one.')
                    .setColor('#00FF00')
                ]
            });
        } catch (error) {
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(error.message).setColor('#FF0000')] });
        }
    }
};
