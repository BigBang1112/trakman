import { TRAKMAN as TM } from '../src/Trakman.js'
import config from '../config.json' assert { type: 'json' }

const events: TMListener[] = [
  {
    event: 'Controller.Ready',
    callback: async (): Promise<void> => {
      TM.sendMessage(`${TM.palette.server}»» ${TM.palette.servermsg}Trakman ${TM.palette.highlight}`
        + `v${config.version}${TM.palette.servermsg} startup sequence successful.`)
    }
  },
  {
    event: 'Controller.PlayerJoin',
    callback: async (player: JoinInfo): Promise<void> => {
      TM.sendMessage(`${TM.palette.server}»» ${TM.palette.servermsg}${TM.getTitle(player)}${TM.palette.highlight}: `
        + `${TM.strip(player.nickname, true)}${TM.palette.servermsg} Country${TM.palette.highlight}: `
        + `${player.nation} ${TM.palette.servermsg}Visits${TM.palette.highlight}: ${player.visits}${TM.palette.servermsg}.`)
    }
  },
  {
    event: 'Controller.PlayerLeave',
    callback: async (player: LeaveInfo): Promise<void> => {
      TM.sendMessage(`${TM.palette.server}»» ${TM.palette.highlight + TM.strip(player.nickname, true)}${TM.palette.servermsg} `
        + `has quit after ${TM.palette.highlight + TM.msToTime(player.sessionTime)}${TM.palette.servermsg}.`)
    }
  },
  {
    event: 'Controller.PlayerRecord',
    callback: async (info: RecordInfo): Promise<void> => {
      let rs = { str: '', calcDiff: false } // Rec status
      let diff // Difference
      if (info.previousPosition === -1) { rs.str = 'acquired', rs.calcDiff = false }
      else if (info.previousPosition > info.position) { rs.str = 'obtained', rs.calcDiff = true }
      else if (info.previousPosition === info.position && info.previousTime === info.time) { rs.str = 'equaled', rs.calcDiff = false }
      else if (info.previousPosition === info.position) { rs.str = 'improved', rs.calcDiff = true }
      if (rs.calcDiff) {
        diff = TM.Utils.getTimeString(info.previousTime - info.time)
        let i: number = -1
        while (true) {
          i++
          if (diff[i] === undefined || (!isNaN(Number(diff[i])) && Number(diff[i]) !== 0) || diff.length === 4) { break }
          if (Number(diff[i]) !== 0) { continue }
          diff = diff.substring(1)
          i--
          if (diff[i + 1] === ':') {
            diff = diff.substring(1)
          }
        }
      }
      TM.sendMessage(`${TM.palette.server}»» ${TM.palette.highlight + TM.strip(info.nickname, true)}${TM.palette.record} has `
        + `${rs.str} the ${TM.palette.rank + TM.Utils.getPositionString(info.position)}${TM.palette.record} `
        + `local record. Time${TM.palette.highlight}: ${TM.Utils.getTimeString(info.time)}`
        + `${rs.calcDiff ? ` ${TM.palette.record}$n(${TM.palette.rank + info.previousPosition} ${TM.palette.highlight}-${diff + TM.palette.record})` : ``}`)
    }
  },
  {
    event: 'Controller.DedimaniaRecord',
    callback: async (info: DediRecordInfo): Promise<void> => {
      let rs = { str: '', calcDiff: false } // Rec status
      let diff // Difference
      if (info.previousPosition === -1) { rs.str = 'acquired', rs.calcDiff = false }
      else if (info.previousPosition > info.position) { rs.str = 'obtained', rs.calcDiff = true }
      else if (info.previousPosition === info.position && info.previousTime === info.time) { rs.str = 'equaled', rs.calcDiff = false }
      else if (info.previousPosition === info.position) { rs.str = 'improved', rs.calcDiff = true }
      if (rs.calcDiff) {
        diff = TM.Utils.getTimeString(info.previousTime - info.time)
        let i: number = -1
        while (true) {
          i++
          if (diff[i] === undefined || (!isNaN(Number(diff[i])) && Number(diff[i]) !== 0) || diff.length === 4) { break }
          if (Number(diff[i]) !== 0) { continue }
          diff = diff.substring(1)
          i--
          if (diff[i + 1] === ':') {
            diff = diff.substring(1)
          }
        }
      }
      TM.sendMessage(`${TM.palette.server}»» ${TM.palette.highlight + TM.strip(info.nickname, true)}${TM.palette.dedirecord} has `
        + `${rs.str} the ${TM.palette.rank + TM.Utils.getPositionString(info.position)}${TM.palette.dedirecord} `
        + `dedimania record. Time${TM.palette.highlight}: ${TM.Utils.getTimeString(info.time)}`
        + `${rs.calcDiff ? ` ${TM.palette.dedirecord}$n(${TM.palette.rank + info.previousPosition} ${TM.palette.highlight}-${diff + TM.palette.dedirecord})` : ``}`)
    }
  },
]

for (const event of events) { TM.addListener(event.event, event.callback) }
