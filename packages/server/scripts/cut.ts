import sharp from 'sharp'

async function cutImageIntoSquares(imagePath: string): Promise<void> {
  const image = sharp(imagePath)
  const metadata = await image.metadata()
  const { width, height } = metadata
  const ratio = width / height
  if (ratio !== 2)
    throw new Error('Image is not 2:1 ratio')

  const squareSize = width / 20
  if (squareSize % 1 !== 0)
    throw new Error('Width is not divisible by 20')

  for (let index = 0; index < 200; index++) {
    const col = index % 20
    const row = Math.floor(index / 20)
    const left = col * squareSize
    const top = row * squareSize
    console.log(`Extracting ${col}, ${row}`)
    await image.clone()
      .extract({ left, top, width: squareSize, height: squareSize })
      .webp({ quality: 90 })
      .toFile(`./tiles/cover/${index}.webp`)
  }
}

await cutImageIntoSquares('./message.png')
