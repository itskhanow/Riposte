#!/usr/bin/env node
const Discord = require("discord.js");
const Redis = require("ioredis");
const redis = new Redis();
const moment = require("moment");
const getUrls = require("get-urls");
const config = require("./config.json");

const Riposte = new Discord.Client();

Riposte.on("ready", () => {});

Riposte.on("message", message => {
  if (message.author.bot) return;

  // Let's get some relevant info.
  let urls = getUrls(message.content);
  let channel = message.channel.id;
  let user = message.author.id;
  let timeStamp = message.createdTimestamp;
  let messageLink = message.url;

  urls.forEach(value => {
    let channelKey = channel + "_" + value;

    // Check the DB to see if this link has been posted to this channel.
    redis.get(channelKey).then(result => {
      if (result) {
        let post = JSON.parse(result);
        // Make sure the authors aren't the same
        if (post.user != user) {
          // It's a repost! Style on 'em.
          let timeSince = moment(post.timeStamp).fromNow();
          // Grab points for OP and Reposter
          Promise.all([
            redis.get("POINTS_" + post.user),
            redis.get("POINTS_" + user)
          ]).then(points => {
            message.reply(
              new Discord.RichEmbed()
                .setTitle("RIPOSTED!")
                .setColor(0xdb2b30)
                .setDescription(
                  `<@${post.user}> already posted that ${timeSince}! ([Proof](${
                    post.proofUrl
                  }))`
                )
                .addField(
                  "Them",
                  `<@${post.user}> has ${Number(points[0] || 0) + 1} points!`,
                  true
                )
                .addField("You", `You have ${Number(points[1] || 0)}!`, true)
            );
            redis.incr("POINTS_" + post.user);
          });
        }
      } else {
        // The first time it's been posted, this user claims it.
        redis.set(
          channelKey,
          JSON.stringify({
            user,
            timeStamp,
            proofUrl: messageLink
          })
        );
      }
    });
  });

  if (message.content.indexOf(config.prefix) !== 0) return;

  let args = message.content
    .slice(config.prefix.length)
    .trim()
    .split(/ +/g);
  let command = args.shift().toLowerCase();

  if (command == "ripostes") {
    redis.get("POINTS_" + user).then(points => {
      message.reply(`You have ${Number(points)} ripostes!`);
    });
  }
});

Riposte.login(config.token);
