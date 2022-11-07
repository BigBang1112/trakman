import { DedimaniaClient } from './DedimaniaClient.js'
import config from './Config.js'
import { DediRecord, NewDediRecord } from './DedimaniaTypes.js'

let currentDedis: DediRecord[] = []
let newDedis: DediRecord[] = []
let isFailedAuthentication: boolean = false
const client: DedimaniaClient = new DedimaniaClient()

const recordListeners: ((record: NewDediRecord) => void)[] = []
const fetchListeners: ((dedis: DediRecord[]) => void)[] = []
const nicknameUpdateListeners: ((dedis: DediRecord[]) => void)[] = []

const emitRecordEvent = (record: NewDediRecord): void => {
  for (const e of recordListeners) { e(record) }
}

const emitFetchEvent = (dedis: DediRecord[]): void => {
  for (const e of fetchListeners) { e(dedis) }
}

const emitNicknameUpdateEvent = (updatedRecords: DediRecord[]): void => {
  for (const e of nicknameUpdateListeners) { e(updatedRecords) }
}

const initialize = async (): Promise<void> => {
  const status = await client.connect(config.host, config.port)
  if (status !== true) {
    if (status.isAuthenticationError === true) {
      tm.log.error('Failed to connect to dedimania', status.error.message)
      isFailedAuthentication = true
    } else {
      tm.log.error(`${status.error.message}.`, `Attempting to reconnect every ${config.reconnectTimeout} seconds...`)
      void reinitialize()
    }
    return
  }
  updateServerPlayers()
  const current: Readonly<tm.CurrentMap> = tm.maps.current
  await getRecords(current.id, current.name, current.environment, current.author)
  tm.log.trace('Connected to Dedimania')
}

const reinitialize = async (): Promise<void> => {
  let status: true | {
    error: Error;
    isAuthenticationError: boolean;
  }
  do {
    await new Promise((resolve) => setTimeout(resolve, 60000))
    status = await client.connect(config.host, config.port)
    if (status !== true && status.isAuthenticationError === true) {
      tm.log.error('Failed to connect to dedimania', status.error.message)
      return
    }
  } while (status !== true)
  tm.log.info('Initialized dedimania after an error')
  updateServerPlayers()
  const current: Readonly<tm.CurrentMap> = tm.maps.current
  await getRecords(current.id, current.name, current.environment, current.author)
}

const getRecords = async (id: string, name: string, environment: string, author: string): Promise<void> => {
  if (isFailedAuthentication === true) { return }
  currentDedis.length = 0
  newDedis.length = 0
  if (client.connected === false) {
    let status: true | {
      error: Error;
      isAuthenticationError: boolean;
    }
    do {
      await new Promise((resolve) => setTimeout(resolve, config.reconnectTimeout * 1000))
      status = await client.connect('dedimania.net', config.port)
      if (status !== true && status.isAuthenticationError === true) {
        tm.log.error('Failed to connect to dedimania', status.error.message)
        return
      }
      if (id !== tm.maps.current.id) { return }
    } while (status !== true)
  }
  const cfg: tm.ServerInfo = tm.config.server
  const nextIds: string[] = tm.jukebox.queue.slice(0, 5).map(a => a.id)
  const players = tm.players.list
  const rawDedis: any[] | Error = await client.call('dedimania.CurrentChallenge',
    [
      { string: id },
      { string: name },
      { string: environment },
      { string: author },
      { string: 'TMF' }, // Maybe do cfg.game.toUpperCase().substring(3) :fun:
      { int: tm.config.game.gameMode },
      {
        struct: {
          SrvName: { string: cfg.name },
          Comment: { string: cfg.comment },
          Private: { boolean: cfg.password === '' },
          SrvIP: { string: '127.0.0.1' }, // Can actually get the real server IP via cfg.ipAddress
          SrvPort: { string: '5000' },
          XmlRpcPort: { string: '5000' },
          NumPlayers: { int: players.filter(a => !a.isSpectator).length },
          MaxPlayers: { int: cfg.currentMaxPlayers },
          NumSpecs: { int: players.filter(a => a.isSpectator).length },
          MaxSpecs: { int: cfg.currentMaxPlayers },
          LadderMode: { int: cfg.currentLadderMode },
          NextFiveUID: { string: nextIds.join('/') }
        }
      },
      { int: config.dediCount },
      { array: getPlayersArray() }
    ])
  if (rawDedis instanceof Error) {
    tm.log.error(`Failed to fetch dedimania records for map ${tm.utils.strip(name)} (${id}), received error:`, rawDedis.message)
    return
  }
  else if (rawDedis?.[0]?.Records === undefined) {
    tm.log.error(`Failed to fetch dedimania records for map ${tm.utils.strip(name)} (${id}), received empty response`)
    return
  }
  currentDedis = rawDedis[0].Records.map((a: any): DediRecord =>
  ({
    login: a.Login, nickname: a.NickName, time: a.Best,
    checkpoints: a.Checks.slice(0, a.Checks.length - 1)
  }))
  if (config.syncName === true) {
    void tm.updatePlayerInfo(...currentDedis)
  }
  emitFetchEvent(currentDedis)
}

