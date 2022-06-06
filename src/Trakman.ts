import { GameService } from './services/GameService.js'
import { PlayerService } from './services/PlayerService.js'
import { RecordService } from './services/RecordService.js'
import { ChallengeService } from './services/ChallengeService.js'
import { DedimaniaService } from './services/DedimaniaService.js'
import { Client } from './Client.js'
import { ChatService } from './services/ChatService.js'
import colours from './data/Colours.json' assert {type: 'json'}
import { Events } from './Events.js'
import { Utils } from './Utils.js'
import { randomUUID } from 'crypto'
import { Database } from './database/DB.js'
import { TMXService } from './services/TMXService.js'
import { ErrorHandler } from './ErrorHandler.js'
import { JukeboxService } from './services/JukeboxService.js'

const DB = new Database()
DB.initialize()

export const TRAKMAN = {

  specialTitles: [
    { login: 'redgreendevil', title: 'Venti the Anemo Archon' },
    { login: 'petr_kharpe', title: 'SUSPICIOUS PETER 丹丹丹丹丹丹丹' }
  ],
  titles: ['Player', 'Operator', 'Admin', 'Masteradmin', 'Server Owner'],

  getTitle(player: any): string {
    const title = TRAKMAN.titles[player.privilege]
    const specialTitle = TRAKMAN.specialTitles.find(a => a.login === player.login)
    if (specialTitle != null) {
      return specialTitle.title
    }
    return title
  },

  strip(str: string, removeColours: boolean = true) {
    return removeColours
      ? str.replace(/\$(?:[\da-f][^$][^$]|[\da-f][^$]|[^][LHP]|(?=[][])|$)|\$[LHP]\[.*?](.*?)\$[LHP]|\$[LHP]\[.*?]|\$[SHWIPLONGTZ]/gi, '')
      : str.replace(/\$(?:[^][LHP]|(?=[][])|$)|\$[LHP]\[.*?](.*?)\$[LHP]|\$[LHP]\[.*?]|\$[SHWIPLONGTZ]/gi, '')
  },

  msToTime(ms: number) {
    const d: Date = new Date(ms)
    let str: string = ''
    const seconds: number = d.getUTCSeconds()
    const minutes: number = d.getUTCMinutes()
    const hours: number = d.getUTCHours()
    const days: number = d.getUTCDate() - 1
    if (days > 0) { str += days === 1 ? `${days} day, ` : `${days} days, ` }
    if (hours > 0) { str += hours === 1 ? `${hours} hour, ` : `${hours} hours, ` }
    if (minutes > 0) { str += minutes === 1 ? `${minutes} minute, ` : `${minutes} minutes, ` }
    if (seconds > 0) { str += seconds === 1 ? `${seconds} second, ` : `${seconds} seconds, ` }
    str = str.substring(0, str.length - 2)
    const index = str.lastIndexOf(',')
    if (index !== -1) { str = str.substring(0, index) + ' and' + str.substring(index + 1) }
    if (str === '') { return '0 seconds' }
    return str
  },
  /**
     * Returns an object containing various information about game state
     */
  get gameInfo(): TMGame {
    return Object.assign(GameService.game)
  },

  /**
     * Returns an array of objects containing information about current server players
     */
  get players(): TMPlayer[] {
    return PlayerService.players
  },

  /**
    * Returns an array of objects containing information about top local record players on current map
    */
  get topPlayers(): TopPlayer[] {
    return RecordService.topPlayers
  },

  /**
     * Returns an object containing information about specified player or undefined if player is not on the server
     */
  getPlayer(login: string): TMPlayer | undefined {
    return PlayerService.players.find(a => a.login === login)
  },

  /**
     * Searches the database for player information, returns object containing player info or undefined if player isn't in the database
     */
  async fetchPlayer(login: string): Promise<any | undefined> {
    return (await PlayerService.fetchPlayer(login))
  },

  /**
     * Returns an array of objects containing information about local records on current challenge
     */
  getLocalRecords(challenge: string, amount: number): TMRecord[] {
    // love me some lambda expressions
    return RecordService.records.filter(r => r.challenge === challenge)
      .sort((a, b) => a.score - b.score).slice(0, amount)
  },

  /**
     * Returns an object containing information about specified player's record on current map
     * or undefined if the player doesn't have a record
     */
  getPlayerRecord(login: string): TMRecord | undefined {
    return RecordService.records.find(a => a.login === login)
  },

  get dediRecords(): TMDedi[] {
    return [...DedimaniaService.dedis]
  },

  getPlayerDedi(login: string): TMDedi | undefined {
    return DedimaniaService.dedis.find(a => a.login === login)
  },

  /**
     * Returns an object containing various information about current challenge
     */
  get challenge(): TMChallenge {
    return Object.assign(ChallengeService.current)
  },

  /**
     * Returns an array of objects containing information about recent messages
     */
  get messages(): TMMessage[] {
    return [...ChatService.messages]
  },

  /**
     * Returns an array of objects containing information about recent messages from a specified player
     */
  getPlayerMessages(login: string): TMMessage[] {
    return ChatService.messages.filter(a => a.login === login)
  },

  /**
     * Calls a dedicated server method. Throws error if the server responds with error.
     */
  async call(method: string, params: any[] = []): Promise<any[] | Error> {
    return await Client.call(method, params)
  },

  callNoRes(method: string, params: any[] = []): void {
    Client.callNoRes(method, params)
  },

  async multiCall(...calls: TMCall[]): Promise<CallResponse[] | Error> {
    const arr: any[] = []
    for (const c of calls) {
      const params = c.params == null ? [] : c.params
      arr.push({
        struct: {
          methodName: { string: c.method },
          params: { array: params }
        }
      })
    }
    const res = await Client.call('system.multicall', [{ array: arr }])
    if (res instanceof Error) {
      return res
    }
    const ret: CallResponse[] = []
    for (const [i, r] of res.entries()) { ret.push({ method: calls[i].method, params: r }) }
    return ret
  },

  multiCallNoRes(...calls: TMCall[]): void {
    const arr: any[] = []
    for (const c of calls) {
      const params = c.params == null ? [] : c.params
      arr.push({
        struct: {
          methodName: { string: c.method },
          params: { array: params }
        }
      })
    }
    Client.callNoRes('system.multicall', [{ array: arr }])
  },

  /**
     * Sends a server message. If login is specified the message is sent only to login, otherwise it's sent to everyone
     */
  sendMessage(message: string, login?: string): void {
    if (login != null) {
      Client.callNoRes('ChatSendServerMessageToLogin', [{ string: message }, { string: login }])
      return
    }
    Client.callNoRes('ChatSendServerMessage', [{ string: message }])
  },

  sendManialink(manialink: string, login?: string, deleteOnClick: boolean = false, expireTime: number = 0) {
    if (login !== undefined) {
      Client.callNoRes('SendDisplayManialinkPageToLogin', [
        { string: login }, { string: manialink }, { int: expireTime }, { boolean: deleteOnClick }])
      return
    }
    Client.callNoRes('SendDisplayManialinkPage', [{ string: manialink }, { int: expireTime }, { boolean: deleteOnClick }])
  },

  /**
     * Returns an object containing various colors as keys, and their 3-digit hexes as values. Useful for text colouring in plugins
     */
  get colours() {
    return colours
  },

  /**
     * Adds a chat command
     */
  addCommand(command: TMCommand) {
    ChatService.addCommand(command)
  },

  /**
   * copypaste of escape html
   * @param str string to safer d
   * @returns string but safe
   */
  safeString(str: string): string {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return str.replace(/[&<>"']/g, (m) => { return map[m as keyof typeof map] })
  },

  /**
     * Adds callback function to execute on given event
     */
  addListener(event: string, callback: Function) {
    Events.addListener(event, callback)
  },

  async addChallenge(fileName: string): Promise<TMChallenge | Error> {
    return await ChallengeService.add(fileName)
  },

  get Utils() {
    return Utils
  },

  randomUUID(): string {
    return randomUUID()
  },

  async queryDB(query: string): Promise<any[] | Error> {
    let res
    try {
      res = await DB.query(query)
    } catch (err: any) {
      return new Error(err)
    } finally {
      if (res === undefined) {
        return new Error('Database response undefined')
      }
      return res.rows
    }
  },

  async fetchTrackFileByUid(trackId: string): Promise<TMXFileData> {
    return await TMXService.fetchTrackFileByUid(trackId)
  },

  get challenges() {
    return ChallengeService.challenges
  },

  error(...lines: string[]): void {
    ErrorHandler.error(...lines)
  },

  fatalError(...lines: string[]): void {
    ErrorHandler.fatal(...lines)
  },

  get challengeQueue() {
    return JukeboxService.queue
  },

  get previousChallenges() {
    return JukeboxService.previous
  },

  setPrivilege(login: string, privilege: number) {
    PlayerService.setPrivilege(login, privilege)
  }
}
