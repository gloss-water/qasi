const { RichEmbed } = require('discord.js');
const { Command } = require('discord.js-commando');
const { stripIndents } = require('common-tags');

const plural = (a, p) => {
    return a !== 1 ? p + 's ' : p + ' ';
}

 //MIT LICENSE (C) MIKACHU @ SWEDENS.COM
const uptime = (s) => {
    const day = (s/86400000|0);
    const hour = (s%86400000)/3.6e6|0;
    const min = (s%3.6e6)/6e4|0;
    const sec = (s%6e4)/1000|0;
    return day + plural(day, ' day') + hour + plural(hour, ' hour') + min + plural(min, ' minute') + sec + plural(sec, ' second');
};

class Stats extends Command {
    constructor(client) {
        super(client, {
            name: 'stats',
            group: 'info',
            memberName: 'stats',
            description: 'Displays Cassandra\'s current statistics.',
            throttling: {
                usages: 1,
                duration: 10
            }
        });
    }

    async run(msg) {
        return msg.embed(new RichEmbed()
                .setTitle(`Cassandra 2.0 statistics! ^_^`)
                .setFooter(`requested by ${msg.author.username}`, msg.author.avatarURL)
                .setDescription(stripIndents`
                    Uptime: ${uptime(this.client.uptime)}
                    Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB
                    Ping: ${Math.round(msg.client.ping)}ms
                    Channels: ${this.client.channels.size}
                    Members: ${this.client.users.size}
                    Servers: ${this.client.guilds.size}
                    `)
                .setImage(this.client.user.displayAvatarURL)
                .setColor(8700043)
        );
    }
}

module.exports = Stats;