const sendRecords = async (mapId: string, name: string, environment: string, author: string, checkpointsAmount: number): Promise<void> => {
  if (client.connected === false) { return }
  if (newDedis.length === 0) { return }
  const recordsArray: any = []
  for (const d of newDedis) {
    recordsArray.push(
      {
        struct: {
          Login: { string: d.login },
          Best: { int: d.time },
          Checks: { string: [...d.checkpoints, d.time].join(',') }
        }
      }
    )
  }
  const status: any[] | Error = await client.call('dedimania.ChallengeRaceTimes',
    [
      { string: mapId },
      { string: name },
      { string: environment },
      { string: author },
      { string: 'TMF' },
      { int: tm.config.game.gameMode },
      { int: checkpointsAmount },
      { int: config.dediCount },
      { array: recordsArray }
    ]
  )
  if (status instanceof Error) { tm.log.error(`Failed to send dedimania records for map ${tm.utils.strip(name)} (${mapId})`, status.message) }
}

const addRecord = (player: Omit<tm.Player, 'currentCheckpoints' | 'isSpectator'>,
  time: number, checkpoints: number[]): void => {
  if (client.connected === false) { return }
  const pb: number | undefined = currentDedis.find(a => a.login === player.login)?.time
  const position: number = currentDedis.filter(a => a.time <= time).length + 1
  if (position > config.dediCount || time > (pb ?? Infinity)) { return }
  if (pb === undefined) {
    const dediRecordInfo: NewDediRecord = constructRecordObject(player, checkpoints, time, undefined, position, undefined)
    currentDedis.splice(position - 1, 0, { login: player.login, time: time, nickname: player.nickname, checkpoints: [...checkpoints] })
    newDedis.push({ login: player.login, time: time, nickname: player.nickname, checkpoints: [...checkpoints] })
    tm.log.info(getLogString(undefined, position, undefined, time, player))
    emitRecordEvent(dediRecordInfo)
  } else if (time === pb) {
    const previousPosition: number = currentDedis.findIndex(a => a.login === currentDedis.find(a => a.login === player.login)?.login) + 1
    const dediRecordInfo: NewDediRecord = constructRecordObject(player, checkpoints, time, time, previousPosition, previousPosition)
    tm.log.info(getLogString(previousPosition, previousPosition, time, time, player))
    emitRecordEvent(dediRecordInfo)
  } else if (time < pb) {
    const previousIndex: number = currentDedis.findIndex(a => a.login === currentDedis.find(a => a.login === player.login)?.login)
    const previousTime: number = currentDedis[previousIndex].time
    if (previousTime === undefined) { // not sure if this is needed
      tm.log.error(`Can't find player ${player.login} in memory`)
      return
    }
    const dediRecordInfo: NewDediRecord = constructRecordObject(player, checkpoints, time, previousTime, position, currentDedis.findIndex(a => a.login === player.login) + 1)
    currentDedis = currentDedis.filter(a => a.login !== player.login)
    currentDedis.splice(position - 1, 0, { login: player.login, time: time, nickname: player.nickname, checkpoints: [...checkpoints] })
    newDedis = newDedis.filter(a => a.login !== player.login)
    newDedis.push({ login: player.login, time: time, nickname: player.nickname, checkpoints: [...checkpoints] })
    tm.log.info(getLogString(previousIndex + 1, position, previousTime, time, player))
    emitRecordEvent(dediRecordInfo)
  }
}

