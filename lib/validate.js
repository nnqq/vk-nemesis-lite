class validate {
  static unixToRuString(sec) {
    return new Date(sec * 1000).toLocaleString('ru');
  }

  static async splitAndSendMsg(vk, config, msg) {
    if (msg.length > 4096) {
      const msgQueue = msg.match(/(.|[\r\n]){1,4096}/g);

      for (const msgItem of msgQueue) {
        await vk.api.messages.send({
          user_id: config.userIdForNotifications,
          message: msgItem,
          dont_parse_links: 1,
        });
      }
    } else {
      vk.api.messages.send({
        user_id: config.userIdForNotifications,
        message: msg,
        dont_parse_links: 1,
      });
    }
  }
}

module.exports = validate;
