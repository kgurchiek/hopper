## Usage
- Intall dependencies with `npm i`
- create a Discord account and get its token
  - there are several ways to do this, the easiest is to open your browser's dev tools, go to the network tab, and start typing in a Discord channel. Click on the "typing" request in the dev tools window, go to the request headers, and your token will be in the "Authorization" header.
  - warning: this is against Discord's terms of service, so do this at your own risk. It is **highly recommended** to create a brand new account dedicated to the bot, do not use an existing account that you care about
- create a Groq account and get a key from https://console.groq.com/keys
- rename `config.js.template` to `config.js`
- put your discord token and groq api key into the `token` and `groqToken` values of the config
- run the bot with `node index.js`
