import RaceUi from "../config/RaceUi.js"
import ResultUi from "../config/ResultUi.js"
import { components } from '../UI.js'

/**
 * Abstract class for static manialink components.
 */
export default abstract class StaticComponent {

  static components: {
    [mode in tm.GameMode | 'Result']: { [sideOrList in 'left' | 'right' | 'other']:
      { name: string, getHeight: () => number }[] }
  } =
    {
      TimeAttack: {
        left: [],
        right: [],
        other: []
      },
      Rounds: {
        left: [],
        right: [],
        other: []
      },
      Cup: {
        left: [],
        right: [],
        other: []
      },
      Laps: {
        left: [],
        right: [],
        other: []
      },
      Teams: {
        left: [],
        right: [],
        other: []
      },
      Stunts: {
        left: [],
        right: [],
        other: []
      },
      Result: {
        left: [],
        right: [],
        other: []
      }
    }
  static displayedComponents: {
    left: { name: string, getHeight: () => number }[],
    right: { name: string, getHeight: () => number }[],
    other: { name: string, getHeight: () => number }[]
  } = { left: [], right: [], other: [] }
  private _isDisplayed: boolean = true
  /** Component manialink ID */
  readonly id: number
  private static readonly componentCreateListeners: ((component: StaticComponent) => void)[] = []
  protected positionY: number
  protected positionX: number
  protected side: boolean
  static componentListCreated = false

  /**
   * Abstract class for static manialink components
   * @param id Component manialink ID
   */
  constructor(id: number) {
    if (!StaticComponent.componentListCreated) {
      StaticComponent.initialize()
    }
    this.id = id
    tm.addListener('EndMap', (info): void => {
      if (info.isRestart && info.serverSideRankings[0]?.BestTime === -1) { return } // ignore the short restart
      this.updateIsDisplayed()
      this.updatePosition()
      this._isDisplayed ? this.display() : this.hide()
    })
    tm.addListener('BeginMap', (): void => {
      this.updateIsDisplayed()
      this.updatePosition()
      this._isDisplayed ? this.display() : this.hide()
    })
    tm.addListener('PlayerJoin', async (info: tm.JoinInfo): Promise<void> => {
      if (this._isDisplayed) { this.displayToPlayer(info.login) }
    })
    this.updateIsDisplayed()
    const pos = this.getRelativePosition()
    this.positionX = pos.x
    this.positionY = pos.y
    this.side = pos.side
    for (const e of StaticComponent.componentCreateListeners) {
      e(this)
    }
  }

  private static initialize() {
    StaticComponent.refreshStaticLayouts()
    tm.addListener('EndMap', (info): void => {
      if (info.isRestart && info.serverSideRankings[0]?.BestTime === -1) { return } // ignore the short restart
      StaticComponent.updateDisplayedComponents()
    })
    tm.addListener('BeginMap', (): void => {
      StaticComponent.updateDisplayedComponents()
    })
  }

  /**
   * Gets component height. Used for static UI positioning
   * @returns Component height
   */
  abstract getHeight(): number

  /**
   * Updates positionX, positionY, and side props, calls onPositionChange
   */
  updatePosition(): void {
    const pos = this.getRelativePosition()
    this.positionX = pos.x
    this.positionY = pos.y
    this.side = pos.side
    this.onPositionChange()
  }

  /**
   * Executed on static UI layout change, by default calls the display() method
   */
  protected onPositionChange(): void {
    this.display()
  }

  private static updateDisplayedComponents() {
    if (tm.getState() === 'result') {
      this.displayedComponents = this.components.Result
    } else {
      this.displayedComponents = this.components[tm.getGameMode()]
    }
  }

  /**
   * Updates _isDisplayed prop based on current static UI layout
   */
  updateIsDisplayed(): void {
    this._isDisplayed = (StaticComponent.displayedComponents.left.some(a => a.name === this.constructor.name) ||
      StaticComponent.displayedComponents.right.some(a => a.name === this.constructor.name) ||
      StaticComponent.displayedComponents.other.some(a => a.name === this.constructor.name))
  }

  private static mapComponentHeight(names: string[]): { name: string, getHeight: () => number }[] {
    const ret: { name: string, getHeight: () => number }[] = []
    for (const e of names) {
      const comp = components.findStatic(e)
      if (comp === undefined) { continue }
      ret.push({ name: e, getHeight: comp.getHeight.bind(comp) })
    }
    return ret
  }

  /**
   * Refreshes static UI layouts and updates displayed components
   */
  static refreshStaticLayouts(): void {
    const c = this.components
    const r = RaceUi
    const res = ResultUi
    const f = this.mapComponentHeight
    c.TimeAttack = {
      left: f(r.leftSideOrder),
      right: f(r.rightSideOrder),
      other: f(r.otherComponents)
    }
    c.Rounds = {
      left: f(r.roundsLeftSideOrder),
      right: f(r.roundsRightSideOrder),
      other: f(r.roundsOtherComponents)
    }
    c.Cup = {
      left: f(r.cupLeftSideOrder),
      right: f(r.cupRightSideOrder),
      other: f(r.cupOtherComponents)
    }
    c.Teams = {
      left: f(r.teamsLeftSideOrder),
      right: f(r.teamsRightSideOrder),
      other: f(r.teamsOtherComponents)
    }
    c.Laps = {
      left: f(r.lapsLeftSideOrder),
      right: f(r.lapsRightSideOrder),
      other: f(r.lapsOtherComponents)
    }
    c.Stunts = {
      left: f(r.stuntsLeftSideOrder),
      right: f(r.stuntsRightSideOrder),
      other: f(r.stuntsOtherComponents)
    }
    c.Result = {
      left: f(res.leftSideOrder),
      right: f(res.rightSideOrder),
      other: f(res.otherComponents)
    }
    this.updateDisplayedComponents()
  }

  /**
   * Gets position relative to other static manialinks based on current static UI layout.
   * @returns Object containing coordinates and side of the component
   */
  private getRelativePosition(): { x: number, y: number, side: boolean } {
    const widgetName: string = this.constructor.name
    let cfg
    if (tm.getState() === 'result') {
      cfg = ResultUi
    } else {
      cfg = RaceUi
    }
    const left = StaticComponent.displayedComponents.left
    const right = StaticComponent.displayedComponents.right
    let side: boolean = false
    if (right.some(a => a.name === widgetName)) { side = true }
    const order: { name: string; getHeight: () => number; }[] = side ? right : left
    let positionSum: number = 0
    for (const e of order) {
      if (e.name === widgetName) { break }
      positionSum += e.getHeight() + cfg.marginBig
    }
    return { y: cfg.topBorder - positionSum, x: side ? cfg.rightPosition : cfg.leftPosition, side }
  }

  /**
   * Boolean indicating whether component should be displayed according to preset display mode.
   */
  get isDisplayed(): boolean {
    return this._isDisplayed
  }

  /**
   * Displays the manialink to all the players
   * @param params Optional params
   */
  abstract display(params?: any): void

  /**
   * Displays the manialink to given player
   * @param login Player login
   * @param params Optional params
   */
  abstract displayToPlayer(login: string, params?: any): void

  /**
   * Hides the manialink for all players
   */
  hide(): void {
    tm.sendManialink(`<manialink id="${this.id}"></manialink>`)
  }

  /**
   * Add a callback function to execute when new component object gets created 
   * @param callback Function to execute on event
   */
  static onComponentCreated(callback: (component: StaticComponent) => void): void {
    this.componentCreateListeners.push(callback)
  }

}
