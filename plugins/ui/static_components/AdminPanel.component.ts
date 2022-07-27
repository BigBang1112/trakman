import { getStaticPosition, CONFIG, ICONS, IDS, staticHeader, getIcon } from '../UiUtils.js'
import { TRAKMAN as TM } from '../../../src/Trakman.js'
import StaticComponent from '../StaticComponent.js'

export default class AdminPanel extends StaticComponent {

  private readonly width = CONFIG.static.width
  private readonly height = CONFIG.admin.height
  private readonly positionX: number
  private readonly positionY: number
  private xml: string = ''

  constructor() {
    super(IDS.admin, { displayOnRace: true, hideOnResult: true })
    const pos = getStaticPosition('admin')
    this.positionX = pos.x
    this.positionY = pos.y
    this.constructXml()
    TM.addListener('Controller.PrivilegeChanged', (info) => {
      if (this._isDisplayed === true) {
        this.displayToPlayer(info.login)
      }
    })
  }

  display(): void {
    this._isDisplayed = true
    for (const e of TM.players) {
      this.displayToPlayer(e.login)
    }
  }

  displayToPlayer(login: string): void {
    const player = TM.getPlayer(login)
    if (player !== undefined && player.privilege > 0) {
      TM.sendManialink(this.xml, login)
    } else {
      TM.sendManialink(`<manialink id=${this.id}></manialink>`)
    }
  }

  private constructXml(): void {
    const headerHeight: number = CONFIG.staticHeader.height
    const margin: number = CONFIG.marginSmall
    const icons: string[] = CONFIG.admin.icons
    let iconsXml: string = ''
    const iconWidth: number = this.width / icons.length
    for (const [i, e] of icons.entries()) {
      iconsXml += `
      <quad posn="${iconWidth * i} -${CONFIG.staticHeader.height + margin} 1" sizen="${iconWidth - margin} ${this.height - (headerHeight + margin)}" bgcolor="${CONFIG.static.bgColor}"/>
      <quad posn="${iconWidth * i + margin} -${CONFIG.staticHeader.height + margin * 2} 2" sizen="${iconWidth - margin * 3} ${this.height - (headerHeight + margin * 3)}" image="${getIcon(e)}"/>`
    }
    this.xml = `
    <manialink id="${this.id}">
      <frame posn="${this.positionX} ${this.positionY} -38">
        <format textsize="1" textcolor="FFFF"/> 
        ${staticHeader(CONFIG.admin.title, getIcon(CONFIG.admin.icon), false)}
        ${iconsXml}
      </frame>
    </manialink>`
  }

}