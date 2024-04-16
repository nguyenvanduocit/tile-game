// user
export interface User {
  displayName: string
  email: string
  uid: string
  picture: string
  stamina: number
  creationTime: number
  score: number
}

// Raw data in database, used to create a new tile
// we will get data from this collection very often, so make it as small as possible
export interface Quiz {
  name: string
  question: string
  choices: string[]
  correctAnswer: string
}

// this data face the client, use to generate game tiles grid
export interface Tile {
  name: string // basically the id of the tile
  coverImageUrl: string
  unveiledImageUrl?: string // the image that will be shown when the tile is unveiled
  awardeeAvatarUrl?: string // the image that will be shown when the tile is unveiled
  awardeeUid?: string // if the field is not null, it means the tile is already awarded to someone, should not be awarded again
}

export type ResultAnimation = 'correct' | 'wrong' | 'timeout' | 'late' | 'none'
