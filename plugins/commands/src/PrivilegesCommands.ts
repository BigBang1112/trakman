import config from '../config/PrivilegesCommands.config.js'

const commands: tm.Command[] = [
  {
    aliases: config.masteradmin.aliases,
    help: config.masteradmin.help,
    params: [{ name: 'login' }],
    callback: async (info: tm.MessageInfo, login: string): Promise<void> => {
      const targetLogin: string = login
      const callerLogin: string = info.login
      const targetInfo: tm.OfflinePlayer | undefined = await tm.players.fetch(targetLogin)
      const prevPrivilege: number = targetInfo?.privilege ?? 0
      if (prevPrivilege >= info.privilege) {
        tm.sendMessage(config.noPrivilege, callerLogin)
        return
      }
      if (prevPrivilege < 3) {
        tm.sendMessage(tm.utils.strVar(config.masteradmin.promote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.masteradmin.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 3, info)
      } else if (prevPrivilege === 3) {
        tm.sendMessage(tm.utils.strVar(config.masteradmin.alreadyIs, {
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), callerLogin)
      }
    },
    privilege: config.masteradmin.privilege
  },
  {
    aliases: config.admin.aliases,
    help: config.admin.help,
    params: [{ name: 'login' }],
    callback: async (info: tm.MessageInfo, login: string): Promise<void> => {
      const targetLogin: string = login
      const callerLogin: string = info.login
      const targetInfo: tm.OfflinePlayer | undefined = await tm.players.fetch(targetLogin)
      const prevPrivilege: number = targetInfo?.privilege ?? 0
      if (prevPrivilege >= info.privilege) {
        tm.sendMessage(config.noPrivilege, callerLogin)
        return
      }
      if (prevPrivilege < 2) {
        tm.sendMessage(tm.utils.strVar(config.admin.promote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.admin.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 2, info)
      } else if (prevPrivilege === 2) {
        tm.sendMessage(tm.utils.strVar(config.admin.alreadyIs, {
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), callerLogin)
      } else {
        tm.sendMessage(tm.utils.strVar(config.admin.demote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.admin.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 2, info)
      }
    },
    privilege: 3
  },
  {
    aliases: config.operator.aliases,
    help: config.operator.help,
    params: [{ name: 'login' }],
    callback: async (info: tm.MessageInfo, login: string): Promise<void> => {
      const targetLogin: string = login
      const callerLogin: string = info.login
      const targetInfo: tm.OfflinePlayer | undefined = await tm.players.fetch(targetLogin)
      const prevPrivilege: number = targetInfo?.privilege ?? 0
      if (prevPrivilege >= info.privilege) {
        tm.sendMessage(config.noPrivilege, callerLogin)
        return
      }
      if (prevPrivilege < 1) {
        tm.sendMessage(tm.utils.strVar(config.operator.promote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.operator.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 1, info)
      } else if (prevPrivilege === 1) {
        tm.sendMessage(tm.utils.strVar(config.operator.alreadyIs, {
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), callerLogin)
      } else {
        tm.sendMessage(tm.utils.strVar(config.operator.demote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.operator.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 1, info)
      }
    },
    privilege: 2
  },
  {
    aliases: config.user.aliases,
    help: config.user.help,
    params: [{ name: 'login' }],
    callback: async (info: tm.MessageInfo, login: string): Promise<void> => {
      const targetLogin: string = login
      const callerLogin: string = info.login
      const targetInfo: tm.OfflinePlayer | undefined = await tm.players.fetch(targetLogin)
      const prevPrivilege: number = targetInfo?.privilege ?? 0
      if (prevPrivilege >= info.privilege) {
        tm.sendMessage(config.noPrivilege, callerLogin)
        return
      }
      if (prevPrivilege >= 1) {
        tm.sendMessage(tm.utils.strVar(config.user.demote, {
          title: info.title,
          adminNickname: tm.utils.strip(info.nickname, true),
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), config.user.public ? undefined : info.login)
        await tm.admin.setPrivilege(targetLogin, 0, info)
      } else if (prevPrivilege === 0) {
        tm.sendMessage(tm.utils.strVar(config.user.alreadyIs, {
          nickname: tm.utils.strip(targetInfo?.nickname ?? login, true)
        }), callerLogin)
      }
    },
    privilege: 2
  },
]

tm.commands.add(...commands)
