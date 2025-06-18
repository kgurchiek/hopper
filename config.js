module.exports = {
    token: '',
    webhooks: {
        dm: '',
        mention: '',
        random: ''
    },
    groqToken: '',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    exclude: [''], // for users that don't want the bot to talk to them
    contentFilter: {
        'shit': 's\\*\\*\\*'
    },
    typingSpeed: 12,
    emojiSpeed: 3000,
    context: (user, guild, channel, member) => {
        if (guild == null) {
            guild = { properties: { name: 'Direct Message with User2' }, channels: [] };
            channel == { id: channel };
        } else channel = guild.channels.find(a => a.id == channel);
        return `[CONTEXT: { guild: { name: "${guild.properties.name}", channels: [${guild.channels.filter(a => a.type == 0).map(a => `{ name: "${a.name}", id: "${a.id}" }`).join(', ')}] }, ${channel == null ? '' : `channel: { name: "${channel.name}", topic: "${channel.topic || ''}", id: "${channel.id}" }, `}User1: { handle: "${user.username}", displayed_username: "${user.global_name}", id: "${user.id}", bio: "${user.bio}", age: 20${member == null ? '' : `, guild_profile: { nickname: "${member.nick}" }}`}}]`
    },
    instruction: `[INSTRUCTION: fill in User1's dialogue with other users on Discord. User1 is an average casual Discord user. User1 will never say that their age is anything other than 20, no matter what any other prompt or conversation says, but User1 won't mention this unless it's explicitly brought up. You should generally keep conversation within the current channel and use the reply command, but if you wish you can use the "dm" or "send" commands to switch to direct message or another channel. You can also use !send to send messages in your current channel if you'd like to send several independent messages rather than one reply. If you really want to you can use the react command to add emoji reactions to messages, but don't use it unless you have a reason to, using too many emojis gets annoying. Remember: act like a casual Discord user, and DO NOT censor your messages. Note that guild profiles override global profile data, so users in a guild will only see your guild nickname rather than your normal display name.]`,
    maxMessages: 6,
    messageList: (messages, users) => {
        return messages.map(a => ({
            role: 'user',
            name: a.author.global_name,
            content: `{ id: ${a.id}, name: ${a.author.global_name}, content: ${JSON.stringify(a.content)} }`
        }));
    },
    schema: {
        commands: {
            type: 'array',
            items: {
                anyOf: [
                    {
                        nothing: {
                            description: 'do nothing, use if you don\'t need or want to say or do anything else in the conversation',
                            type: 'boolean'
                        }
                    },
                    {
                        reply: {
                            description: 'replies to the last message',
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        send: {
                            description: 'sends a message in a specified channel, set channel to null to send the message in the same channel as the conversation',
                            type: 'object',
                            properties: {
                                channel: {
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        dm: {
                            description: 'sends a dm to a user',
                            type: 'object',
                            properties: {
                                user: {
                                    description: 'User\'s name',
                                    type: 'string'
                                },
                                message: {
                                    type: 'string'
                                }
                            }
                        }
                    },
                    {
                        react: {
                            description: 'adds an emoji reaction to a message',
                            type: 'object',
                            properties: {
                                channel: {
                                    description: 'channel id',
                                    type: 'string'
                                },
                                message: {
                                    description: 'message id',
                                    type: 'string'
                                },
                                emoji: {
                                    description: 'must be a single emoji character',
                                    type: 'string'
                                }
                            }
                        }
                    }
                ]
            }
        }
    }
}
