const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Ticket, Panel } = require('../../database/mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('🔒 Close current ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Close reason')),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const ticket = await Ticket.findOne({ guildId: interaction.guild.id, channelId: interaction.channel.id, status: 'open' });
            if (!ticket) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Not a ticket').setColor('#FF0000')] });

            const panel = await Panel.findOne({ guildId: interaction.guild.id });
            const member = await interaction.guild.members.fetch(interaction.user.id);
            
            const hasPerm = member.permissions.has(PermissionFlagsBits.Administrator) ||
                member.id === ticket.creatorId || member.id === process.env.OWNER_ID ||
                panel?.adminRoles?.some(r => member.roles.cache.has(r));

            if (!hasPerm) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ No Permission').setColor('#FF0000')] });

            const reason = interaction.options.getString('reason') || 'No reason';
            
            ticket.status = 'closed';
            ticket.closedAt = new Date();
            ticket.closedBy = interaction.user.id;
            ticket.closeReason = reason;
            await ticket.save();

            // DM creator
            try {
                const creator = await client.users.fetch(ticket.creatorId);
                await creator.send({ embeds: [new EmbedBuilder().setTitle('Ticket Closed').setDescription(`Your ticket was closed.\n**Reason:** ${reason}`).setColor('#FF0000')] }).catch(() => {});
            } catch (e) {}

            await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🔒 Closing...').setColor('#FF0000')] });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);

            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('✅ Closed').setColor('#00FF00')] });

        } catch (error) {
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(error.message).setColor('#FF0000')] });
        }
    }
};
