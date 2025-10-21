import BetterSqlite3 from 'better-sqlite3'

type StatisticsFilterOptions = {
  rangeStart?: number
  rangeEnd?: number
  myDeckId?: number
  opponentDeckId?: number
}

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

  private applyStatisticsFilters(duels: any[], options: StatisticsFilterOptions = {}) {
    const { rangeStart, rangeEnd, myDeckId, opponentDeckId } = options

    let filtered = [...duels]

    if (rangeStart !== undefined || rangeEnd !== undefined) {
      const sorted = filtered.sort(
        (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
      )
      const startIndex = Math.max(0, (rangeStart ?? 1) - 1)
      const rawEnd = rangeEnd !== undefined ? Math.max(rangeEnd, startIndex + 1) : sorted.length
      filtered = sorted.slice(startIndex, rawEnd)
    }

    if (myDeckId !== undefined && myDeckId !== null) {
      filtered = filtered.filter((duel) => duel.player_deck_id === myDeckId)
    }

    if (opponentDeckId !== undefined && opponentDeckId !== null) {
      filtered = filtered.filter((duel) => duel.opponent_deck_id === opponentDeckId)
    }

    return filtered
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

  getMonthlyStatistics(
    year: number,
    month: number,
    gameMode: string,
    options: StatisticsFilterOptions = {}
  ) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

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

  getMatchupWinrates(
    year: number,
    month: number,
    gameMode: string,
    options: StatisticsFilterOptions = {}
  ) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

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

  getMonthlyDeckDistribution(
    year: number,
    month: number,
    gameMode: string,
    options: StatisticsFilterOptions = {}
  ) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

    const deckUsage = new Map<number, { deck_name: string; count: number }>()

    duels.forEach((duel: any) => {
      const deckId = duel.opponent_deck_id
      if (!deckUsage.has(deckId)) {
        deckUsage.set(deckId, {
          deck_name: duel.opponent_deck_name || '不明なデッキ',
          count: 0
        })
      }
      deckUsage.get(deckId)!.count++
    })

    return Array.from(deckUsage.values()).sort((a, b) => b.count - a.count)
  }

  getRecentDeckDistribution(
    gameMode: string,
    limit: number = 30,
    options: StatisticsFilterOptions = {}
  ) {
    const baseFilters = gameMode ? { game_mode: gameMode } : {}
    const duels = this.getAllDuels(baseFilters)
    const filtered = this.applyStatisticsFilters(duels, options)
    const hasRangeFilter = options.rangeStart !== undefined || options.rangeEnd !== undefined
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    const targetDuels = hasRangeFilter ? sorted : sorted.slice(0, limit)

    const deckUsage = new Map<number, { deck_name: string; count: number }>()

    targetDuels.forEach((duel: any) => {
      const deckId = duel.opponent_deck_id
      if (!deckUsage.has(deckId)) {
        deckUsage.set(deckId, {
          deck_name: duel.opponent_deck_name || '不明なデッキ',
          count: 0
        })
      }
      deckUsage.get(deckId)!.count++
    })

    return Array.from(deckUsage.values()).sort((a, b) => b.count - a.count)
  }

  getDeckWinRates(
    year: number,
    month: number,
    gameMode: string,
    options: StatisticsFilterOptions = {}
  ) {
    const filters = { year, month, game_mode: gameMode }
    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

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

  getMonthlyTimeSeriesStatistics(
    year: number,
    month: number,
    gameMode: string,
    options: StatisticsFilterOptions = {}
  ) {
    if (!['RANK', 'RATE', 'DC'].includes(gameMode)) {
      return []
    }

    const filters = { year, month, game_mode: gameMode }
    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

    const valueKey =
      gameMode === 'RANK' ? 'rank_value' : gameMode === 'RATE' ? 'rate_value' : 'dc_value'

    const sorted = duels
      .filter((duel: any) => duel[valueKey] !== null && duel[valueKey] !== undefined)
      .sort((a: any, b: any) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

    return sorted.map((duel: any, index: number) => ({
      sequence: index + 1,
      value: duel[valueKey]
    }))
  }

  getAvailableDecks(
    year: number,
    month: number,
    gameMode?: string,
    options: StatisticsFilterOptions = {}
  ) {
    const filters: any = { year, month }
    if (gameMode) {
      filters.game_mode = gameMode
    }

    const duels = this.applyStatisticsFilters(this.getAllDuels(filters), options)

    const myDecks = new Map<number, string>()
    const opponentDecks = new Map<number, string>()

    duels.forEach((duel: any) => {
      if (duel.player_deck_id && duel.player_deck_name) {
        myDecks.set(duel.player_deck_id, duel.player_deck_name)
      }
      if (duel.opponent_deck_id && duel.opponent_deck_name) {
        opponentDecks.set(duel.opponent_deck_id, duel.opponent_deck_name)
      }
    })

    const sortDecks = (deckMap: Map<number, string>) =>
      Array.from(deckMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

    return {
      my_decks: sortDecks(myDecks),
      opponent_decks: sortDecks(opponentDecks)
    }
  }

  // CSV Export
  exportDuelsToCSV(
    year?: number,
    month?: number,
    gameMode?: string,
    columns?: string[]
  ) {
    let duels = this.getAllDuels()

    // フィルタリング適用
    if (year) {
      duels = duels.filter((duel: any) => {
        const duelDate = new Date(duel.played_at)
        return duelDate.getFullYear() === year
      })
    }

    if (month) {
      duels = duels.filter((duel: any) => {
        const duelDate = new Date(duel.played_at)
        return duelDate.getMonth() + 1 === month
      })
    }

    if (gameMode) {
      duels = duels.filter((duel: any) => duel.game_mode === gameMode)
    }

    if (duels.length === 0) {
      return ''
    }

    const columnMapping: Record<
      string,
      { header: string; getValue: (duel: any) => string }
    > = {
      deck_name: {
        header: '使用デッキ',
        getValue: (duel: any) => this.escapeCsvField(duel.player_deck_name || '')
      },
      opponent_deck_name: {
        header: '相手デッキ',
        getValue: (duel: any) => this.escapeCsvField(duel.opponent_deck_name || '')
      },
      result: {
        header: '結果',
        getValue: (duel: any) => (duel.result === 'win' ? '勝利' : '敗北')
      },
      coin: {
        header: 'コイン',
        getValue: (duel: any) => (duel.coin_result === 'win' ? '表' : '裏')
      },
      first_or_second: {
        header: '先攻/後攻',
        getValue: (duel: any) => (duel.turn_order === 'first' ? '先攻' : '後攻')
      },
      game_mode: {
        header: 'ゲームモード',
        getValue: (duel: any) => duel.game_mode || ''
      },
      rank: {
        header: 'ランク',
        getValue: (duel: any) => getRankName(duel.rank_value)
      },
      rate_value: {
        header: 'レート',
        getValue: (duel: any) => (duel.rate_value ?? '').toString()
      },
      dc_value: {
        header: 'DC値',
        getValue: (duel: any) => (duel.dc_value ?? '').toString()
      },
      played_date: {
        header: '対戦日時',
        getValue: (duel: any) => formatPlayedDate(duel.played_at)
      },
      notes: {
        header: 'メモ',
        getValue: (duel: any) => this.escapeCsvField(duel.notes || '')
      }
    }

    const exportColumns =
      columns && columns.length > 0
        ? columns.filter(column => columnMapping[column])
        : Object.keys(columnMapping)

    if (exportColumns.length === 0) {
      return ''
    }

    const headers = exportColumns.map(column => columnMapping[column].header)

    const rows = duels.map((duel: any) =>
      exportColumns
        .map(column => columnMapping[column].getValue(duel))
        .map(value =>
          typeof value === 'string' ? value : this.escapeCsvField(String(value))
        )
        .join(',')
    )

    // UTF-8 BOMを追加
    const BOM = '\uFEFF'
    return BOM + [headers.join(','), ...rows].join('\n')

    function formatPlayedDate(playedAt: string | null | undefined): string {
      if (!playedAt) {
        return ''
      }

      const date = new Date(playedAt)
      if (Number.isNaN(date.getTime())) {
        return ''
      }

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    function getRankName(rankValue: number | null): string {
      if (!rankValue) return ''
      if (rankValue === 1) return 'ブロンズ5'
      if (rankValue === 2) return 'ブロンズ4'
      if (rankValue === 3) return 'ブロンズ3'
      if (rankValue === 4) return 'ブロンズ2'
      if (rankValue === 5) return 'ブロンズ1'
      if (rankValue === 6) return 'シルバー5'
      if (rankValue === 7) return 'シルバー4'
      if (rankValue === 8) return 'シルバー3'
      if (rankValue === 9) return 'シルバー2'
      if (rankValue === 10) return 'シルバー1'
      if (rankValue === 11) return 'ゴールド5'
      if (rankValue === 12) return 'ゴールド4'
      if (rankValue === 13) return 'ゴールド3'
      if (rankValue === 14) return 'ゴールド2'
      if (rankValue === 15) return 'ゴールド1'
      if (rankValue === 16) return 'プラチナ5'
      if (rankValue === 17) return 'プラチナ4'
      if (rankValue === 18) return 'プラチナ3'
      if (rankValue === 19) return 'プラチナ2'
      if (rankValue === 20) return 'プラチナ1'
      if (rankValue === 21) return 'ダイヤモンド5'
      if (rankValue === 22) return 'ダイヤモンド4'
      if (rankValue === 23) return 'ダイヤモンド3'
      if (rankValue === 24) return 'ダイヤモンド2'
      if (rankValue === 25) return 'ダイヤモンド1'
      if (rankValue === 26) return 'マスター5'
      if (rankValue === 27) return 'マスター4'
      if (rankValue === 28) return 'マスター3'
      if (rankValue === 29) return 'マスター2'
      if (rankValue === 30) return 'マスター1'
      return String(rankValue)
    }
  }

  // CSV Import
  importDuelsFromCSV(csvContent: string) {
    // UTF-8 BOMを除去
    if (csvContent.startsWith('\uFEFF')) {
      csvContent = csvContent.substring(1)
    }

    const lines = csvContent.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      throw new Error('CSVファイルが空です')
    }

    const header = this.parseCsvLine(lines[0])
    const dataLines = lines.slice(1)
    const duels = []
    let createdCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // ヘッダーから列のインデックスを取得
    const getColumnIndex = (columnName: string): number => {
      return header.indexOf(columnName)
    }

    const deckNameIdx = getColumnIndex('使用デッキ')
    const opponentDeckNameIdx = getColumnIndex('相手デッキ')
    const resultIdx = getColumnIndex('結果')
    const coinIdx = getColumnIndex('コイン')
    const turnOrderIdx = getColumnIndex('先攻/後攻')
    const gameModeIdx = getColumnIndex('ゲームモード')
    const rankIdx = getColumnIndex('ランク')
    const rateIdx = getColumnIndex('レート')
    const dcIdx = getColumnIndex('DC値')
    const playedAtIdx = getColumnIndex('対戦日時')
    const notesIdx = getColumnIndex('メモ')

    // ランク名からランク値への変換
    const getRankValue = (rankName: string): number | null => {
      if (!rankName) return null

      const rankMap: { [key: string]: number } = {
        'ブロンズ5': 1, 'ブロンズ4': 2, 'ブロンズ3': 3, 'ブロンズ2': 4, 'ブロンズ1': 5,
        'シルバー5': 6, 'シルバー4': 7, 'シルバー3': 8, 'シルバー2': 9, 'シルバー1': 10,
        'ゴールド5': 11, 'ゴールド4': 12, 'ゴールド3': 13, 'ゴールド2': 14, 'ゴールド1': 15,
        'プラチナ5': 16, 'プラチナ4': 17, 'プラチナ3': 18, 'プラチナ2': 19, 'プラチナ1': 20,
        'ダイヤモンド5': 21, 'ダイヤモンド4': 22, 'ダイヤモンド3': 23, 'ダイヤモンド2': 24, 'ダイヤモンド1': 25,
        'マスター5': 26, 'マスター4': 27, 'マスター3': 28, 'マスター2': 29, 'マスター1': 30
      }

      if (rankMap[rankName]) {
        return rankMap[rankName]
      }

      // 数値の場合はそのまま返す
      const numValue = parseInt(rankName)
      if (!isNaN(numValue)) {
        return numValue
      }

      return null
    }

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2
      try {
        const fields = this.parseCsvLine(dataLines[i])

        const playerDeckName = deckNameIdx >= 0 ? fields[deckNameIdx] : null
        const opponentDeckName = opponentDeckNameIdx >= 0 ? fields[opponentDeckNameIdx] : null
        const playedAtStr = playedAtIdx >= 0 ? fields[playedAtIdx] : null

        if (!playerDeckName || !opponentDeckName) {
          errors.push(`行${rowNum}: 使用デッキまたは相手デッキの名前が不足しています`)
          continue
        }

        if (!playedAtStr) {
          errors.push(`行${rowNum}: 対戦日時が不足しています`)
          continue
        }

        // 日付をパース (YYYY-MM-DD HH:MM:SS -> ISO 8601)
        let playedAt: string
        try {
          // YYYY-MM-DD HH:MM:SS形式
          const match = playedAtStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
          if (match) {
            const [, year, month, day, hour, minute, second] = match
            playedAt = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            ).toISOString()
          } else {
            // YYYY/MM/DD HH:MM形式も対応
            const match2 = playedAtStr.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/)
            if (match2) {
              const [, year, month, day, hour, minute] = match2
              playedAt = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute)
              ).toISOString()
            } else {
              throw new Error(`対戦日時の形式が不正です: ${playedAtStr}`)
            }
          }
        } catch (e) {
          errors.push(`行${rowNum}: ${e instanceof Error ? e.message : String(e)}`)
          continue
        }

        // Get or create decks
        let playerDeckId = null
        let opponentDeckId = null

        if (playerDeckName) {
          const deck = this.db
            .prepare('SELECT id FROM deck WHERE name = ? AND is_opponent_deck = 0 AND is_archived = 0')
            .get(playerDeckName) as any

          if (deck) {
            playerDeckId = deck.id
          } else {
            const result: any = this.createDeck({ name: playerDeckName, is_opponent_deck: false })
            playerDeckId = result.id
          }
        }

        if (opponentDeckName) {
          const deck = this.db
            .prepare('SELECT id FROM deck WHERE name = ? AND is_opponent_deck = 1 AND is_archived = 0')
            .get(opponentDeckName) as any

          if (deck) {
            opponentDeckId = deck.id
          } else {
            const result: any = this.createDeck({ name: opponentDeckName, is_opponent_deck: true })
            opponentDeckId = result.id
          }
        }

        // 重複チェック
        const existingDuel = this.db.prepare(`
          SELECT id FROM duel
          WHERE player_deck_id = ? AND opponent_deck_id = ? AND played_at = ?
        `).get(playerDeckId, opponentDeckId, playedAt) as any

        if (existingDuel) {
          skippedCount++
          continue
        }

        // 結果の変換: '勝利' -> 'win', '敗北' -> 'loss'
        const resultStr = resultIdx >= 0 ? fields[resultIdx] : ''
        const result = resultStr === '勝利' ? 'win' : 'loss'

        // コインの変換: '表' -> 'win', '裏' -> 'loss'
        const coinStr = coinIdx >= 0 ? fields[coinIdx] : ''
        const coinResult = coinStr === '表' ? 'win' : 'loss'

        // 先攻/後攻の変換: '先攻' -> 'first', '後攻' -> 'second'
        const turnOrderStr = turnOrderIdx >= 0 ? fields[turnOrderIdx] : ''
        const turnOrder = turnOrderStr === '先攻' || turnOrderStr === '先行' ? 'first' : 'second'

        // ランクの処理
        const rankStr = rankIdx >= 0 ? fields[rankIdx] : ''
        const rankValue = getRankValue(rankStr)

        // レートとDC値
        const rateStr = rateIdx >= 0 ? fields[rateIdx] : ''
        const rateValue = rateStr && !isNaN(parseInt(rateStr)) ? parseInt(rateStr) : null

        const dcStr = dcIdx >= 0 ? fields[dcIdx] : ''
        const dcValue = dcStr && !isNaN(parseInt(dcStr)) ? parseInt(dcStr) : null

        duels.push({
          player_deck_id: playerDeckId,
          opponent_deck_id: opponentDeckId,
          result: result,
          game_mode: gameModeIdx >= 0 ? fields[gameModeIdx] || 'RANK' : 'RANK',
          rank_value: rankValue,
          rate_value: rateValue,
          dc_value: dcValue,
          coin_result: coinResult,
          turn_order: turnOrder,
          played_at: playedAt,
          notes: notesIdx >= 0 ? fields[notesIdx] || null : null
        })
        createdCount++
      } catch (e) {
        errors.push(`行${rowNum}: ${e instanceof Error ? e.message : String(e)}`)
        continue
      }
    }

    if (duels.length > 0) {
      this.importDuels(duels)
    }

    return {
      success: true,
      count: createdCount,
      skipped: skippedCount,
      errors: errors
    }
  }

  // Helper: Escape CSV field
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  // Helper: Parse CSV line (handles quoted fields)
  private parseCsvLine(line: string): string[] {
    const fields = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField)
        currentField = ''
      } else {
        currentField += char
      }
    }

    fields.push(currentField)
    return fields
  }

  close() {
    this.db.close()
  }
}
