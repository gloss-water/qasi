// Dependencies
const { Client, SQLiteProvider } = require('discord.js-commando');
const winston = require('winston');
const sqlite = require('sqlite');
const path = require('path');
const config = require('./data/config');

// This one is for testing new changes to the bot before deploying onto the real bot.

// Client set up
const qasi = new Client({
    owner: config.auth.ownerID,
    commandPrefix: config.prefix
});
qasi.setProvider(
    sqlite.open(path.join(__dirname + '/data', 'devqasi.sqlite3'))
        .then(db => new SQLiteProvider(db))
);
qasi.registry.registerGroups([
]).registerDefaults().registerCommandsIn(path.join(__dirname, 'dev'));

// Event handlers
qasi
    .once('ready', () => {
        winston.info(`qasi initialized. Logged in as ${qasi.user.username}#${qasi.user.discriminator}.`);
    })
    .on('disconnect', () => {
        winston.warn('qasi disconnected from Discord.')
    })
    .on('reconnecting', () => {
        winston.warn('qasi reconnecting to Discord.')
    })
    .on('error', winston.error)
    .on('warn', winston.warn);

qasi.login(config.auth.token);