const updateServerPlayers = (): void => {
  setInterval(async (): Promise<void> => {
    if (client.connected === false) { return }
    const cfg: tm.ServerInfo = tm.config.server
    const nextIds: string[] = tm.jukebox.queue.slice(0, 5).map(a => a.id)
    const players = tm.players.list
    const status: any[] | Error = await client.call('dedimania.UpdateServerPlayers',
      [
        { string: 'TMF' },
        { int: tm.config.game.gameMode },
        {
          struct: {
            SrvName: { string: cfg.name },
            Comment: { string: cfg.comment },
            Private: { boolean: cfg.password === '' },
            SrvIP: { string: '127.0.0.1' },
            SrvPort: { string: '5000' },
            XmlRpcPort: { string: '5000' },
            NumPlayers: { int: players.filter(a => !a.isSpectator).length },
            MaxPlayers: { int: cfg.currentMaxPlayers },
            NumSpecs: { int: players.filter(a => a.isSpectator).length },
            MaxSpecs: { int: cfg.currentMaxPlayers },
            LadderMode: { int: cfg.currentLadderMode },
            NextFiveUID: { string: nextIds.join('/') }
          }
        },
        { array: getPlayersArray() }
      ]
    )
    if (status instanceof Error) { tm.log.error('Failed to update dedimania status', status.message) }
  }, 240000)
}

/**
 * Updates the player information and server player list on the dedimania website
 * @param player Player object
 */
const playerJoin = async (player:
  { login: string, nickname: string, region: string, isSpectator: boolean, ladderRank: number }): Promise<void> => {
  if (client.connected === false) { return }
  const status: any[] | Error = await client.call('dedimania.PlayerArrive',
    [
      { string: 'TMF' },
      { string: player.login },
      { string: player.nickname },
      { string: tm.utils.countryToCode(player.region.split('|')[0]) },
      { string: '' }, // TEAMNAME
      { int: player.ladderRank },
      { boolean: player.isSpectator },
      { boolean: false } // OFFICIAL MODE ALWAYS FALSE
    ]
  )
  if (status instanceof Error) { tm.log.error(`Failed to update dedimania player information for ${tm.utils.strip(player.nickname)} (${player.login})`, status.message) }
}

/**
 * Updates the server player list on the dedimania website
 * @param player Player object
 */
const playerLeave = async (player: { login: string, nickname: string }): Promise<void> => {
  if (client.connected === false) { return }
  const status: any[] | Error = await client.call('dedimania.PlayerLeave',
    [
      { string: 'TMF' },
      { string: player.login }
    ])
  if (status instanceof Error) { tm.log.error(`Failed to update player information for ${tm.utils.strip(player.nickname)} (${player.login})`, status.message) }
}

const getPlayersArray = (): any[] => {
  const players: tm.Player[] = tm.players.list
  let arr: any[] = []
  for (const player of players) {
    arr.push(
      [
        {
          struct: {
            Login: { string: player.login },
            Nation: { string: player.countryCode },
            TeamName: { string: '' },
            TeamId: { int: -1 },
            IsSpec: { boolean: player.isSpectator },
            Ranking: { int: player.ladderRank },
            IsOff: { boolean: false } // OFFICIAL MODE ALWAYS FALSE
          }
        }
      ]
    )
  }
  return arr
}

const constructRecordObject = (player: Omit<tm.Player, 'currentCheckpoints' | 'isSpectator'>,
  checkpoints: number[], time: number, previousTime: number | undefined, position: number, previousPosition: number | undefined): NewDediRecord => {
  return {
    ...player,
    time,
    checkpoints,
    position,
    previous: (previousTime && previousPosition) ? { time: previousTime, position: previousPosition } : undefined
  }
}

const getLogString = (previousPosition: number | undefined, position: number,
  previousTime: number | undefined, time: number, player: { login: string, nickname: string }): string[] => {
  const rs = tm.utils.getRankingString({ position, time }, (previousPosition && previousTime) ?
    { time: previousTime, position: previousPosition } : undefined)
  return [`${tm.utils.strip(player.nickname)} (${player.login}) has ${rs.status} the ${tm.utils.getPositionString(position)} dedimania record. Time: ${tm.utils.getTimeString(time)}${rs.difference !== undefined ? ` (-${rs.difference})` : ``}`]
}

