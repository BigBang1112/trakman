/**
 * @author lythx
 * @since 0.1
 */

import { componentIds, StaticHeader, StaticComponent, centeredText, addManialinkListener } from '../../UI.js'
import config from './TimerWidget.config.js'

export default class TimerWidget extends StaticComponent {

  private readonly positionX: number
  private readonly positionY: number
  private readonly side: boolean
  private readonly header: StaticHeader
  private flexiTimeInterval: NodeJS.Timer | undefined
  private noButtonXml: string = ''
  private xmlWithButtons: string = ''
  private readonly pauseButtonId = this.id + 1
  private readonly addButtonid = this.id + 2
  private readonly subtractButtonId = this.id + 3

  constructor() {
    super(componentIds.timer, 'race')
    const pos = this.getRelativePosition()
    this.positionX = pos.x
    this.positionY = pos.y
    this.side = pos.side
    this.header = new StaticHeader('race')
    this.noButtonXml = this.constructXml(false)
    this.xmlWithButtons = this.constructXml(true)
    if (tm.state.dynamicTimerEnabled) {
      this.startDynamicTimerInterval()
    }
    tm.addListener('DynamicTimerStateChanged', (state) => {
      if (state === 'enabled') {
        this.startDynamicTimerInterval()
      } else {
        clearInterval(this.flexiTimeInterval)
      }
    })
    addManialinkListener(this.pauseButtonId, (info) => {
      if (info.privilege < config.timerActionsPrivilege) { return }
      if (!tm.state.dynamicTimerEnabled) {
        tm.sendMessage(config.notDynamic, info.login)
        return
      }
      const strObject = {
        title: info.title,
        adminName: tm.utils.strip(info.nickname)
      }
      if (tm.state.isTimerPaused) {
        tm.sendMessage(tm.utils.strVar(config.resume, strObject))
        tm.state.resumeTimer()
      } else {
        tm.sendMessage(tm.utils.strVar(config.pause, strObject))
        tm.state.pauseTimer()
      }
    })
    addManialinkListener(this.addButtonid, (info) => {
      if (info.privilege < config.timerActionsPrivilege) { return }
      if (!tm.state.dynamicTimerEnabled) {
        tm.sendMessage(config.notDynamic, info.login)
        return
      }
      tm.state.addTime(config.timeAddedOnClick)
      const strObject = {
        title: info.title,
        adminName: tm.utils.strip(info.nickname),
        time: tm.utils.msToTime(tm.state.remainingRaceTime)
      }
      tm.sendMessage(tm.utils.strVar(config.set, strObject))
    })
    addManialinkListener(this.subtractButtonId, (info) => {
      if (info.privilege < config.timerActionsPrivilege) { return }
      if (!tm.state.dynamicTimerEnabled) {
        tm.sendMessage(config.notDynamic, info.login)
        return
      }
      const subtracted = tm.state.subtractTime(config.timeSubtractedOnClick)
      if (subtracted === false) { return }
      const strObject = {
        title: info.title,
        adminName: tm.utils.strip(info.nickname),
        time: tm.utils.msToTime(tm.state.remainingRaceTime)
      }
      tm.sendMessage(tm.utils.strVar(config.set, strObject))
    })
  }

  private startDynamicTimerInterval() {
    clearInterval(this.flexiTimeInterval)
    this.flexiTimeInterval = setInterval(() => {
      this.noButtonXml = this.constructXml(false)
      this.xmlWithButtons = this.constructXml(true)
      this.display()
    }, 300)
  }

  display(): void {
    if (this.isDisplayed === false) { return }
    for (const e of tm.players.list) {
      this.displayToPlayer(e.login, e.privilege)
    }
  }

  displayToPlayer(login: string, privilege?: number): void {
    if (this.isDisplayed === false) { return }
    if (!tm.state.dynamicTimerEnabled || (privilege ?? 0) < config.timerActionsPrivilege) {
      tm.sendManialink(this.noButtonXml, login)
    } else {
      tm.sendManialink(this.xmlWithButtons, login)
    }
  }

  private constructXml(constructButtons: boolean): string {
    const headerHeight: number = this.header.options.height
    let headerXml = constructButtons ? this.getButtonsXml() :
      this.header.constructXml(config.title, config.icon, this.side)
    let timeXml = ''
    const bottomH = config.height - (headerHeight + config.margin)
    if (tm.state.dynamicTimerEnabled) {
      if (tm.state.isTimerPaused) {
        // TODO CONFIG
        timeXml = centeredText("PAUSED", config.width, bottomH, { specialFont: true, yOffset: -0.3, xOffset: 0.2 })
      } else {
        const time = tm.state.remainingRaceTime
        let timeColour = config.timeColours[0]
        if (time < config.colourChangeThresholds[1]) {
          timeColour = config.timeColours[2]
        } else if (time < config.colourChangeThresholds[0]) {
          timeColour = config.timeColours[1]
        }
        const hoursAmount = ~~(time / (60 * 60 * 1000))
        const hours = hoursAmount === 0 ? '' : `${hoursAmount.toString()}:`
        const minutes = (~~(time / (60 * 1000)) % 60).toString().padStart(2, '0')
        const seconds = (~~(time / 1000) % 60).toString().padStart(2, '0')
        const timeStr = hoursAmount < 100 ? `${hours}${minutes}:${seconds}` : `${hoursAmount} hours`
        timeXml = centeredText('$' + timeColour + timeStr, config.width, bottomH, { specialFont: true, yOffset: -0.3 })
      }
    }
    return `
    <manialink id="${this.id}">
      <frame posn="${this.positionX} ${this.positionY} -38">
        <format textsize="1" textcolor="FFFF"/> 
        ${headerXml}
        <frame posn="0 ${-headerHeight - config.margin} -40">
          <quad posn="0 0 1" sizen="${config.width} ${bottomH}" action="${this.pauseButtonId}"/>
          <quad posn="0 0 -45" sizen="${config.width} ${bottomH}" bgcolor="${config.background}"/>
          ${timeXml}
        </frame>
      </frame>
    </manialink>`
  }

  private getButtonsXml(): string {
    const headerW = config.width - 3 * (config.buttonWidth + config.margin)
    const headerRectWidth = headerW - (this.header.options.squareWidth + this.header.options.margin)
    let buttonXml = ''
    for (const [i, e] of config.buttonOrder.entries()) {
      const x = headerW + config.margin + (config.margin + config.buttonWidth) * i
      const w = config.buttonWidth
      const h = this.header.options.height
      const m = config.iconPadding
      let icon!: string
      let hoverIcon!: string
      let id!: number
      if (e === 'pause') {
        icon = tm.state.isTimerPaused ? config.icons.resume : config.icons.pause
        hoverIcon = tm.state.isTimerPaused ? config.iconsHover.resume : config.iconsHover.pause
        id = this.pauseButtonId
      } else if (e === 'add') {
        icon = config.icons.add
        hoverIcon = config.iconsHover.add
        id = this.addButtonid
      } else if (e === 'subtract') {
        icon = config.icons.subtract
        hoverIcon = config.iconsHover.subtract
        id = this.subtractButtonId
      }
      buttonXml += `<quad posn="${x} 0 0" sizen="${w} ${h}" bgcolor="${this.header.options.iconBackground}" />
      <quad posn="${x + m} ${-m} 1" sizen="${w - 2 * m} ${h - 2 * m}" imagefocus="${hoverIcon}" image="${icon}" action="${id}"/>`
    }
    return this.header.constructXml(config.title, config.icon,
      this.side, { rectangleWidth: headerRectWidth }) + buttonXml
  }

}
