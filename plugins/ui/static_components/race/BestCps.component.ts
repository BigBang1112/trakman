/**
 * @author lythx
 * @since 0.1
 */

import { componentIds, Grid, centeredText, rightAlignedText, leftAlignedText, Paginator, StaticHeader, StaticComponent, StaticHeaderOptions } from '../../UI.js'
import config from './BestCps.config.js'

export default class BestCps extends StaticComponent {

  private readonly bestCps: { login: string, time: number, nickname: string }[] = []
  private readonly header: StaticHeader
  private readonly headerBg: string
  private readonly headerHeight: number
  private readonly contentHeight: number
  private readonly paginator: Paginator
  private newestCp: number = -1
  private cpAmount: number
  private grid: Grid

  constructor() {
    super(componentIds.bestCps)
    this.header = new StaticHeader('race')
    this.headerBg = this.header.options.textBackground
    this.headerHeight = this.header.options.height
    this.contentHeight = ((config.entryHeight + config.margin * 2) * config.entries) - (this.headerHeight + config.margin)
    this.cpAmount = tm.maps.current.checkpointsAmount - 1
    this.grid = new Grid(config.width + config.margin * 2, this.contentHeight, config.columnProportions,
      new Array(config.entries).fill(1), { margin: config.margin })
    this.paginator = new Paginator(this.id, 0, 0, 0)
    tm.addListener('PlayerCheckpoint', (info: tm.CheckpointInfo): void => {
      if (this.bestCps[info.index] === undefined || this.bestCps[info.index].time > info.time) {
        this.bestCps[info.index] = { login: info.player.login, time: info.time, nickname: info.player.nickname }
        this.paginator.setPageCount(Math.ceil(this.bestCps.length / config.entries))
        this.newestCp = info.index
        this.display()
      }
      const page: number = this.paginator.setPageForLogin(info.player.login, Math.ceil((info.index + 1) / config.entries))
      this.displayToPlayer(info.player.login, { page })
    })
    tm.addListener('BeginMap', (): void => {
      this.newestCp = -1
      this.cpAmount = tm.maps.current.checkpointsAmount - 1
      this.paginator.setPageCount(1)
      this.paginator.resetPlayerPages()
      this.grid = new Grid(config.width + config.margin * 2, this.contentHeight, config.columnProportions,
        new Array(config.entries).fill(1), { margin: config.margin })
      this.bestCps.length = 0
      this.display()
    })
    tm.addListener('PlayerDataUpdated', (info): void => {
      for (const e of this.bestCps) {
        const newNickname: string | undefined = info.find(a => a.login === e.login)?.nickname
        if (newNickname !== undefined) { e.nickname = newNickname }
      }
      this.display()
    })
    this.paginator.onPageChange = (login: string): void => {
      this.displayToPlayer(login)
    }
  }

  getHeight(): number {
    return (config.entryHeight + config.margin * 2) * config.entries + StaticHeader.raceHeight + config.margin
  }

  display(): void {
    if (!this.isDisplayed) { return }
    for (const e of tm.players.list) {
      this.displayToPlayer(e.login)
    }
  }

  displayToPlayer(login: string, params?: { page?: number }): void {
    if (!this.isDisplayed) { return }
    const page: number = params?.page === undefined ? this.paginator.getPageByLogin(login) : params.page
    const pageCount: number = this.paginator.pageCount
    tm.sendManialink(`
    <manialink id="${this.id}">
    <frame posn="${config.posX} ${config.posY} 1">
      <format textsize="1"/>
      ${this.constructHeader(page, pageCount)}
    </frame>
    <frame posn="${config.posX - config.margin} ${config.posY - (this.headerHeight)} 1">
      <format textsize="1"/>
      ${this.constructText(login, page)}
    </frame>
    </manialink>`, login)
  }