if (config.isEnabled === true) {

  tm.addListener('Startup', (): void => {
    tm.log.trace('Connecting to Dedimania...')
    void initialize()
  }, true)

  tm.addListener('BeginMap', (info): void => {
    void getRecords(info.id, info.name, info.environment, info.author)
  }, true)

  tm.addListener('EndMap', (info): void => {
    void sendRecords(info.id, info.name, info.environment, info.author, info.checkpointsAmount)
  })

  tm.addListener('PlayerJoin', (info): void => {
    void playerJoin(info)
  })

  tm.addListener('PlayerLeave', (info): void => {
    void playerLeave(info)
  })

  tm.addListener('PlayerFinish', (info): void => {
    void addRecord(info, info.time, info.checkpoints)
  }, true)

  tm.addListener('PlayerDataUpdated', (info): void => {
    const changedObjects: DediRecord[] = []
    for (const e of currentDedis) {
      const newNickname: string | undefined = info.find(a => a.login === e.login)?.nickname
      if (newNickname !== undefined) {
        if (e.nickname !== newNickname) {
          tm.log.trace(`Updated nickname for ${tm.utils.strip(newNickname)} (${e.login}) from Dedimania.`)
          e.nickname = newNickname
          changedObjects.push(e)
        }
      }
    }
    if (changedObjects.length !== 0) {
      emitNicknameUpdateEvent(changedObjects)
    }
  })

}

/**
 * Gets the players dedimania record
 * @param login Player login
 * @returns Dedimania record object or undefined if the player doesn't have a dedimania record
 */
function getRecord(login: string): DediRecord | undefined
/**
 * Gets multiple dedimania records
 * Returned array is sorted by position
 * @param logins Array of player logins
 * @returns Array of dedimania record objects
 */
function getRecord(logins: string[]): DediRecord[]
function getRecord(logins: string | string[]): DediRecord | DediRecord[] | undefined {
  if (typeof logins === 'string') {
    return currentDedis.find(a => a.login === logins)
  }
  return currentDedis.filter(a => logins.includes(a.login))
}

/**
 * Gets the players new dedimania record
 * @param login Player login
 * @returns Dedimania record object or undefined if the player didn't get a new dedimania record
 */
function getNewRecord(login: string): DediRecord | undefined
/**
 * Gets multiple new dedimania records
 * Returned array is sorted by position
 * @param logins Array of player logins
 * @returns Array of dedimania record objects
 */
function getNewRecord(logins: string[]): DediRecord[]
function getNewRecord(logins: string | string[]): DediRecord | DediRecord[] | undefined {
  if (typeof logins === 'string') {
    return newDedis.find(a => a.login === logins)
  }
  return newDedis.filter(a => logins.includes(a.login))
}

/**
 * Fetches and sends dedimania records.
 * Provides utilities for accessing dedimania records related data.
 * @author lythx & wiseraven
 * @since 0.1
 */
export const dedimania = {

  /**
   * Add a callback function to execute on a dedimania record
   * @param callback Function to execute on event. It takes new record object as a parameter
   */
  onRecord(callback: ((record: Readonly<NewDediRecord>) => void)): void {
    recordListeners.push(callback)
  },

  /**
   * Add a callback function to execute when dedimania records get fetched
   * @param callback Function to execute on event. It takes record objects array as a parameter
   */
  onFetch(callback: ((dedis: Readonly<Readonly<DediRecord>[]>) => void)): void {
    fetchListeners.push(callback)
  },

  /**
   * Add a callback function to execute when player nickname in dedimania records gets updated
   * @param callback Function to execute on event. It takes changed record objects array as a parameter
   */
  onNicknameUpdate(callback: ((dedis: Readonly<Readonly<DediRecord>[]>) => void)): void {
    nicknameUpdateListeners.push(callback)
  },

  getRecord,

  getNewRecord,

  /**
   * Current map dedimania records sorted by position
   */
  get records(): Readonly<DediRecord>[] {
    return [...currentDedis]
  },

  /**
   * New dedimania records sorted by position
   */
  get newRecords(): Readonly<DediRecord>[] {
    return [...newDedis]
  },

  /**
   * Number of dedimania records
   */
  get recordCount(): number {
    return currentDedis.length
  },

  /**
   * Number of new dedimania records
   */
  get newRecordCount(): number {
    return newDedis.length
  },

  /**
   * Plugin status
   */
  isEnabled: config.isEnabled,

  /**
   * True if controller is connected to dedimania server
   */
  get isConnected(): boolean {
    return client.connected
  },

  /**
   * Maximum amount of dedimania records
   */
  recordCountLimit: config.dediCount

}

export { NewDediRecord, DediRecord }
