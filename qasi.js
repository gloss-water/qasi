// Dependencies
const { Client, SQLiteProvider } = require('discord.js-commando');
const { RichEmbed } = require('discord.js');
const winston = require('winston');
const path = require('path');
const sqlite = require('sqlite');
const fs = require('fs');
const { stripIndents } = require('common-tags');

// Configuration
const config = require('./data/config');
const censorship = require('./data/censorship');
let home = '';
let welcome = {};

// Client set up
const qasi = new Client({
    owner: config.auth.ownerID,
    commandPrefix: config.prefix
});
qasi.setProvider(
    sqlite.open(path.join(__dirname + '/data', 'dbqasi.sqlite3'))
        .then(db => new SQLiteProvider(db))
);
qasi.registry.registerGroups([
    ['admin', 'Administration'],
    ['info', 'Information'],
    ['membership', 'Membership Utilities'],
    ['misc', 'Miscellaneous']
]).registerDefaults().registerCommandsIn(path.join(__dirname, 'commands'));

// Utility methods (let's move these somewhere else soon)
const isExempt = async message => {
    let member = message.member;
    if (!member) { // If we haven't cached the member yet, we need to grab it
        await qasi.fetchUser(message.author.id);
        member = await message.guild.fetchMember(message.author);
    }
    // Check every exemption to see if it exists;
    return config.exemptions.some(ex => { return member.roles.exists('name', ex) });
};

const bannedWords = message => {
    let banned = false;
    censorship.banned.forEach(word => {
        if (message.match(word)) {
            banned = true;
        }
    });
    return banned;
};

const warnedWords = message => {
    let warned = false;
    let falsePositive = false;
    censorship.false.forEach(word => { 
        if (message.match(word)) {
            falsePositive = true;   
        }
    });
    if (falsePositive) return false;
    censorship.warned.forEach(word => {
        if (message.match(word)) {
           warned = true;
        }
    });
    return warned;
};

const loadWelcomeData = () => {
    fs.readFile(__dirname + '/data/welcomes.json', (err, data) => {
        if (err) throw err;
        welcome = JSON.parse(data);
    });
}

// Event handlers

qasi
    .once('ready', () => {
        winston.info(`QASI initialized. Logged in as ${qasi.user.username}#${qasi.user.discriminator}.`);
        home = qasi.channels.get(config.home);
        loadWelcomeData();
    })
    .on('message', async message => {
        winston.info(
            stripIndents`${message.author.username} in ${message.channel.name}:
            >>> ${message.cleanContent}`
            );
        if (message.author.bot) return; // Ignore self and all bots
        if (message.channel.type === 'dm') return; // Ignore dms
        
        // Guild messages from here on.

        if (message.guild.id !== config.guild) return;
        // Check if any disallowed words from unexempt users and tell on them.
        if (!await isExempt(message)) {
            if (bannedWords(message.cleanContent.toLowerCase())) {
                home.send(new RichEmbed()
                    .setTitle('Banning ${message.author} for usage of a banned word in ${message.channel}.')
                    .setDescription(message.content)
                    .setColor(16711680)
                );
                if (message.member.bannable) message.member.ban();
                if (message.deletable) message.delete();
                return;
            }
            
            if (warnedWords(message.cleanContent.toLowerCase())) {
                home.send(new RichEmbed()
                    .setTitle('🚨 Funny Alert 🚨')
                    .setDescription(stripIndents`
                        ${message.author} in ${message.channel}**
                        ${message.content}
                    `)
                    .setColor(16737330)
                );
                return true;
            }
        } else {
            winston.log('clean');
        }
    })
    .on('messageDelete', async message => {
        if (message.guild) {
            if (message.guild.id !== config.guild) return;
        }
        if (message.author.id === qasi.user.id) return;
        if (message.channel.id === home.id || message.channel.id === '223941383583432705') return;
        if (await isExempt(message)) return;
        home.send(new RichEmbed()
            .setDescription(stripIndents`
                **Message from ${message.author} deleted in ${message.channel}.**
                ${message.content}
            `)
            .setColor(8700043)
        );
    })
    .on('guildMemberAdd', member => {
        if (member.guild.id !== config.guild) return;
        
        home.send(new RichEmbed()
            .setTitle(`${member.user.username} has joined the server.`)
            .addField('Ping', `${member}`)
            .addField('Tag', `${member.user.tag}`)
            .setImage(member.user.displayAvatarURL)
            .setTimestamp(new Date())
            .setColor(8700043));

        if (welcome[member.id] === undefined) {
            member.sendMessage(stripIndents`
                hello ^_^ welcome to the Nyanners server. please remember to check out <#183028007403913216> if you haven't already!
            `).then(member.send(stripIndents`
                oh, by the way: would you like me to post a welcome message for you in <#182712193287061504>?
            `)).then(member.send(`just respond here with 'welcome' any time in the future and i'll do it. :)`));
        } else {
            home.send(`Almost sent a welcome message to ${member}, but they have been here before or something :thinking: `)
        }
    })
    .on('guildMemberRemove', member => {
        if (member.guild.id !== config.guild) return;
        home.send(new RichEmbed()
            .setTitle(`${member.user.username} (${member.displayName}) has left the server.`)
            .addField('Ping', `${member}`)
            .addField('Tag', `${member.user.tag}`)
            .setImage(member.user.displayAvatarURL)
            .setTimestamp(new Date())
            .setColor(8700043));
    })
    .on('guildBanAdd', (guild, user) => {
        if (guild.id !== config.guild) return;
        home.send(`${user} (${user.username}) has been banned from the server.`);
    })
    .on('guildBanRemove', (guild, user) => {
        if (guild.id !== config.guild) return;
        home.send(`${user} (${user.username}) has been unbanned from the server.`);
    })
    .on('disconnect', () => {
        winston.warn('QASI disconnected from Discord.')
    })
    .on('reconnecting', () => {
        winston.warn('QASI reconnecting to Discord.')
    })
    .on('error', winston.error)
    .on('warn', winston.warn);

qasi.login(config.auth.token);
