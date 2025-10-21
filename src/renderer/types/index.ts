// Duel types
export type GameMode = 'RANK' | 'RATE' | 'EVENT' | 'DC'

export interface Duel {
  id: number
  player_deck_id: number
  opponent_deck_id: number
  result: 'win' | 'loss'
  game_mode: GameMode
  rank_value?: number
  rate_value?: number
  dc_value?: number
  coin_result?: 'win' | 'loss'
  turn_order?: 'first' | 'second'
  played_at: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined fields from database
  player_deck_name?: string
  opponent_deck_name?: string
  // Legacy field names for compatibility
  deck?: { id: number; name: string }
  opponentdeck?: { id: number; name: string }
  coin?: boolean
  first_or_second?: boolean
  rank?: number
  played_date?: string
  // Additional fields for form
  deck_id?: number
  opponentDeck_id?: number
}

export interface DuelCreate {
  deck_id: number | null
  opponentDeck_id: number | null
  result: boolean
  game_mode: GameMode
  rank?: number
  rate_value?: number
  dc_value?: number
  coin: boolean
  first_or_second: boolean
  played_date: string
  notes: string
}

// Deck types
export interface Deck {
  id: number
  name: string
  is_opponent_deck: number
  created_at: string
  updated_at: string
}

// User types
export interface User {
  id: number
  username: string
  streamer_mode: number
  theme_preference: string
  created_at: string
  updated_at: string
}

// Statistics types
export interface DuelStats {
  total_duels: number
  win_count: number
  lose_count: number
  win_rate: number
  first_turn_win_rate: number
  second_turn_win_rate: number
  coin_win_rate: number
  go_first_rate: number
}

export interface MonthlyStatistics {
  player_deck_distribution: {
    name: string
    count: number
  }[]
  opponent_deck_distribution: {
    name: string
    count: number
  }[]
}

export interface MatchupWinrate {
  player_deck: string
  opponent_deck: string
  wins: number
  losses: number
  total: number
  win_rate: number
}
