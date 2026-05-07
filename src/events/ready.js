const { Events, ActivityType, REST, Routes } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const c = { g: (t) => `\x1b[32m${t}\x1b[0m`, r: (t) => `\x1b[31m${t}\x1b[0m`, b: (t) => `\x1b[34m${t}\x1b[0m` };
        
        console.log(c.g('╔══════════════════════════════════════╗'));
        console.log(c.g(`║   ✅ Logged in as ${client.user.tag}`));
        console.log(c.g('╚══════════════════════════════════════╝'));

        client.user.setPresence({
            activities: [{ name: 'Warrior Ticket', type: ActivityType.Watching }],
            status: 'dnd',
        });

        console.log(c.b(`📊 Servers: ${client.guilds.cache.size} | Users: ${client.users.cache.size}`));

        // Register slash commands globally
        const commands = [];
        client.commands.forEach(cmd => {
            if (cmd.data) commands.push(cmd.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        try {
            console.log(c.b('📝 Registering slash commands...'));
            
            // Register globally for all guilds
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            
            console.log(c.g(`✅ Registered ${commands.length} commands!`));
        } catch (error) {
            console.error(c.r('Error registering commands:'), error.message);
        }
    }
};
