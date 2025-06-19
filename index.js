const WebSocket = require('ws');
const {
    token,
    webhooks,
    groqToken,
    model,
    exclude,
    contentFilter,
    typingSpeed,
    emojiSpeed,
    context,
    instruction,
    maxMessages,
    messageList,
    schema
} = require('./config.js');
const superProperties = 'eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkZpcmVmb3giLCJkZXZpY2UiOiIiLCJzeXN0ZW1fbG9jYWxlIjoiZW4tVVMiLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQ7IHJ2OjEwOS4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94LzExNS4wIiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTE1LjAiLCJvc192ZXJzaW9uIjoiIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjMzMDcxMCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
const headers = {
    'User-Agent': userAgent,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Content-Type': 'application/json',
    Authorization: token,
    'X-Super-Properties': superProperties,
    'X-Discord-Locale': 'en-US',
    'X-Discord-Timezone': 'America/New_York',
    'X-Debug-Options': 'bugReporterEnabled',
    'Alt-Used': 'discord.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
}

function cleanMessage(message, users) {
    for (const user of users) message = message.replaceAll(`@${user.global_name}`, `<@${user.id}>`);
    for (const word in contentFilter) message = message.replaceAll(word, contentFilter[word]);
    return message;
}

async function generate(messages, users) {
    for (const user of users) messages.filter(a => a.role == 'user').forEach(a => a.content[0].text = a.content[0].text.replace(`<@${user.id}>`, `@${user.global_name}`));
    console.log('Prompt:', messages)
    let response = await (await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqToken}`
        },
        body: JSON.stringify({
            model,
            messages,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'response',
                    schema
                }
            }
        })
    })).json();
    if (response.choices?.[0].message.content) return response.choices?.[0].message.content;
    else { 
        console.error({ error: response });
        return { error: response };
    }
}

async function upload(data, name, channel) {
    let response = await fetch(`https://discord.com/api/v9/channels/${channel}/attachments`, {
        credentials: 'include',
        headers,
        body: JSON.stringify({ files: [{ filename: name, file_size: data.length, id: '1', is_clip: false }]}),
        method: 'POST',
        mode: 'cors'
    });
    if (response.status != 200) console.log('Attachment:', response.status, await response.getJSON());
    else {
        response = await response.json();
        console.log(response)
        await fetch(response.attachments[0].upload_url, {
            credentials: 'omit',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
                Accept: '*/*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Content-Type': 'application/octet-stream',
                'Sec-GPC': '1',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site'
            },
            referrer: 'https://discord.com/',
            body: data,
            method: 'PUT',
            mode: 'cors'
        });
        return response.attachments[0].upload_filename;
    }
}

async function handleCommands(commands, users, userMessage) {
    console.log(commands);
    let start = Date.now();
    for (let command of commands) {
        if (command.reply) {
            command.reply.message = cleanMessage(command.reply.message, users);
            typing(userMessage.guild_id, userMessage.channel_id);
            const typingInterval = setInterval(() => typing(userMessage.guild_id, userMessage.channel_id), 8000);
            await sendMessage(command.reply.message, null, userMessage.guild_id, userMessage.channel_id, {
                'guild_id': userMessage.guild_id,
                'channel_id': userMessage.channel_id,
                'message_id': userMessage.id
            }, start, typingInterval, userMessage.guild_id == null ? 'dm' : 'mention', userMessage);
            start = Date.now();
        }
        if (command.dm) {
            let user = users.find(a => a.global_name == command.dm.user);
            if (exclude.includes(users.find(a => a.global_name == a))) return;
            command.dm.message = cleanMessage(command.dm.message, users);
            let channel = await getUserChannel(user.id);
            typing(null, channel.id);
            const typingInterval = setInterval(() => typing(null, channel.id), 8000);
            await sendMessage(command.dm.message, null, null, channel.id, null, start, typingInterval, userMessage.guild_id == null ? 'dm': 'mention', userMessage);
            start = Date.now();
        }
        if (command.send) {
            command.send.message = cleanMessage(command.send.message, users);
            let guild = guilds.find(a => a.channels.find(b => b.id == command.send.channel));
            if (guild == null) continue;
            typing(guild.id, command.send.channel);
            const typingInterval = setInterval(() => typing(guild.id, command.send.channel), 8000);
            await sendMessage(command.send.message, null, guild.id, command.send.channel, null, start, typingInterval, userMessage.guild_id == null ? 'dm' : 'mention', userMessage);
            start = Date.now();
        }
        if (command.react) {
            await react(command.react.channel, command.react.message, command.react.emoji, start);
            start = Date.now();
        }
    }
}

