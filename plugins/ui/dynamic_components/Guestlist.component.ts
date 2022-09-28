import PopupWindow from '../PopupWindow.js'

import { closeButton, IDS, Grid, centeredText, GridCellFunction, Paginator } from '../UiUtils.js'
import config from './Guestlist.config.js'

export default class Guestlist extends PopupWindow<number> {

  readonly grid: Grid
  readonly paginator: Paginator

  constructor() {
    super(IDS.guestlist, config.icon, config.title, config.navbar)
    this.grid = new Grid(this.contentWidth, this.contentHeight, config.columnProportions,
      new Array(config.entries).fill(1), config.grid)
    this.paginator = new Paginator(this.openId, this.contentWidth, this.footerHeight,
      Math.ceil(tm.admin.guestCount / config.entries))
    this.paginator.onPageChange = (login, page, info) => {
      this.displayToPlayer(login, page, `${page}/${this.paginator.pageCount}`, info.privilege)
    }
    tm.addListener('ManialinkClick', async (info: ManialinkClickInfo) => {
      if (info.actionId >= this.openId + 1000 && info.actionId < this.openId + 2000) {
        const target = tm.admin.guestlist[info.actionId - this.openId - 1000]
        if (target === undefined) { return }
        const status = await tm.admin.removeGuest(target.login, info)
        if (status instanceof Error) {
          tm.sendMessage(tm.utils.strVar(config.messages.error, { login: target.login }), info.login)
        } else if (status === true) {
          tm.sendMessage(tm.utils.strVar(config.messages.text, {
            title: info.title,
            adminName: tm.utils.strip(info.nickname, true),
            name: tm.utils.strip(target.nickname ?? target.login, true)
          }))
        }
      }
    })
    tm.addListener(['AddGuest', 'RemoveGuest'], () => {
      this.paginator.setPageCount(Math.ceil(tm.admin.guestCount / config.entries))
      this.reRender()
    })
    tm.addListener('PrivilegeChanged', (info) => {
      if (info.newPrivilege < config.privilege) { this.hideToPlayer(info.login) }
      this.reRender()
    })
    tm.commands.add({
      aliases: ['guestl', 'guestlist'],
      help: 'Display guestlist.',
      callback: (info: TM.MessageInfo): void => tm.openManialink(this.openId, info.login),
      privilege: config.privilege
    })
    tm.addListener('PlayerInfoUpdated', () => this.reRender())
  }

  protected onOpen(info: ManialinkClickInfo): void {
    const page = this.paginator.getPageByLogin(info.login)
    this.displayToPlayer(info.login, page, `${page}/${this.paginator.pageCount}`, info.privilege)
  }

  private reRender(): void {
    const players = this.getPlayersWithWindowOpen(true)
    for (const player of players) {
      const page = this.paginator.getPageByLogin(player.login)
      this.displayToPlayer(player.login, page, `${page}/${this.paginator.pageCount}`, tm.players.get(player.login)?.privilege ?? 0)
    }
  }

  protected async constructContent(login: string, page: number = 1): Promise<string> {
    const index = (page - 1) * config.entries - 1
    const headers: GridCellFunction[] = [
      (i, j, w, h) => centeredText(' Index ', w, h),
      (i, j, w, h) => centeredText(' Nickname ', w, h),
      (i, j, w, h) => centeredText(' Login ', w, h),
      (i, j, w, h) => centeredText(' Date ', w, h),
      (i, j, w, h) => centeredText(' Admin ', w, h),
      (i, j, w, h) => centeredText(' Remove ', w, h),
    ]
    const guestlist = tm.admin.guestlist
    const fetchedPlayers = await tm.players.fetch(guestlist.map(a => a.login))
    const indexCell: GridCellFunction = (i, j, w, h) => {
      return centeredText((i + index + 1).toString(), w, h)
    }
    const nicknameCell: GridCellFunction = (i, j, w, h) => {
      const nickname = fetchedPlayers.find(a => a.login === guestlist[i + index].login)?.nickname
      return centeredText(tm.utils.safeString(tm.utils.strip(nickname ?? config.defaultNickname, false)), w, h)
    }
    const loginCell: GridCellFunction = (i, j, w, h) => guestlist[i + index].login === login ?
      centeredText('$' + config.selfColour + guestlist[i + index].login, w, h) : centeredText(guestlist[i + index].login, w, h)
    const dateCell: GridCellFunction = (i, j, w, h) => centeredText(tm.utils.formatDate(guestlist[i + index].date, true), w, h)
    const adminCell: GridCellFunction = (i, j, w, h) => centeredText(guestlist[i + index].callerLogin, w, h)
    const removeGuestbutton: GridCellFunction = (i, j, w, h) => {
      return `<quad posn="${w / 2} ${-h / 2} 1" sizen="${config.iconWidth} ${config.iconHeight}" image="${config.removeGuestIcon}"
      imagefocus="${config.removeGuestIconHover}" halign="center" valign="center" action="${this.openId + i + 1000 + index}"/>`
    }
    const rows = Math.min(config.entries, guestlist.length - (index + 1))
    const arr = headers
    for (let i = 0; i < rows; i++) {
      arr.push(indexCell, nicknameCell, loginCell, dateCell, adminCell, removeGuestbutton)
    }
    return this.grid.constructXml(arr)
  }

  protected constructFooter(login: string): string {
    return closeButton(this.closeId, this.windowWidth, this.footerHeight) +
      this.paginator.constructXml(login)
  }

}