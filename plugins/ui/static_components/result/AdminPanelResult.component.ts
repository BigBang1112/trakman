import { IDS, StaticHeader, Grid, GridCellFunction, addManialinkListener } from '../../UiUtils.js'

import StaticComponent from '../../StaticComponent.js'
import config from './AdminPanelResult.config.js'
// todo u cant do some of these things on result right

export default class AdminPanelResult extends StaticComponent {

  private readonly positionX: number
  private readonly positionY: number
  private readonly side: boolean
  private readonly header: StaticHeader
  private xml: string = ''
  private readonly actions = {
    jukebox: 10,
    requeue: 20,
    previous: 30,
    players: 40
  }
  private readonly grid: Grid

  constructor() {
    super(IDS.adminResult, 'result')
    const pos = this.getRelativePosition()
    this.positionX = pos.x
    this.positionY = pos.y
    this.side = pos.side
    this.header = new StaticHeader('result')
    this.grid = new Grid(config.width, config.height - this.header.options.height, new Array(4).fill(1), [1], { margin: config.margin })
    tm.addListener('PrivilegeChanged', (info) => {
      this.displayToPlayer(info.login)
    })
    addManialinkListener(this.id + this.actions.jukebox, async info => {
      tm.sendMessage(tm.utils.strVar(config.messages.skip, {
        title: info.title,
        adminName: tm.utils.strip(info.nickname)
      }), config.public ? undefined : info.login)
      tm.client.callNoRes(`NextChallenge`)
    })
    addManialinkListener(this.id + this.actions.requeue, info => {
      tm.sendMessage(tm.utils.strVar(config.messages.requeue, {
        title: info.title,
        adminName: tm.utils.strip(info.nickname)
      }), config.public ? undefined : info.login)
      tm.jukebox.add(tm.maps.current.id, info)
    })
    addManialinkListener(this.id + this.actions.previous, async info => {
      tm.sendMessage(tm.utils.strVar(config.messages.previous, {
        title: info.title,
        adminName: tm.utils.strip(info.nickname)
      }), config.public ? undefined : info.login)
      await tm.jukebox.add(tm.jukebox.history[0].id, info)
      tm.client.callNoRes(`NextChallenge`)
    })
    addManialinkListener(this.id + this.actions.players, info => {
      tm.openManialink(IDS.playerList, info.login)
    })
    addManialinkListener(this.id + this.actions.jukebox, info => {
      tm.openManialink(IDS.mapList, info.login) // Todo make it jukebox
    })
  }

  display(): void {
    this.constructXml()
    for (const e of tm.players.list) {
      this.displayToPlayer(e.login)
    }
  }

  displayToPlayer(login: string): void {
    const privilege: number = tm.players.get(login)?.privilege ?? 0
    if (privilege >= config.privilege) {
      tm.sendManialink(this.xml, login)
    }
  }

  private constructButton(width: number, height: number, icon: string, hoverIcon: string, actionId?: number): string {
    const actionIdStr = actionId === undefined ? '' : ` action="${actionId + this.id}"`
    const cover = actionId !== undefined ? '' : `<quad posn="0 0 5" sizen="${width} ${height}" bgcolor="${config.disabledColour}"/>`
    return `${cover}
    <quad posn="0 0 1" sizen="${width} ${height}" bgcolor="${config.background}"/>
    <quad posn="${config.margin} -${config.margin} 2" 
    sizen="${width - config.margin * 2} ${height - config.margin * 2}" 
    image="${icon}" imagefocus="${hoverIcon}"${actionIdStr}/>`
  }

  private constructXml(): void {
    const playersButton: GridCellFunction = (i, j, w, h) =>
      this.constructButton(w, h, config.icons.players, config.iconsHover.players, this.actions.players)
    const previousButton: GridCellFunction = (i, j, w, h) => {
      if (tm.jukebox.history.length < 1) {
        return this.constructButton(w, h, config.icons.previous, config.iconsHover.previous)
      }
      return this.constructButton(w, h, config.icons.previous, config.iconsHover.previous, this.actions.previous)
    }
    const replayButton: GridCellFunction = (i, j, w, h) =>
      this.constructButton(w, h, config.icons.requeue, config.iconsHover.requeue, this.actions.requeue)
    const jukeboxButton: GridCellFunction = (i, j, w, h) =>
      this.constructButton(w, h, config.icons.jukebox, config.iconsHover.jukebox, this.actions.jukebox)
    this.xml = `
    <manialink id="${this.id}">
      <frame posn="${this.positionX} ${this.positionY} -38">
        <format textsize="1" textcolor="FFFF"/> 
        ${this.header.constructXml(config.title, config.icon, this.side)}
        <frame posn="0 ${-this.header.options.height - config.margin} 1">
          ${this.grid.constructXml([playersButton, previousButton, replayButton, jukeboxButton])}
        </frame>
      </frame>
    </manialink>`
  }

}