function typing(guild, channel) {
    fetch(`https://discord.com/api/v9/channels/${channel}/typing`, {
        credentials: 'include',
        headers,
        referrer: `https://discord.com/channels/${guild || '@me'}/${channel}`,
        method: 'POST',
        mode: 'cors'
    })
}

async function getUserChannel(id) {
    return await (await fetch('https://discord.com/api/v9/users/@me/channels', {
        credentials: 'include',
        headers,
        body: JSON.stringify({recipients: [id]}),
        method: 'POST',
        mode: 'cors'
    })).json();
}

async function getMessage(guild, channel, id) {
    const response = await fetch(`https://discord.com/api/v9/channels/${channel}/messages?limit=1&around=${id}`, {
        credentials: 'include',
        headers,
        referrer: `https://discord.com/channels/${guild || '@me'}/${channel}`,
        method: 'GET',
        mode: 'cors'
    });
    if (response.status != 200) console.log('Get Message:', response, await response.json());
    else return (await response.json())[0];
}

async function sendMessage(content, attachments, guild, channel, reference, start, typingInterval, logType, userMessage) {
    console.log(`Sending message: ${content}`)
    if (start) {
        console.log(`Typing for ${content.length / typingSpeed} seconds...`)
        while (Math.floor((Date.now() - start) / 1000) < content.length / typingSpeed) await new Promise(res => setTimeout(res, 1));
    }
    if (typingInterval) clearInterval(typingInterval);
    let body = {
        'mobile_network_type': 'unknown',
        content,
        tts: false,
        flags: 0,
    }
    if (reference) body.message_reference = reference;
    if (attachments) body.attachments = attachments;
    let sentMessage = await fetch(`https://discord.com/api/v9/channels/${channel}/messages`, {
        credentials: 'include',
        headers,
        referrer: `https://discord.com/channels/${guild || '@me'}/${channel}`,
        body: JSON.stringify(body),
        method: 'POST',
        mode: 'cors'
    });
    if (sentMessage.status != 200) {
        const error = await sentMessage.json();
        console.error('Message:', sentMessage.status, JSON.stringify(error, '', '    '), guild, channel, '\n', body);
        if (sentMessage.status == 429) {
            console.log(`Retrying in ${error.retry_after} seconds...`);
            setTimeout(() => sendMessage(content, attachments, guild, channel, reference, null, null, logType, userMessage), error.retry_after * 1000);
        }
    } else {
        sentMessage = await sentMessage.json();
        if (logType == 'dm') await fetch(webhooks.dm, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `https://discord.com/channels/${userMessage.guild_id || '@me'}/${userMessage.channel_id}/${userMessage.id} https://discord.com/channels/@me/${channel}/${sentMessage.id}` })})
        if (logType == 'mention') await fetch(webhooks.mention, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `https://discord.com/channels/${userMessage.guild_id || '@me'}/${userMessage.channel_id}/${userMessage.id} https://discord.com/channels/${guild || '@me'}/${channel}/${sentMessage.id}` })})
        if (logType == 'random') await fetch(webhooks.random, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `https://discord.com/channels/${userMessage.guild_id || '@me'}/${userMessage.channel_id}/${userMessage.id} https://discord.com/channels/${guild || '@me'}/${channel}/${sentMessage.id}` })})
    }
}

