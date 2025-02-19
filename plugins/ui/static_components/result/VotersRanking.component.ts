/**
 * @author lythx
 * @since 0.4
 */

import { componentIds, List, StaticHeader, StaticComponent } from '../../UI.js'
import { stats } from '../../../stats/Stats.js'
import config from './VotersRanking.config.js'

export default class VotersRanking extends StaticComponent {

  private readonly header: StaticHeader
  private readonly list: List
  private xml: string = ''

  constructor() {
    super(componentIds.votersRanking)
    this.header = new StaticHeader('result')
    this.list = new List(config.entries, config.width, this.getHeight() - (this.header.options.height + config.margin),
      config.columnProportions, { background: config.background, headerBg: this.header.options.textBackground })
    stats.votes.onUpdate((): void => this.display())
    stats.votes.onNicknameChange((): void => this.display())
  }

  getHeight(): number {
    return config.entryHeight * config.entries + StaticHeader.raceHeight + config.margin
  }

  display(): void {
    if (!this.isDisplayed) { return }
    this.constructXml()
    tm.sendManialink(this.xml)
  }

  displayToPlayer(login: string): void {
    if (!this.isDisplayed) { return }
    tm.sendManialink(this.xml, login)
  }

  constructXml(): void {
    const votes = stats.votes.list
    this.xml = `<manialink id="${this.id}">
      <format textsize="1"/>
      <frame posn="${this.positionX} ${this.positionY} 2">
      ${this.header.constructXml(config.title, config.icon, this.side)}
      <frame posn="0 ${-this.header.options.height - config.margin} 2">
        ${this.list.constructXml(votes.map(a => a.count.toString()), votes.map(a => tm.utils.safeString(tm.utils.strip(a.nickname, false))))}
      </frame>
      </frame>
    </manialink>`
  }

}
