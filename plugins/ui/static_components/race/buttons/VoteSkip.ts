import { ButtonData } from "./ButtonData.js"
import { UiButton } from "./UiButton.js"
import config from "./ButtonsWidget.config.js"
import { VoteWindow } from "../../../UI.js"
import messages from "./Messages.config.js"

const cfg = config.voteSkip
const msg = messages.voteSkip

export class VoteSkip extends UiButton {

  buttonData: ButtonData
  triesCount = 0
  failedVoteTimestamp = 0
  isLastMapReplay = false
  isReplay = false
  isSkip = false
  parentId: number

  constructor(parentId: number) {
    super()
    this.parentId = parentId
    this.buttonData = {
      icon: cfg.icon,
      text1: cfg.texts[0][0],
      text2: cfg.texts[0][1],
      iconWidth: cfg.width,
      iconHeight: cfg.height,
      padding: cfg.padding,
      actionId: cfg.actionId + this.parentId,
      equalTexts: cfg.texts[0].equal
    }
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
    this.onSkip(() => this.handleSkipNoCountdown())
    this.onReplay(() => this.handleReplay())
  }

  private async handleClick(login: string, nickname: string): Promise<void> {
    if (this.isLastMapReplay === true || this.isReplay === true
      || this.isSkip === true || tm.getState() === 'result') { return }
    if (tm.timer.remainingRaceTime <= cfg.minimumRemainingTime) {
      tm.sendMessage(msg.tooLate, login)
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
    const startMsg: string = tm.utils.strVar(msg.start, { nickname: tm.utils.strip(nickname, true) })
    if (tm.timer.remainingRaceTime <= cfg.minimumRemainingTime) { return } 
    const voteWindow: VoteWindow = new VoteWindow(login, cfg.goal, cfg.header, startMsg, cfg.time, cfg.voteIcon)
    const result = await voteWindow.startAndGetResult(tm.players.list.map(a => a.login))
    if (result === undefined) {
      tm.sendMessage(msg.alreadyRunning, login)
      return
    }
    if (result === false) {
      this.failedVoteTimestamp = Date.now()
      this.triesCount++
      tm.sendMessage(msg.didntPass)
    } else if (result === true) {
      this.handleSkip()
      tm.sendMessage(msg.success)
    } else if (result.result === true) {
      this.handleSkip()
      if (result.caller === undefined) {
        tm.sendMessage(msg.success)
      } else {
        tm.sendMessage(tm.utils.strVar(msg.forcePass, {
          title: result.caller.title,
          nickname: tm.utils.strip(result.caller.nickname, true)
        }))
      }
    } else {
      this.failedVoteTimestamp = Date.now()
      this.triesCount++
      if (result.caller === undefined) {
        tm.sendMessage(msg.cancelled)
      } else {
        tm.sendMessage(tm.utils.strVar(msg.cancelledBy, {
          title: result.caller.title,
          nickname: tm.utils.strip(result.caller.nickname, true)
        }))
      }
    }
  }

  private handleMapStart(): void {
    if (this.isReplay === false) {
      this.buttonData = {
        icon: cfg.icon,
        text1: cfg.texts[0][0],
        text2: cfg.texts[0][1],
        iconWidth: cfg.width,
        iconHeight: cfg.height,
        padding: cfg.padding,
        actionId: cfg.actionId + this.parentId,
        equalTexts: cfg.texts[0].equal
      }
      this.isLastMapReplay = false
    } else {
      this.buttonData = {
        icon: cfg.icon,
        text1: cfg.texts[2][0],
        text2: cfg.texts[2][1],
        iconWidth: cfg.width,
        iconHeight: cfg.height,
        padding: cfg.padding,
        equalTexts: cfg.texts[2].equal
      }
      this.isLastMapReplay = true
    }
    this.triesCount = 0
    this.isSkip = false
    this.isReplay = false
    this.emitUpdate()
  }

  private handleSkip(): void {
    let countDown: number = cfg.countdown
    const startTime: number = Date.now()
    this.isSkip = true
    this.buttonData.text1 = cfg.texts[1][0]
    this.buttonData.text2 = tm.utils.strVar(cfg.texts[1][1], { seconds: countDown.toString() })
    this.emitUpdate()
    this.emitSkip()
    const interval = setInterval(async (): Promise<void> => {
      if (tm.getState() === 'result') {
        this.handleSkipNoCountdown()
        clearInterval(interval)
        return
      }
      if (Date.now() > startTime + 1000 * (cfg.countdown - countDown)) {
        countDown--
        this.buttonData.text2 = tm.utils.strVar(cfg.texts[1][1], { seconds: countDown.toString() })
        this.emitUpdate()
        if (countDown === 0) {
          tm.client.callNoRes('NextChallenge')
          this.handleSkipNoCountdown()
          clearInterval(interval)
        }
      }
    }, 100)
  }

  private handleReplay(): void {
    if (this.isReplay === true) { return }
    this.isReplay = true
    if (this.isSkip === true || this.isLastMapReplay === true) { return }
    this.buttonData.text1 = cfg.texts[2][0]
    this.buttonData.text2 = cfg.texts[2][1]
    this.buttonData.equalTexts = cfg.texts[2].equal
    this.buttonData.actionId = undefined
    this.emitUpdate()
  }

  private handleSkipNoCountdown(): void {
    if (this.isSkip === true) { return }
    this.isSkip = true
    this.buttonData.text1 = cfg.texts[3][0]
    this.buttonData.text2 = cfg.texts[3][1]
    this.buttonData.equalTexts = cfg.texts[3].equal
    this.buttonData.actionId = undefined
    this.emitUpdate()
  }

}