async function react(channel, message, emoji, start) {
    if (start) while (Date.now() - start < emojiSpeed) {}
    const response = await fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/reactions/${encodeURIComponent(emoji)}/%40me`, {
        credentials: 'include',
        headers,
        method: 'PUT',
        mode: 'cors'
    });
    if (![200, 204].includes(response.status)) console.log('React:', response)
}

function fetchMember(guild, user) {
    if (guild == null || user == null) return null;
    return new Promise(res => {
        ws.send(JSON.stringify({
            op: 8,
            d: {
                guild_id: [guild],
                user_ids: [user],
                presences: false
            }
        }));
        memberCallbacks[`${guild}:${user}`] = res;
    })
}

const ws = new WebSocket('wss://gateway.discord.gg/?encoding=json&v=9');
const oldSend = ws.send;
ws.send = data => {
    //console.log(`Outgoing:`, JSON.parse(data));
    oldSend.call(ws, data);
}

let sequence = null;
function heartbeat(interval) {
    ws.send(JSON.stringify({ op: 1, d: sequence }));
    setTimeout(() => heartbeat(interval), interval + Math.random());
}

let user;
let guilds;
let memberCallbacks = {};
ws.on('open', async () => {
    console.log('Connected');
    ws.send(JSON.stringify({
        op: 2,
        d: {
            token,
            capabilities: 30717,
            properties: {
                os: 'Linux',
                browser: 'Firefox',
                device: '',
                'system_locale': 'en-US',
                'browser_user_agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
                'browser_version': '115.0',
                'os_version': '',
                referrer: '',
                'referring_domain': '',
                'referrer_current': '',
                'referring_domain_current': '',
                'release_channel': 'stable',
                'client_build_number': 330271,
                'client_event_source': null
            },
            presence: {
                status: 'unknown',
                since: 0,
                activities: [],
                afk: false
            },
            compress: false,
            'client_state': {
                'guild_versions': {}
            }
        }
    }));
});
ws.on('message', async (data) => {
    data = JSON.parse(data);
    sequence = (data.s || sequence)
    //console.log(`Incoming:`, data);
    if (data.op == 10) heartbeat(data.d.heartbeat_interval);
    if (data.op == 0) {
        if (data.t == 'READY') {
            console.log('Ready')
            user = data.d.user;
            guilds = data.d.guilds;
            ws.send(JSON.stringify({
                op: 4,
                d: {
                    'guild_id': null,
                    'channel_id': null,
                    'self_mute': true,
                    'self_deaf': false,
                    'self_video': false,
                    'flags': 2
                }
            }));
            const subscriptions = {};
            for (const server of data.d.guilds) {
                subscriptions[server.id] = {
                    typing: false,
                    threads: false,
                    activities: false,
                    members: [],
                    'member_updates': false,
                    channels: {},
                    'thread_member_lists': []
                }
            }
            ws.send(JSON.stringify({ op: 37, d: { subscriptions }}));
        }
        if (data.t == 'MESSAGE_CREATE') {
            if (data.d.author.id == user.id || exclude.includes(data.d.author.id)) return;
            let randomReply = Math.random() < 0.0005;
            if (!data.d.guild_id || data.d.mentions.find(a => a.id == user.id) || randomReply) {
                // console.log(data.d);
                let commands;
                while (!commands) {
                    let messages = [data.d];
                    if (data.d.guild_id) {
                        let currentMessage = data.d;
                        while (messages.length < maxMessages && currentMessage.referenced_message) {
                            currentMessage = await getMessage(currentMessage.guild_id, currentMessage.channel_id, currentMessage.referenced_message.id);
                            messages.push(currentMessage);
                        }
                    } else {
                        let response = await fetch(`https://discord.com/api/v9/channels/${data.d.channel_id}/messages?before=${data.d.id}&limit=50`, {
                            credentials: 'include',
                            headers,
                            referrer: `https://discord.com/channels/@me/${data.d.channel_id}`,
                            method: 'GET',
                            mode: 'cors'
                        });
                        if (response.status == 200) messages = messages.concat((await response.json()).slice(0, 15));
                    }
                    messages.reverse();
                    let users = [user];
                    for (const message of messages) {
                        if (!Object.values(users).find(a => a.id == message.author.id)) users.push(message.author);
                        if (message.mentions) for (const mention of message.mentions) if (!Object.values(users).find(a => a.id == mention.id)) users.push(mention);
                    }
                    let response = await generate([{ role: 'system', content: context(user, guilds.find(a => a.id == data.d.guild_id), data.d.guild_id ? data.d.channel_id : await getUserChannel(data.d.author.id), await fetchMember(data.d.guild_id, user.id))}].concat([{ role: 'system', content: instruction }], messageList(messages, users)), users);
                    if (response.error) {
                        if (response.error?.error?.code == 'rate_limit_exceeded') await (new Promise(res => setTimeout(res, 60000)));
                        else console.log(response.error)
                    } else {
                        commands = JSON.parse(response).commands;
                        handleCommands(commands, users, data.d);
                    }
                }
            }
        }
        if (data.t == 'RELATIONSHIP_ADD') {
            await (new Promise(res => setTimeout(res, 10000 + Math.random() * 10000)));
            await fetch(`https://discord.com/api/v9/users/@me/relationships/${data.d.id}`, {
                credentials: 'include',
                headers,
                referrer: 'https://discord.com/channels/@me',
                body: JSON.stringify({}),
                method: 'PUT',
                mode: 'cors'
            });
        }
        if (data.t == 'CHANNEL_CREATE') (guilds.find(a => a.id == data.d.guild_id)?.channels || []).push(data.d)
        if (data.t == 'CHANNEL_DELETE') {
            const guild = guilds.find(a => a.id == data.d.guild_id) || { channels: [] };
            guild.channels = guild.channels.filter(a => a.id != data.d.id);
        }
        if (data.t == 'GUILD_MEMBERS_CHUNK') {
            for (const user of data.d.members) {
                (memberCallbacks[`${data.d.guild_id}:${user.user.id}`] || (() => {}))(user);
                delete memberCallbacks[`${data.d.guild_id}:${user.user.id}`];
            }
        }
    }
});


ws.on('error', console.error);

ws.on('close', (code, reason) => {
    console.error('Closed', code, reason.toString());
    process.exit();
});
