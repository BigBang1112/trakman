/**
 * @author lythx
 * @since 0.1
 */

import { RecordList, componentIds, StaticHeader, StaticComponent } from '../../UI.js'
import { dedimania } from '../../../dedimania/Dedimania.js'

import config from './DediRanking.config.js'

export default class DediRanking extends StaticComponent {

  private readonly header: StaticHeader
  private recordList!: RecordList
  private readonly maxDedis: number = dedimania.recordCountLimit

  constructor() {
    super(componentIds.dedis)
    this.header = new StaticHeader('race')
    this.getRecordList()
    dedimania.onFetch((): void => this.display())
    dedimania.onRecord((): void => this.display())
    dedimania.onNicknameUpdate((): void => this.display())
    tm.addListener('PlayerJoin', (info: tm.JoinInfo): void => {
      if (dedimania.getRecord(info.login) !== undefined) { this.display() }
    })
    tm.addListener('PlayerLeave', (info: tm.LeaveInfo): void => {
      if (dedimania.getRecord(info.login) !== undefined) { this.display() }
    })
  }

  display(): void {
    if (!this.isDisplayed) { return }
    for (const player of tm.players.list) {
      this.displayToPlayer(player.login)
    }
  }

  displayToPlayer(login: string): void {
    if (!this.isDisplayed) { return }
    tm.sendManialink(`<manialink id="${this.id}">
      <frame posn="${this.positionX} ${this.positionY} 1">
        <format textsize="1" textcolor="FFFF"/> 
        ${this.header.constructXml(config.title, config.icon, this.side, { actionId: componentIds.dediCps })}
        <frame posn="0 -${this.header.options.height + config.margin} 1">
          ${this.recordList.constructXml(login, dedimania.records.map(a => ({ ...a, name: a.nickname })))}
        </frame>
      </frame>
    </manialink>`,
      login
    )
  }

  getEntries(): number {
    if (tm.getGameMode() === 'Teams') {
      return config.teamsEntries
    } if (tm.getGameMode() === 'Rounds') {
      return config.roundsEntries
    } if (tm.getGameMode() === 'Cup') {
      return config.cupEntries
    } if (tm.getGameMode() === 'Laps') {
      return config.lapsEntries
    }
    return config.entries
  }

  getHeight(): number {
    return config.entryHeight * this.getEntries() + StaticHeader.raceHeight + config.margin
  }

  getTopCount(): number {
    if (tm.getGameMode() === 'Teams') {
      return config.teamsTopCount
    } if (tm.getGameMode() === 'Rounds') {
      return config.roundsTopCount
    } if (tm.getGameMode() === 'Cup') {
      return config.cupTopCount
    } if (tm.getGameMode() === 'Laps') {
      return config.lapsTopCount
    }
    return config.topCount
  }

  protected onPositionChange(): void {
    this.getRecordList()
    this.display()
  }

  private getRecordList(): void {
      this.recordList?.destroy?.()
    this.recordList = new RecordList('race', this.id, config.width, this.getHeight() - (this.header.options.height + config.margin),
      this.getEntries(), this.side, this.getTopCount(), this.maxDedis, config.displayNoRecordEntry)
    this.recordList.onClick((info: tm.ManialinkClickInfo): void => {
      this.displayToPlayer(info.login)
    })
  }

}