  private constructHeader(page: number, pageCount: number): string {
    if (this.bestCps.length === 0) { return '' }
    let icons: (string | undefined)[] = [config.upIcon, config.downIcon]
    let iconsHover: (string | undefined)[] = [config.upIconHover, config.downIconHover]
    let ids: (number | undefined)[] = [this.paginator.ids[0], this.paginator.ids[1]]
    let buttonAmount: number = 2
    if (page === 1) {
      ids = [undefined, this.paginator.ids[1]]
      iconsHover = [undefined, config.downIconHover]
      icons = [undefined, config.downIcon]

    } else if (page === pageCount) {
      icons = [config.upIcon]
      iconsHover = [config.upIconHover]
      ids = [this.paginator.ids[0]]
    }
    if (pageCount === 1) {
      buttonAmount = 0
    }
    const headerCfg: StaticHeaderOptions = this.header.options
    let buttonsXml: string = ''
    for (let i: number = 0; i < buttonAmount; i++) {
      const action: string = ids[i] === undefined ? '' : `action="${ids[i]}"`
      const icon: string = icons[i] === undefined ? '' : `<quad posn="${headerCfg.iconHorizontalPadding} ${-headerCfg.iconVerticalPadding} 4" 
      sizen="${headerCfg.iconWidth} ${headerCfg.iconHeight}" image="${icons[i]}" imagefocus="${iconsHover[i]}" ${action}/>`
      buttonsXml += `<frame posn="${(config.width + config.margin) - (headerCfg.squareWidth + config.margin) * ((buttonAmount - i) + 1)} 0 1">
        <quad posn="0 0 1" sizen="${headerCfg.squareWidth} ${this.headerHeight}" bgcolor="${this.headerBg}"/>
        ${icon}
      </frame>`
    }
    return `<quad posn="0 0 1" sizen="${config.width - (headerCfg.squareWidth + config.margin) * (1 + buttonAmount)} ${this.headerHeight}" bgcolor="${this.headerBg}"/>
      ${rightAlignedText(config.title, config.width - (headerCfg.squareWidth + config.margin) * (1 + buttonAmount), this.headerHeight, { textScale: config.textScale, yOffset: -0.1 })}
    <frame posn="${config.width - headerCfg.squareWidth} 0 1">
    <quad posn="0 0 1" sizen="${headerCfg.squareWidth} ${this.headerHeight}" bgcolor="${this.headerBg}"/>
    <quad posn="${headerCfg.iconHorizontalPadding} ${-headerCfg.iconVerticalPadding} 4" sizen="${headerCfg.iconWidth} ${headerCfg.iconHeight}" image="${config.icon}"/> 
    </frame>
    ${buttonsXml}
    `
  }

  private constructText(login: string, page: number): string {
    if (this.bestCps.length === 0) { return '' }
    // bestCps[i] can be undefined if someone was driving while controller was off (first indexes dont exist) so im just returning empty cells
    const cpIndex: number = config.entries * (page - 1)

    const indexCell = (i: number, j: number, w: number, h: number): string => {
      const bg = `<quad posn="0 0 1" sizen="${w} ${h}" bgcolor="${this.headerBg}"/>`
      return this.bestCps[i + cpIndex] === undefined ? '' : bg + (centeredText((i + 1 + cpIndex).toString(), w, h, { textScale: config.textScale, padding: config.textPadding }))
    }

    const timeCell = (i: number, j: number, w: number, h: number): string => {
      const bg = `<quad posn="0 0 1" sizen="${w} ${h}" bgcolor="${config.background}"/>`
      const cp = this.bestCps[i + cpIndex]
      if (cp === undefined) { return '' }
      let format: string = cp.login === login ? `<format textcolor="${config.selfColour}"/>` : ''
      if (i + cpIndex === this.newestCp) { format = `<format textcolor="${config.newestColour}"/>` }
      return bg + format + centeredText(tm.utils.getTimeString(cp.time), w, h, { textScale: config.textScale, padding: config.textPadding })
    }

    const nicknameCell = (i: number, j: number, w: number, h: number): string => {
      const bg = `<quad posn="0 0 1" sizen="${w} ${h}" bgcolor="${config.background}"/>`
      return this.bestCps[i + cpIndex] === undefined ? '' : bg + (this.bestCps[i + cpIndex] === undefined ? '' : leftAlignedText(tm.utils.strip(this.bestCps[i + cpIndex].nickname, false), w, h, { textScale: config.textScale, padding: config.textPadding }))
    }

    const cpsToDisplay: number = this.cpAmount - cpIndex
    const arr: ((i: number, j: number, w: number, h: number) => string)[] = []
    for (let i: number = 0; i < cpsToDisplay; i++) {
      arr.push(indexCell, timeCell, nicknameCell)
    }
    return this.grid.constructXml(arr)
  }

}
