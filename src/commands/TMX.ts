import { ChatService } from '../services/ChatService.js'
import { TMXService } from '../services/TMXService.js'
import { Client } from '../Client.js'
import { TRAKMAN as TM } from '../Trakman.js'

const command: TMCommand = {
  aliases: ['add'],
  help: 'Add a track from TMX.',
  params: [{ name: 'id', type: 'int' }, { name: 'tmxSite', optional: true }],
  callback: async (info: MessageInfo, id: number, tmxSite?: string) => {
    const file = await TMXService.fetchTrackFile(id, tmxSite).catch((err: Error) => err)
    if (file instanceof Error) {
      TM.sendMessage(`${TM.palette.server}»${TM.palette.error} Failed to fetch file from ${TM.palette.highlight + (tmxSite || 'TMNF')} TMX` +
        `${TM.palette.error}, check if you specified the correct game.`, info.login)
      return
    }
    const base64String = file.content.toString('base64')
    const write = await Client.call('WriteFile', [{ string: file.name }, { base64: base64String }])
    if (write instanceof Error) {
      TM.sendMessage(`${TM.palette.server}»${TM.palette.error} Server failed to write file.`, info.login)
      return
    }
    const challenge = await TM.addChallenge(file.name)
    if (challenge instanceof Error) {
      if (challenge.message.trim() === 'Challenge already added. Code: -1000') {
        const content = file.content.toString()
        let i = 0
        while (i < content.length) {
          if (content.substring(i, i + 12) === `<ident uid="`) {
            const id = content.substring(i + 12, i + 12 + 27)
            const challenge = TM.challenges.find(a => a.id === id)
            if (challenge === undefined) {
              TM.sendMessage(`${TM.palette.server}»${TM.palette.error} Server failed to queue the challenge.`, info.login)
              return
            }
            TM.addToJukebox(id)
            TM.sendMessage(`${TM.palette.server}»${TM.palette.admin} Map ${TM.strip(challenge.name)} was already in the server files, added it to jukebox`)
            return
          }
          i++
        }
      }
      TM.sendMessage(`${TM.palette.server}»${TM.palette.error} Server failed to queue the challenge.`, info.login)
      return
    }
    TM.sendMessage(`${TM.palette.server}»» ${TM.palette.admin}${TM.getTitle(info)} ` +
      `${TM.palette.highlight + TM.strip(info.nickName, true)}${TM.palette.admin} has added and queued ` +
      `${TM.palette.highlight + TM.strip(challenge.name, true)}${TM.palette.admin} from TMX.`)
  },
  privilege: 1
}

ChatService.addCommand(command)
