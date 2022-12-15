import { ButtonData } from "./ButtonData.js"
import { UiButton } from "./UiButton.js"
import config from "./ButtonsWidget.config.js"
import { VoteWindow } from "../../../UI.js"
import messages from './Messages.config.js'

const cfg = config.voteReplay
const msg = messages.voteReplay

export class VoteReplay extends UiButton {

  buttonData!: ButtonData
  replayCount = 0
  triesCount = 0
  failedVoteTimestamp = 0
  isReplay = false
  isSkip = false
  parentId: number

  constructor(parentId: number) {
    super()
    this.parentId = parentId
    this.displayDefaultButtonText()
    tm.commands.add({
      aliases: cfg.command.aliases,
      help: cfg.command.help,
      callback: info => {
        this.handleClick(info.login, info.nickname)
      },
      privilege: cfg.command.privilege
    })
    tm.addListener('ManialinkClick', (info) => {
      if (info.actionId === cfg.actionId + this.parentId) {
        void this.handleClick(info.login, info.nickname)
      }
    })
    tm.addListener('BeginMap', () => this.handleMapStart())
    this.onReplay(() => this.handleMapReplay())
    this.onSkip(() => this.handleMapSkip())
  }

  private async handleClick(login: string, nickname: string): Promise<void> {
    if (this.isReplay === true || this.isSkip === true) { return }
    const action = tm.state.dynamicTimerEnabled ? msg.extendStr : msg.replayStr
    if (tm.state.remainingRaceTime <= cfg.minimumRemainingTime) {
      tm.sendMessage(tm.utils.strVar(msg.tooLate, { action }), login)
      return
    }
    if (Date.now() - this.failedVoteTimestamp < cfg.timeout * 1000) {
      tm.sendMessage(msg.failedRecently, login)
      return
    }
    if (this.triesCount >= cfg.triesLimit) {
      tm.sendMessage(msg.tooManyFailed, login)
      return
    }
    const startMsg: string = tm.utils.strVar(msg.start, { action, nickname: tm.utils.strip(nickname, true) })
    const header = tm.state.dynamicTimerEnabled ? cfg.extendHeader : cfg.resHeader
    const voteWindow: VoteWindow = new VoteWindow(login, cfg.goal, header, startMsg, cfg.time, cfg.voteIcon)
    const result = await voteWindow.startAndGetResult(tm.players.list.map(a => a.login))
    if (result === undefined) {
      tm.sendMessage(msg.alreadyRunning, login)
      return
    }
    if (result === false) {
      this.failedVoteTimestamp = Date.now()
      this.triesCount++
      tm.sendMessage(tm.utils.strVar(msg.didntPass, { action }))
    } else if (result === true) {
      this.replayCount++
      this.isReplay = true
      tm.sendMessage(tm.utils.strVar(msg.success, { action }))
      this.replayOrExtendTime()
    } else if (result.result === true) {
      this.replayCount++
      this.isReplay = true
      if (result.caller === undefined) {
        tm.sendMessage(tm.utils.strVar(msg.success, { action }))
      } else {
        tm.sendMessage(tm.utils.strVar(msg.forcePass, {
          title: result.caller.title,
          nickname: tm.utils.strip(result.caller.nickname, true),
          action
        }))
      }
      this.replayOrExtendTime()
    } else {
      this.failedVoteTimestamp = Date.now()
      this.triesCount++
      if (result.caller === undefined) {
        tm.sendMessage(tm.utils.strVar(msg.cancelled, { action }))
      } else {
        tm.sendMessage(tm.utils.strVar(msg.cancelledBy, {
          title: result.caller.title,
          nickname: tm.utils.strip(result.caller.nickname, true),
          action
        }))
      }
    }
  }

  private replayOrExtendTime(): void {
    if (tm.state.dynamicTimerEnabled) {
      tm.state.addTime(cfg.timeExtension)
    } else {
      this.handleMapReplay()
      this.emitReplay()
      tm.jukebox.add(tm.maps.current.id, undefined, true)
    }
  }

  private handleMapStart(): void {
    if (this.isReplay === false) { this.replayCount = 0 }
    if (this.replayCount >= cfg.replayLimit) {
      this.buttonData = {
        icon: cfg.icon,
        text1: cfg.texts[1][0],
        text2: cfg.texts[1][1],
        iconWidth: cfg.width,
        iconHeight: cfg.height,
        padding: cfg.padding,
        equalTexts: cfg.texts[1].equal,
        actionId: cfg.actionId + this.parentId
      }
    } else {
      this.displayDefaultButtonText()
    }
    this.triesCount = 0
    this.isReplay = false
    this.isSkip = false
    this.emitUpdate()
  }

  private displayDefaultButtonText() {
    if (tm.state.dynamicTimerEnabled) {
      this.buttonData = {
        icon: cfg.icon,
        text1: cfg.texts[4][0],
        text2: cfg.texts[4][1],
        iconWidth: cfg.width,
        iconHeight: cfg.height,
        padding: cfg.padding,
        equalTexts: cfg.texts[4].equal,
        actionId: cfg.actionId + this.parentId
      }
    } else {
      this.buttonData = {
        icon: cfg.icon,
        text1: cfg.texts[0][0],
        text2: cfg.texts[0][1],
        iconWidth: cfg.width,
        iconHeight: cfg.height,
        padding: cfg.padding,
        equalTexts: cfg.texts[0].equal,
        actionId: cfg.actionId + this.parentId
      }
    }
  }

  private handleMapReplay(): void {
    this.isReplay = true
    this.buttonData.text1 = cfg.texts[2][0]
    this.buttonData.text2 = cfg.texts[2][1]
    this.buttonData.equalTexts = cfg.texts[2].equal
    this.buttonData.actionId = undefined
    this.emitUpdate()
  }

  private handleMapSkip(): void {
    this.isSkip = true
    this.buttonData.text1 = cfg.texts[3][0]
    this.buttonData.text2 = cfg.texts[3][1]
    this.buttonData.equalTexts = cfg.texts[3].equal
    this.buttonData.actionId = undefined
    this.emitUpdate()
  }

}