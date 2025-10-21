import BetterSqlite3 from 'better-sqlite3'

export class Database {
  private db: BetterSqlite3.Database

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initTables()
    this.runMigrations()
  }

  private initTables() {
    // User table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL DEFAULT 'User',
        streamer_mode INTEGER NOT NULL DEFAULT 0,
        theme_preference TEXT NOT NULL DEFAULT 'light',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Initialize default user if not exists
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM user').get() as {
      count: number
    }
    if (userCount.count === 0) {
      this.db
        .prepare(
          `INSERT INTO user (username, streamer_mode, theme_preference) VALUES (?, ?, ?)`
        )
        .run('User', 0, 'light')
    }

    // Deck table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS deck (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_opponent_deck INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Duel table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS duel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_deck_id INTEGER NOT NULL,
        opponent_deck_id INTEGER NOT NULL,
        result TEXT NOT NULL CHECK(result IN ('win', 'loss')),
        game_mode TEXT NOT NULL CHECK(game_mode IN ('RANK', 'RATE', 'EVENT', 'DC')),
        rank_value INTEGER,
        rate_value INTEGER,
        dc_value INTEGER,
        coin_result TEXT CHECK(coin_result IN ('win', 'loss')),
        turn_order TEXT CHECK(turn_order IN ('first', 'second')),
        played_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_deck_id) REFERENCES deck(id),
        FOREIGN KEY (opponent_deck_id) REFERENCES deck(id)
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_duel_played_at ON duel(played_at);
      CREATE INDEX IF NOT EXISTS idx_duel_game_mode ON duel(game_mode);
      CREATE INDEX IF NOT EXISTS idx_duel_player_deck_id ON duel(player_deck_id);
      CREATE INDEX IF NOT EXISTS idx_duel_opponent_deck_id ON duel(opponent_deck_id);
    `)
  }

  private runMigrations() {
    // Add is_archived column to deck table if it doesn't exist
    const columns = this.db
      .prepare("PRAGMA table_info(deck)")
      .all() as Array<{ name: string }>

    const hasArchivedColumn = columns.some(col => col.name === 'is_archived')

    if (!hasArchivedColumn) {
      this.db.exec(`
        ALTER TABLE deck ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0
      `)
    }
  }

  // User operations
  getUser() {
    return this.db.prepare('SELECT * FROM user WHERE id = 1').get()
  }

  updateUser(userData: {
    username?: string
    streamer_mode?: boolean
    theme_preference?: string
  }) {
    const updates: string[] = []
    const values: any[] = []

    if (userData.username !== undefined) {
      updates.push('username = ?')
      values.push(userData.username)
    }
    if (userData.streamer_mode !== undefined) {
      updates.push('streamer_mode = ?')
      values.push(userData.streamer_mode ? 1 : 0)
    }
    if (userData.theme_preference !== undefined) {
      updates.push('theme_preference = ?')
      values.push(userData.theme_preference)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(1) // id

    const sql = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)

    return this.getUser()
  }

  // Deck operations
  getAllDecks() {
    return this.db
      .prepare('SELECT * FROM deck WHERE is_archived = 0 ORDER BY created_at DESC')
      .all()
  }

  createDeck(deckData: { name: string; is_opponent_deck: boolean }) {
    // Check for duplicate deck name among non-archived decks
    const existingDeck = this.db
      .prepare(
        'SELECT * FROM deck WHERE name = ? AND is_opponent_deck = ? AND is_archived = 0'
      )
      .get(deckData.name, deckData.is_opponent_deck ? 1 : 0)

    if (existingDeck) {
      throw new Error('同じ名前のデッキが既に存在します')
    }

    const result = this.db
      .prepare('INSERT INTO deck (name, is_opponent_deck) VALUES (?, ?)')
      .run(deckData.name, deckData.is_opponent_deck ? 1 : 0)

    return this.db.prepare('SELECT * FROM deck WHERE id = ?').get(result.lastInsertRowid)
  }

  updateDeck(id: number, deckData: { name?: string; is_opponent_deck?: boolean }) {
    // Get current deck info
    const currentDeck = this.db.prepare('SELECT * FROM deck WHERE id = ?').get(id) as any

    if (!currentDeck) {
      throw new Error('デッキが見つかりません')
    }

    // Check for duplicate deck name if name is being updated
    if (deckData.name !== undefined && deckData.name !== currentDeck.name) {
      const isOpponentDeck =
        deckData.is_opponent_deck !== undefined
          ? deckData.is_opponent_deck
          : currentDeck.is_opponent_deck

      const existingDeck = this.db
        .prepare(
          'SELECT * FROM deck WHERE name = ? AND is_opponent_deck = ? AND is_archived = 0 AND id != ?'
        )
        .get(deckData.name, isOpponentDeck ? 1 : 0, id)

      if (existingDeck) {
        throw new Error('同じ名前のデッキが既に存在します')
      }
    }

    const updates: string[] = []
    const values: any[] = []

    if (deckData.name !== undefined) {
      updates.push('name = ?')
      values.push(deckData.name)
    }
    if (deckData.is_opponent_deck !== undefined) {
      updates.push('is_opponent_deck = ?')
      values.push(deckData.is_opponent_deck ? 1 : 0)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const sql = `UPDATE deck SET ${updates.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)

    return this.db.prepare('SELECT * FROM deck WHERE id = ?').get(id)
  }

  deleteDeck(id: number) {
    // Soft delete: mark deck as archived instead of deleting
    // This preserves foreign key relationships with duel records
    this.db
      .prepare('UPDATE deck SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(id)
    return { success: true }
  }

  archiveAllDecks() {
    // Archive all non-archived decks by setting is_archived = 1
    const result = this.db
      .prepare('UPDATE deck SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE is_archived = 0')
      .run()

    return { success: true, archived_count: result.changes }
  }

  // Duel operations
  getAllDuels(filters?: {
    year?: number
    month?: number
    game_mode?: string
    player_deck_id?: number
    opponent_deck_id?: number
  }) {
    let sql = `
      SELECT
        d.*,
        pd.name as player_deck_name,
        od.name as opponent_deck_name
      FROM duel d
      JOIN deck pd ON d.player_deck_id = pd.id
      JOIN deck od ON d.opponent_deck_id = od.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.year) {
      sql += ` AND strftime('%Y', d.played_at) = ?`
      params.push(filters.year.toString())
    }
    if (filters?.month) {
      sql += ` AND strftime('%m', d.played_at) = ?`
      params.push(filters.month.toString().padStart(2, '0'))
    }
    if (filters?.game_mode) {
      sql += ` AND d.game_mode = ?`
      params.push(filters.game_mode)
    }
    if (filters?.player_deck_id) {
      sql += ` AND d.player_deck_id = ?`
      params.push(filters.player_deck_id)
    }
    if (filters?.opponent_deck_id) {
      sql += ` AND d.opponent_deck_id = ?`
      params.push(filters.opponent_deck_id)
    }

    sql += ` ORDER BY d.played_at DESC`

    return this.db.prepare(sql).all(...params)
  }

  getDuelById(id: number) {
    return this.db
      .prepare(
        `
      SELECT
        d.*,
        pd.name as player_deck_name,
        od.name as opponent_deck_name
      FROM duel d
      JOIN deck pd ON d.player_deck_id = pd.id
      JOIN deck od ON d.opponent_deck_id = od.id
      WHERE d.id = ?
    `
      )
      .get(id)
  }

  createDuel(duelData: any) {
    const result = this.db
      .prepare(
        `
      INSERT INTO duel (
        player_deck_id, opponent_deck_id, result, game_mode,
        rank_value, rate_value, dc_value, coin_result, turn_order,
        played_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        duelData.player_deck_id,
        duelData.opponent_deck_id,
        duelData.result,
        duelData.game_mode,
        duelData.rank_value || null,
        duelData.rate_value || null,
        duelData.dc_value || null,
        duelData.coin_result || null,
        duelData.turn_order || null,
        duelData.played_at,
        duelData.notes || null
      )

    return this.getDuelById(result.lastInsertRowid as number)
  }

  updateDuel(id: number, duelData: any) {
    const updates: string[] = []
    const values: any[] = []

    const fields = [
      'player_deck_id',
      'opponent_deck_id',
      'result',
      'game_mode',
      'rank_value',
      'rate_value',
      'dc_value',
      'coin_result',
      'turn_order',
      'played_at',
      'notes'
    ]

    fields.forEach((field) => {
      if (duelData[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(duelData[field])
      }
    })

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const sql = `UPDATE duel SET ${updates.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)

    return this.getDuelById(id)
  }

  deleteDuel(id: number) {
    this.db.prepare('DELETE FROM duel WHERE id = ?').run(id)
    return { success: true }
  }

  importDuels(duelsData: any[]) {
    const insert = this.db.prepare(`
      INSERT INTO duel (
        player_deck_id, opponent_deck_id, result, game_mode,
        rank_value, rate_value, dc_value, coin_result, turn_order,
        played_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = this.db.transaction((duels: any[]) => {
      for (const duel of duels) {
        insert.run(
          duel.player_deck_id,
          duel.opponent_deck_id,
          duel.result,
          duel.game_mode,
          duel.rank_value || null,
          duel.rate_value || null,
          duel.dc_value || null,
          duel.coin_result || null,
          duel.turn_order || null,
          duel.played_at,
          duel.notes || null
        )
      }
    })

    insertMany(duelsData)
    return { success: true, count: duelsData.length }
  }

  exportDuels() {
    return this.getAllDuels()
  }

  // Statistics operations
  getDashboardStatistics(year: number, month: number, gameMode: string) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.getAllDuels(filters)

    const stats = {
      total_duels: duels.length,
      wins: duels.filter((d: any) => d.result === 'win').length,
      losses: duels.filter((d: any) => d.result === 'loss').length,
      win_rate: 0,
      coin_win_rate: 0,
      first_turn_rate: 0,
      recent_duels: duels.slice(0, 10)
    }

    if (stats.total_duels > 0) {
      stats.win_rate = (stats.wins / stats.total_duels) * 100

      const duelsWithCoin = duels.filter((d: any) => d.coin_result)
      if (duelsWithCoin.length > 0) {
        const coinWins = duelsWithCoin.filter((d: any) => d.coin_result === 'win').length
        stats.coin_win_rate = (coinWins / duelsWithCoin.length) * 100
      }

      const duelsWithTurn = duels.filter((d: any) => d.turn_order)
      if (duelsWithTurn.length > 0) {
        const firstTurns = duelsWithTurn.filter((d: any) => d.turn_order === 'first').length
        stats.first_turn_rate = (firstTurns / duelsWithTurn.length) * 100
      }
    }

    return stats
  }

  getMonthlyStatistics(year: number, month: number, gameMode: string) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.getAllDuels(filters)

    // Deck usage statistics
    const playerDeckUsage = new Map<number, { name: string; count: number }>()
    const opponentDeckUsage = new Map<number, { name: string; count: number }>()

    duels.forEach((duel: any) => {
      // Player deck
      if (!playerDeckUsage.has(duel.player_deck_id)) {
        playerDeckUsage.set(duel.player_deck_id, {
          name: duel.player_deck_name,
          count: 0
        })
      }
      playerDeckUsage.get(duel.player_deck_id)!.count++

      // Opponent deck
      if (!opponentDeckUsage.has(duel.opponent_deck_id)) {
        opponentDeckUsage.set(duel.opponent_deck_id, {
          name: duel.opponent_deck_name,
          count: 0
        })
      }
      opponentDeckUsage.get(duel.opponent_deck_id)!.count++
    })

    return {
      player_deck_distribution: Array.from(playerDeckUsage.values()),
      opponent_deck_distribution: Array.from(opponentDeckUsage.values())
    }
  }

  getTimeSeriesStatistics(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
    gameMode: string
  ) {
    const sql = `
      SELECT
        strftime('%Y', played_at) as year,
        strftime('%m', played_at) as month,
        AVG(CASE WHEN game_mode = 'RANK' THEN rank_value END) as avg_rank,
        AVG(CASE WHEN game_mode = 'RATE' THEN rate_value END) as avg_rate,
        AVG(CASE WHEN game_mode = 'DC' THEN dc_value END) as avg_dc
      FROM duel
      WHERE game_mode = ?
        AND played_at >= ?
        AND played_at <= ?
      GROUP BY year, month
      ORDER BY year, month
    `

    const startDate = `${startYear}-${startMonth.toString().padStart(2, '0')}-01`
    const endDate = `${endYear}-${endMonth.toString().padStart(2, '0')}-31`

    return this.db.prepare(sql).all(gameMode, startDate, endDate)
  }

  getMatchupWinrates(year: number, month: number, gameMode: string) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.getAllDuels(filters)

    // Calculate matchup winrates with turn order stats
    const matchups = new Map<
      string,
      {
        deck_name: string
        opponent_deck_name: string
        wins: number
        losses: number
        total_duels: number
        win_rate: number
        first_turn_wins: number
        first_turn_total: number
        second_turn_wins: number
        second_turn_total: number
        win_rate_first: number
        win_rate_second: number
      }
    >()

    duels.forEach((duel: any) => {
      const key = `${duel.player_deck_id}-${duel.opponent_deck_id}`

      if (!matchups.has(key)) {
        matchups.set(key, {
          deck_name: duel.player_deck_name,
          opponent_deck_name: duel.opponent_deck_name,
          wins: 0,
          losses: 0,
          total_duels: 0,
          win_rate: 0,
          first_turn_wins: 0,
          first_turn_total: 0,
          second_turn_wins: 0,
          second_turn_total: 0,
          win_rate_first: 0,
          win_rate_second: 0
        })
      }

      const matchup = matchups.get(key)!
      matchup.total_duels++

      if (duel.result === 'win') {
        matchup.wins++
      } else {
        matchup.losses++
      }

      // Track turn order stats
      if (duel.turn_order === 'first') {
        matchup.first_turn_total++
        if (duel.result === 'win') {
          matchup.first_turn_wins++
        }
      } else if (duel.turn_order === 'second') {
        matchup.second_turn_total++
        if (duel.result === 'win') {
          matchup.second_turn_wins++
        }
      }
    })

    // Calculate win rates
    matchups.forEach((matchup) => {
      matchup.win_rate = matchup.total_duels > 0 ? (matchup.wins / matchup.total_duels) * 100 : 0
      matchup.win_rate_first =
        matchup.first_turn_total > 0 ? (matchup.first_turn_wins / matchup.first_turn_total) * 100 : 0
      matchup.win_rate_second =
        matchup.second_turn_total > 0
          ? (matchup.second_turn_wins / matchup.second_turn_total) * 100
          : 0
    })

    return Array.from(matchups.values())
  }

  getMonthlyDeckDistribution(year: number, month: number, gameMode: string) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.getAllDuels(filters)

    const deckUsage = new Map<number, { deck_name: string; count: number }>()

    duels.forEach((duel: any) => {
      if (!deckUsage.has(duel.player_deck_id)) {
        deckUsage.set(duel.player_deck_id, {
          deck_name: duel.player_deck_name,
          count: 0
        })
      }
      deckUsage.get(duel.player_deck_id)!.count++
    })

    return Array.from(deckUsage.values())
  }

  getRecentDeckDistribution(gameMode: string, limit: number = 30) {
    const sql = `
      SELECT
        d.id,
        d.player_deck_id,
        d.player_deck_name
      FROM (
        SELECT
          duel.id,
          duel.player_deck_id,
          deck.name as player_deck_name
        FROM duel
        LEFT JOIN deck ON deck.id = duel.player_deck_id
        WHERE duel.game_mode = ?
        ORDER BY duel.played_at DESC
        LIMIT ?
      ) d
    `

    const duels = this.db.prepare(sql).all(gameMode, limit) as any[]

    const deckUsage = new Map<number, { deck_name: string; count: number }>()

    duels.forEach((duel: any) => {
      if (!deckUsage.has(duel.player_deck_id)) {
        deckUsage.set(duel.player_deck_id, {
          deck_name: duel.player_deck_name,
          count: 0
        })
      }
      deckUsage.get(duel.player_deck_id)!.count++
    })

    return Array.from(deckUsage.values())
  }

  getDeckWinRates(year: number, month: number, gameMode: string) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.getAllDuels(filters)

    const deckStats = new Map<
      number,
      {
        deck_name: string
        wins: number
        total_duels: number
        win_rate: number
      }
    >()

    duels.forEach((duel: any) => {
      if (!deckStats.has(duel.player_deck_id)) {
        deckStats.set(duel.player_deck_id, {
          deck_name: duel.player_deck_name,
          wins: 0,
          total_duels: 0,
          win_rate: 0
        })
      }

      const stats = deckStats.get(duel.player_deck_id)!
      stats.total_duels++

      if (duel.result === 'win') {
        stats.wins++
      }
    })

    // Calculate win rates
    deckStats.forEach((stats) => {
      stats.win_rate = stats.total_duels > 0 ? (stats.wins / stats.total_duels) * 100 : 0
    })

    return Array.from(deckStats.values())
  }

  getTimeSeriesStatistics(year: number, month: number, gameMode: string) {
    const sql = `
      SELECT
        ROW_NUMBER() OVER (ORDER BY played_at) as sequence,
        CASE
          WHEN game_mode = 'RANK' THEN rank_value
          WHEN game_mode = 'RATE' THEN rate_value
          WHEN game_mode = 'DC' THEN dc_value
        END as value
      FROM duel
      WHERE game_mode = ?
        AND strftime('%Y', played_at) = ?
        AND strftime('%m', played_at) = ?
        AND (
          (game_mode = 'RANK' AND rank_value IS NOT NULL) OR
          (game_mode = 'RATE' AND rate_value IS NOT NULL) OR
          (game_mode = 'DC' AND dc_value IS NOT NULL)
        )
      ORDER BY played_at
    `

    const yearStr = year.toString()
    const monthStr = month.toString().padStart(2, '0')

    return this.db.prepare(sql).all(gameMode, yearStr, monthStr)
  }

  close() {
    this.db.close()
  }
}
