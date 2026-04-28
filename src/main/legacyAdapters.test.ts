import { describe, it, expect } from 'vitest'
import { deckToLegacy, duelToLegacy } from './legacyAdapters'

// These tests pin down the v2 → v1 mapping at the IPC boundary.
// They guard against the v2.0.1 regression where the renderer received
// raw v2 rows and read them as legacy fields:
//   - all duels rendered as コイン裏 / 後攻 / 敗北 because coin_result /
//     turn_order / result were undefined (`undefined === 'win'` is false).
//   - new duel registration failed because fetchDecks filtered on
//     is_opponent_deck which was undefined, leaving myDecks/opponentDecks
//     empty and routing every name through createDeck → DB duplicate error.

describe('deckToLegacy', () => {
  it('passes through nullish values', () => {
    expect(deckToLegacy(null)).toBeNull()
    expect(deckToLegacy(undefined)).toBeUndefined()
  })

  it('maps a player deck row (is_opponent = 0)', () => {
    const row = {
      id: 1,
      name: '烙印',
      is_opponent: 0,
      active: 1,
      createdat: '2026-04-01T10:00:00',
      updatedat: '2026-04-02T11:00:00'
    }
    const mapped = deckToLegacy(row)
    expect(mapped.is_opponent_deck).toBe(0)
    expect(mapped.created_at).toBe('2026-04-01T10:00:00')
    expect(mapped.updated_at).toBe('2026-04-02T11:00:00')
    expect(mapped.id).toBe(1)
    expect(mapped.name).toBe('烙印')
  })

  it('maps an opponent deck row (is_opponent = 1)', () => {
    const row = { id: 9, name: 'エルド', is_opponent: 1, active: 1 }
    expect(deckToLegacy(row).is_opponent_deck).toBe(1)
  })

  it('regression: filtering mapped decks by is_opponent_deck reproduces fetchDecks split', () => {
    // Reproduces the renderer logic that broke in v2.0.1:
    //   myDecks = allDecks.filter(d => d.is_opponent_deck === 0)
    //   opponentDecks = allDecks.filter(d => d.is_opponent_deck === 1)
    // Before the fix the filters returned [] for both sides, so existing
    // deck names were never matched and DB duplicate-check fired on save.
    const rows = [
      { id: 1, name: '烙印', is_opponent: 0 },
      { id: 2, name: '白き森', is_opponent: 0 },
      { id: 3, name: 'エルド', is_opponent: 1 }
    ]
    const mapped = rows.map(deckToLegacy)
    const myDecks = mapped.filter((d) => d.is_opponent_deck === 0)
    const opponentDecks = mapped.filter((d) => d.is_opponent_deck === 1)
    expect(myDecks.map((d) => d.name)).toEqual(['烙印', '白き森'])
    expect(opponentDecks.map((d) => d.name)).toEqual(['エルド'])
  })

  it('does not mutate the input row', () => {
    const row = { id: 1, name: 'X', is_opponent: 1 } as any
    deckToLegacy(row)
    expect(row.is_opponent_deck).toBeUndefined()
  })
})

describe('duelToLegacy', () => {
  it('passes through nullish values', () => {
    expect(duelToLegacy(null)).toBeNull()
    expect(duelToLegacy(undefined)).toBeUndefined()
  })

  const baseRow = {
    id: 42,
    deck_id: 1,
    opponent_deck_id: 2,
    is_win: 1,
    game_mode: 'RANK',
    rank: 27,
    rate_value: null,
    dc_value: null,
    won_coin_toss: 1,
    is_going_first: 1,
    played_date: '2026-04-26T15:30:00',
    notes: null,
    create_date: '2026-04-26T15:30:01',
    update_date: '2026-04-26T15:30:01',
    player_deck_name: '烙印',
    opponent_deck_name: 'エルド'
  }

  it('maps a winning, coin-表, 先攻 row to legacy field names', () => {
    const mapped = duelToLegacy(baseRow)
    expect(mapped.player_deck_id).toBe(1)
    expect(mapped.result).toBe('win')
    expect(mapped.rank_value).toBe(27)
    expect(mapped.coin_result).toBe('win')
    expect(mapped.turn_order).toBe('first')
    expect(mapped.played_at).toBe('2026-04-26T15:30:00')
    expect(mapped.created_at).toBe('2026-04-26T15:30:01')
    expect(mapped.updated_at).toBe('2026-04-26T15:30:01')
    // Joined fields and unrelated columns survive unchanged.
    expect(mapped.player_deck_name).toBe('烙印')
    expect(mapped.opponent_deck_name).toBe('エルド')
    expect(mapped.opponent_deck_id).toBe(2)
    expect(mapped.game_mode).toBe('RANK')
  })

  it('maps a losing, coin-裏, 後攻 row', () => {
    const mapped = duelToLegacy({
      ...baseRow,
      is_win: 0,
      won_coin_toss: 0,
      is_going_first: 0
    })
    expect(mapped.result).toBe('loss')
    expect(mapped.coin_result).toBe('loss')
    expect(mapped.turn_order).toBe('second')
  })

  it('regression: existing v1.6 records survive the migration without going all 裏/敗北', () => {
    // The user-visible bug after the v1.6 → v2.0 migration was that every
    // historical record rendered as コイン裏 / 後攻 / 敗北 because the
    // renderer read undefined.* === 'win'/'first'. Mix of values must round-
    // trip through the adapter so the dashboard reflects the real history.
    const rows = [
      { ...baseRow, id: 1, is_win: 1, won_coin_toss: 1, is_going_first: 1 },
      { ...baseRow, id: 2, is_win: 0, won_coin_toss: 1, is_going_first: 0 },
      { ...baseRow, id: 3, is_win: 1, won_coin_toss: 0, is_going_first: 1 },
      { ...baseRow, id: 4, is_win: 0, won_coin_toss: 0, is_going_first: 0 }
    ]
    const mapped = rows.map(duelToLegacy)

    // Sanity: not every row collapses to the same value.
    const wins = mapped.filter((d) => d.result === 'win').length
    const coinWins = mapped.filter((d) => d.coin_result === 'win').length
    const firsts = mapped.filter((d) => d.turn_order === 'first').length
    expect(wins).toBe(2)
    expect(coinWins).toBe(2)
    expect(firsts).toBe(2)
  })

  it('coerces to loss/loss/second for any non-1 numeric value (defensive)', () => {
    // SQLite NOT NULL columns should always be 0 or 1, but guard against
    // null/undefined leaking through (e.g. legacy or partial rows).
    const mapped = duelToLegacy({
      ...baseRow,
      is_win: null,
      won_coin_toss: undefined,
      is_going_first: 0
    } as any)
    expect(mapped.result).toBe('loss')
    expect(mapped.coin_result).toBe('loss')
    expect(mapped.turn_order).toBe('second')
  })

  it('does not mutate the input row', () => {
    const row = { ...baseRow }
    duelToLegacy(row)
    expect((row as any).result).toBeUndefined()
    expect((row as any).coin_result).toBeUndefined()
    expect((row as any).turn_order).toBeUndefined()
    expect((row as any).player_deck_id).toBeUndefined()
  })
})
