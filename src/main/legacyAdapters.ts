// Schema adapters for the IPC boundary.
//
// SQLite stores the v2 schema (deck.is_opponent / duel.is_win / won_coin_toss /
// is_going_first / rank / played_date / deck_id / createdat / create_date).
// The Vue renderer still reads the v1 field names (is_opponent_deck / result /
// coin_result / turn_order / rank_value / played_at / player_deck_id /
// created_at). Map at the boundary so neither side has to change.

export type DbDeck = Record<string, any>
export type DbDuel = Record<string, any>

export function deckToLegacy<T extends DbDeck | null | undefined>(deck: T): T {
  if (!deck) return deck
  return {
    ...deck,
    is_opponent_deck: deck.is_opponent,
    created_at: deck.createdat,
    updated_at: deck.updatedat
  } as T
}

export function duelToLegacy<T extends DbDuel | null | undefined>(duel: T): T {
  if (!duel) return duel
  return {
    ...duel,
    player_deck_id: duel.deck_id,
    result: duel.is_win === 1 ? 'win' : 'loss',
    rank_value: duel.rank,
    coin_result: duel.won_coin_toss === 1 ? 'win' : 'loss',
    turn_order: duel.is_going_first === 1 ? 'first' : 'second',
    played_at: duel.played_date,
    created_at: duel.create_date,
    updated_at: duel.update_date
  } as T
}
