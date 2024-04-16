import * as fs from 'node:fs'
import type { Tile } from '@firegroup-culture/shared'
import csvParser from 'csv-parser'
import { db } from '../repository.ts'

// read file from source.csv
// parse csv to json
// insert to db

db.data.Quizzes = []
let index = 0
fs.createReadStream('./scripts/source.csv')
  .pipe(csvParser())
  .on('data', (data) => {
    index++
    console.log(data)
    db.data.Quizzes.push({
      choices: [
        data.A,
        data.B,
        data.C,
        data.D,
      ],
      correctAnswer: data.A,
      name: `quiz-${index}`,
      question: data.QUESTION,
    })
  }).on('end', async () => {
  // tiles
    db.data.Tiles = []
    for (let i = 0; i < 200; i++) {
      const tile = {
        name: `quiz${i}`,
        coverImageUrl: `/tiles/cover/${i}.webp`,
        unveiledImageUrl: `/tiles/message/${i}.webp`,
      } satisfies Tile

      db.data.Tiles.push(tile)
    }

    console.log(db.data.Quizzes.length)
    await db.write()
  })
