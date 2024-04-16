import { JSONFilePreset } from 'lowdb/node'
import type { Quiz, Tile, User } from '@firegroup-culture/shared'
import type { Low } from 'lowdb'

interface Schema {
  Quizzes: Quiz[]
  Users: User[]
  Tiles: Tile[]
}

export const db: Low<Schema> = await JSONFilePreset<Schema>('./data/database.json', {
  Quizzes: new Array<Quiz>(),
  Tiles: new Array<Tile>(),
  Users: new Array<User>(),
})
