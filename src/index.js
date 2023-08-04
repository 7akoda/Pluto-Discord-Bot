require("dotenv").config();
const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

const cache = {};

async function fetchAndCacheData() {
  const response = await fetch(
    "https://private-anon-40262d7c09-itad.apiary-proxy.com/v01/game/plain/list/?key=0a4370d3e2cf8e48faf8a2a592ec54d0d01d8fa6&shops=Steam"
  );
  const jsonData = await response.json();

  cache.jsonData = jsonData;
  console.log("Data fetched and cached!");
}

client.on("ready", (c) => {
  console.log(`🤖${c.user.username} is online.`);
  fetchAndCacheData();
});

client.on("messageCreate", (message) => {
  if (message.author.bot) {
    return;
  }
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  function normalizeString(input) {
    let normalized = input.toLowerCase();
    normalized = normalized.replace(/[^\w\s]/g, "");
    normalized = normalized.replace(/\s/g, "");
    return normalized;
  }

  (async () => {
    if (interaction.commandName === "deal") {
      const anyDealUrl = interaction.options.get("game").value;
      const normalizedUrl = normalizeString(anyDealUrl);
      const jsonData = cache.jsonData;
      const entries = Object.entries(jsonData.data.steam);

      const foundByName = entries.find((entry) => entry[1] === normalizedUrl);
      console.log(foundByName);
      let idValue;
      if (foundByName) {
        idValue = foundByName[0].split("/")[1];
      } else {
        console.log("idValue not found.");
      }

      const response = await fetch(
        `https://api.isthereanydeal.com/v01/game/prices/?key=0a4370d3e2cf8e48faf8a2a592ec54d0d01d8fa6&plains=${normalizedUrl}&added=100`
      );
      const plains = await response.json();
      const listArray = plains.data[normalizedUrl].list;

      const response1 = await fetch(
        `https://private-anon-577bac3758-itad.apiary-proxy.com/v01/game/info/?key=0a4370d3e2cf8e48faf8a2a592ec54d0d01d8fa6&plains=${normalizedUrl}&optional=metacritic`
      );
      const plainsInfo = await response1.json();
      const infoGame = plainsInfo.data[normalizedUrl]?.metacritic?.summary;

      const steamData = await fetch(
        "https://api.steampowered.com/ISteamApps/GetAppList/v0002/"
      );
      const dataInfo = await steamData.json();
      const idToFind = Number(idValue);
      const app = dataInfo.applist.apps.find((app) => app.appid === idToFind);
      const idToName = app ? app.name : "Title Not Found";

      const gameImage = app
        ? `https://steamcdn-a.akamaihd.net/steam/apps/${idValue}/header.jpg`
        : "https://www.videogameschronicle.com/files/2021/05/discord-new-logo.jpg";

      const description =
        infoGame && typeof infoGame === "string"
          ? infoGame
          : "Description not available";

      try {
        const embed = new EmbedBuilder()
          .setTitle(idToName)
          .setDescription(description)
          .setColor("2596be")
          .setURL(`https://isthereanydeal.com/game/${normalizedUrl}/info`)
          .setImage(gameImage);

        listArray.forEach((item) => {
          const priceNew = Number(item.price_new).toFixed(2);
          const priceOld = Number(item.price_old).toFixed(2);
          const priceCut = item.price_cut;
          const shopName = item.shop.name;
          const shopUrl = item.url;

          embed.addFields({
            name: `${shopName} ($${priceNew})`,
            value: `Price Old: $${priceOld}\nPrice Cut: ${priceCut}%\n[Shop Link](${shopUrl})`,
            inline: true,
          });
        });
        interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error("Error creating or sending the embed:", error);
      }
    }
  })();
});

client.login(process.env.TOKEN);
