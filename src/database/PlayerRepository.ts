import { Repository } from './Repository.js'
import { PlayerIdsRepository } from './PlayerIdsRepository.js'
import { Utils } from '../Utils.js'

const createQuery: string = `
  CREATE TABLE IF NOT EXISTS players(
    id INT4 NOT NULL,
    nickname VARCHAR(45) NOT NULL,
    region VARCHAR(100) NOT NULL,
    wins INT4 NOT NULL,
    time_played INT4 NOT NULL,
    visits INT4 NOT NULL,
    is_united BOOLEAN NOT NULL,
    last_online TIMESTAMP,
    rank INT4,
    average REAL,
    PRIMARY KEY(id),
    CONSTRAINT fk_player_id
      FOREIGN KEY(id) 
	      REFERENCES player_ids(id)
  );`

interface TableEntry {
  readonly login: string
  readonly nickname: string
  readonly region: string
  readonly wins: number
  readonly time_played: number
  readonly visits: number
  readonly is_united: boolean
  readonly privilege?: number
  readonly last_online: Date | null
  readonly rank: number | null
  readonly average: number
}

const playerIdsRepo: PlayerIdsRepository = new PlayerIdsRepository()

export class PlayerRepository extends Repository {

  async initialize(): Promise<void> {
    await playerIdsRepo.initialize()
    await super.initialize(createQuery)
  }

  async get(login: string): Promise<TMOfflinePlayer | undefined>
  async get(logins: string[]): Promise<TMOfflinePlayer[]>
  async get(logins: string | string[]): Promise<TMOfflinePlayer | TMOfflinePlayer[] | undefined> {
    if (typeof logins === 'string') {
      const id: number | undefined = await playerIdsRepo.get(logins)
      if (id === undefined) { return }
      const query: string = `SELECT player_ids.login, nickname, region, wins, time_played, visits, is_united, last_online, rank, average, privilege FROM players 
      JOIN player_ids ON players.id=player_ids.id
      LEFT JOIN privileges ON player_ids.login=privileges.login
      WHERE players.id=$1`
      const res = await this.query(query, id)
      return res[0] === undefined ? undefined : this.constructPlayerObject(res[0])
    }
    const ids = await playerIdsRepo.get(logins)
    if (ids.length === 0) { return [] }
    const query: string = `SELECT player_ids.login, nickname, region, wins, time_played, visits, is_united, last_online, rank, average, privilege FROM players 
    JOIN player_ids ON players.id=player_ids.id
    LEFT JOIN privileges ON player_ids.login=privileges.login
    WHERE ${logins.map((a, i) => `players.id=$${i + 1} OR `).join('').slice(0, -3)}`
    const res = await this.query(query, ...(ids.map(a => a.id)))
    return res.map(a => this.constructPlayerObject(a))
  }

  async add(...players: TMOfflinePlayer[]): Promise<void> {
    if (players.length === 0) { return }
    const query: string = `INSERT INTO players(id, nickname, region, wins, time_played, visits, is_united, last_online) 
    ${this.getInsertValuesString(8, players.length)};`
    const ids = await playerIdsRepo.addAndGet(players.map(a => a.login))
    const values: any[] = []
    for (const [i, player] of players.entries()) {
      values.push(ids[i].id, player.nickname, player.region, player.wins, player.timePlayed, player.visits, player.isUnited, player.lastOnline)
    }
    await this.query(query, ...values)
  }

  async updateRank(login: string, rank: number, average: number): Promise<void> {
    const query: string = `UPDATE players SET rank=$1, average=$2 WHERE id=$3;`
    const id: number | undefined = await playerIdsRepo.get(login)
    await this.query(query, rank, average, id)
  }

  async updateOnWin(login: string, wins: number): Promise<void> {
    const query: string = `UPDATE players SET wins=$1 WHERE id=$2;`
    const id: number | undefined = await playerIdsRepo.get(login)
    await this.query(query, wins, id)
  }

  async updateOnJoin(login: string, nickname: string, region: string, visits: number, isUnited: boolean, lastOnline?: Date): Promise<void> {
    const query: string = `UPDATE players SET nickname=$1, region=$2, visits=$3, is_united=$4, last_online=$5 WHERE id=$6;`
    const id: number | undefined = await playerIdsRepo.get(login)
    await this.query(query, nickname, region, visits, isUnited, lastOnline, id)
  }

  async updateOnLeave(login: string, timePlayed: number, date: Date): Promise<void> {
    const query: string = `UPDATE players SET time_played=$1, last_online=$2 WHERE id=$3;`
    const id: number | undefined = await playerIdsRepo.get(login)
    await this.query(query, timePlayed, date, id)
  }

  async getRank(login: string): Promise<number | undefined>
  async getRank(logins: string[]): Promise<{ login: string, rank: number | undefined, average: number | undefined }[]>
  async getRank(logins: string | string[]): Promise<number | { login: string, rank: number | undefined, average: number | undefined }[] | undefined> {
    if (typeof logins === 'string') {
      const id: number | undefined = await playerIdsRepo.get(logins)
      if (id === undefined) { return }
      const query: string = `SELECT rank, average FROM players 
      JOIN player_ids ON players.id=player_ids.id
      WHERE players.id=$1`
      const res = await this.query(query, id)
      return res[0] === undefined ? undefined : res[0].rank
    }
    const ids = await playerIdsRepo.get(logins)
    if (ids.length === 0) { return [] }
    const query: string = `SELECT player_ids.login, rank, average FROM players 
    JOIN player_ids ON players.id=player_ids.id
    WHERE ${logins.map((a, i) => `players.id=$${i + 1} OR `).join('').slice(0, -3)}`
    const res = await this.query(query, ...(ids.map(a => a.id)))
    return res
  }

  private constructPlayerObject(entry: TableEntry): TMOfflinePlayer {
    const nation: string = entry.region.split('|')[0]
    return {
      login: entry.login,
      nickname: entry.nickname,
      nation: nation,
      nationCode: Utils.nationToNationCode(nation) as any,
      region: entry.region,
      timePlayed: entry.time_played,
      lastOnline: entry.last_online ?? undefined,
      visits: entry.visits,
      isUnited: entry.is_united,
      wins: entry.wins,
      privilege: entry.privilege ?? 0,
      rank: entry.rank ?? undefined,
      average: entry.average
    }
  }

}
