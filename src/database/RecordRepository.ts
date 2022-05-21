'use strict'
import { Repository } from './Repository.js'

const createQuery = `
  CREATE TABLE IF NOT EXISTS records(
      challenge varchar(27) not null,
      login varchar(25) not null,
      score int4 not null,
      date timestamp not null,
      checkpoints int4[],
      PRIMARY KEY(login, challenge)
  );
`

const insertQuery = `
        INSERT INTO records(challenge, login, score, date, checkpoints)
        VALUES ($1, $2, $3, $4, $5);
      `

export class RecordRepository extends Repository {
  async initialize (): Promise<void> {
    await super.initialize()
    await this.db.query(createQuery)
  }

  async add (record: RecordInfo): Promise<void> {
    await this.db.query(insertQuery, [record.challenge, record.login, record.score, record.date, record.checkpoints])
  }

  async get (challengeId: string): Promise<any[]> {
    const res = await this.db.query('SELECT * FROM records WHERE challenge=$1', [challengeId])
    return res.rows
  }

  async update(record: RecordInfo): Promise<void> {
    await this.db.query('UPDATE records SET score=$1, date=$2, checkpoints=$3 WHERE challenge=$4 AND login=$5', 
    [record.score, record.date, record.checkpoints, record.challenge, record.login])
  }

  async getByLogin (challengeId: string, login: string): Promise<any[]> {
    const res = await this.db.query('SELECT * FROM records WHERE challenge=$1 AND login=$2', [challengeId, login])
    return res.rows
  }
}
