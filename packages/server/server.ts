import { createServer } from 'node:http'
import process from 'node:process'
import express from 'express'
import type { DisconnectReason, Socket } from 'socket.io'
import { Server } from 'socket.io'
import { initializeApp } from 'firebase-admin/app'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { getAuth } from 'firebase-admin/auth'
import msgPack from 'socket.io-msgpack-parser'

import type {
  InAppNotificationEvent,
  MenuClickEvent,
  RemovePlayerEvent,
  SubmitAnswerEvent,
  TileClickEvent,
  TilesSyncedEvent,
  UpdateGameStoreEvent,
  UpdateTileEvent,
} from '@firegroup-culture/shared/events'
import {
  EventNames_UpdateStamina,

  EventNames__FocusOnGame,

  EventNames__FocusOnMenu,

  EventNames__FocusOnPrize,

  EventNames__InAppNotification,
  EventNames__LoginWithIdToken,
  EventNames__MenuClicked,
  EventNames__RemovePlayer,
  EventNames__RenderCanvas,
  EventNames__RenderTiles,
  EventNames__SpawnPlayer,
  EventNames__SubmitAnswer,
  EventNames__TileClicked,
  EventNames__UpdateGameStore,
  EventNames__UpdateTile,
} from '@firegroup-culture/shared/events'
import type { ResultAnimation, Tile, User } from '@firegroup-culture/shared'

import { db } from './repository.ts'

import { logger } from './logger.ts'

// track if a user is already connected, map string email to string socket id
const sessions = new Map<string, DecodedIdToken>()

// only email end with this domain can connect to the server
const allowedEmail = 'firegroup.io'

// stamina system
// 10 stamina, recover 2 per minute
// each attempt cost 2 stamina
// so that user can anser 5 questions per minute at most
// then 1 answer per 2
const maxStamina = 20
const staminaRecoveryRate = 1
const staminaCostPerAttempt = 4
// 1 minute
const recoverInterval = 1000 * 60

// with current config, user can answer 5 questions per minute

// Error messages
const ERROR_MESSAGES = {
  AUTH_ERROR: 'Authentication error',
  INVALID_TOKEN: 'Invalid token',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  EMAIL_NOT_ALLOWED: 'Email not allowed',
  USER_ALREADY_CONNECTED: 'User already connected',
  USER_NOT_FOUND: 'User not found',
}

interface Attempt {
  tileName: string
  quizName: string
}

const congratulationMessages = [
  // Khen ngợi trí thông minh
  'Thật là một bộ não phi thường! Bạn đã giải mã bí ẩn một cách xuất sắc!',
  'Trí tuệ của bạn sáng chói như kim cương vậy! Câu trả lời của bạn hoàn toàn chính xác!',
  'Bạn sở hữu khả năng suy luận logic đáng kinh ngạc! Bí ẩn này không thể làm khó bạn!',

  // Khen ngợi sự nhanh nhạy
  'Tốc độ của bạn nhanh như chớp! Bạn đã giải mã bí ẩn trong chớp mắt!',
  'Phản ứng của bạn thật đáng kinh ngạc! Bạn đã tìm ra đáp án một cách nhanh chóng và chính xác!',
  'Bạn giống như một ninja thám tử! Khả năng giải quyết bí ẩn của bạn thật phi thường!',

  // Khen ngợi sự kiên trì
  'Sự kiên trì của bạn đã được đền đáp xứng đáng! Bạn đã giải mã bí ẩn sau bao nỗ lực!',
  'Tinh thần không bỏ cuộc của bạn thật đáng khâm phục! Bạn đã chứng minh rằng không có bí ẩn nào là không thể giải mã!',
  'Bạn là minh chứng cho câu nói \'Có chí thì nên\'! Nhờ sự kiên trì, bạn đã chinh phục được thử thách này!',

  // So sánh với nhân vật thông minh
  'Bạn thông minh hơn cả Sherlock Holmes! Bí ẩn này không thể làm khó bạn!',
  'Khả năng suy luận của bạn sánh ngang với Albert Einstein! Câu trả lời của bạn hoàn toàn chính xác!',
  'Bạn giống như Hermione Granger trong Harry Potter! Kiến thức và trí tuệ của bạn luôn dẫn bạn đến thành công!',

  // Dùng phép ẩn dụ hài hước
  'Bí ẩn này đã bị bạn đánh bại! Giờ nó chỉ còn là mớ hỗn độn như tổ ong sau khi bị ong đốt!',
  'Bạn đã bẻ khóa bí ẩn này một cách dễ dàng! Giống như bẻ kẹo dẻo vậy!',
  'Khả năng giải mã bí ẩn của bạn thật phi thường! Giống như một chiếc máy quét siêu việt!',

  // Dùng câu nói hài hước
  'Bạn đoán đúng rồi! Bây giờ bí ẩn này đã \'toang\' rồi!',
  'Chúc mừng bạn đã giải mã bí ẩn! Giờ bạn có thể ngủ ngon giấc mà không lo lắng nữa!',
  'Bí ẩn này đã bị bạn \'chinh phục\'! Giờ bạn có thể tự hào khoe khoang với mọi người rồi!',
]

const funnyResponses = [
  // Cấu trúc hài hước
  'Câu trả lời của bạn sáng tạo đến mức khiến tôi phải bật cười! Tuy nhiên, nó không hoàn toàn chính xác.',
  'Trí tưởng tượng của bạn phong phú như vũ trụ vậy! Nhưng tiếc rằng câu trả lời của bạn chưa đúng.',
  'Bạn có suy nghĩ độc đáo và táo bạo! Tuy nhiên, bí ẩn này cần một câu trả lời chính xác hơn.',

  // Dùng phép ẩn dụ hài hước
  'Câu trả lời của bạn giống như một cơn gió thoảng qua, nhẹ nhàng nhưng không đủ để giải mã bí ẩn.',
  'Trí tuệ của bạn như một tia sáng lấp lánh, nhưng nó chưa đủ để soi sáng bí ẩn này.',
  'Khả năng suy luận của bạn như một con bướm xinh đẹp, nhưng nó chưa thể bay đến đáp án chính xác.',

  // Dùng câu nói hài hước
  'Đừng lo lắng, bạn vẫn còn cơ hội để sửa sai! Hãy thử lại với câu hỏi tiếp theo nhé!',
  'Bí ẩn này có thể đánh đố cả những bộ não thông minh nhất. Đừng nản lòng nếu bạn chưa tìm ra đáp án!',
  'Hãy tiếp tục suy nghĩ và thử sức với những câu hỏi khác! Chắc chắn bạn sẽ tìm ra bí ẩn này sớm thôi!',

  // Cấu trúc động viên
  'Đừng lo lắng, ai cũng có thể mắc sai lầm. Hãy tiếp tục cố gắng và bạn sẽ tìm ra đáp án!',
  'Mỗi câu trả lời sai đều là một bài học quý giá. Hãy học hỏi từ nó và bạn sẽ tiến bộ nhanh chóng!',
  'Bạn đã thể hiện sự dũng cảm khi dám thử thách bản thân. Hãy tiếp tục kiên trì và bạn sẽ thành công!',

  // Khuyến khích tư duy sáng tạo
  'Câu trả lời của bạn tuy chưa chính xác nhưng lại thể hiện sự sáng tạo và tư duy độc đáo!',
  'Đừng ngại đưa ra những ý tưởng táo bạo! Suy nghĩ sáng tạo sẽ giúp bạn giải mã những bí ẩn khó khăn nhất.',
  'Hãy tiếp tục khám phá và học hỏi những điều mới mẻ! Kiến thức và trí tưởng tượng sẽ là chìa khóa giúp bạn giải mã bí ẩn.',
]

function getRandomWrongAnswerResponse() {
  return funnyResponses[Math.floor(Math.random() * funnyResponses.length)]
}

// socketID -> quizName
const quizAttempts = new Map<string, Attempt>()

// init firebase app
initializeApp()
const firebaseAuth = getAuth()

function listAllUsers(nextPageToken?: string) {
  getAuth()
    .listUsers(1000, nextPageToken)
    .then((listUsersResult) => {
      listUsersResult.users.forEach((userRecord) => {
        // update user
        db.update((data) => {
          const userIndex = data.Users.findIndex(user => user.uid === userRecord.uid)
          if (userIndex === -1)
            return

          // add meta creationTime
          data.Users[userIndex].creationTime = Date.parse(userRecord.metadata.creationTime)
        })
      })
      if (listUsersResult.pageToken) {
        // List next batch of users.
        listAllUsers(listUsersResult.pageToken)
      }
    })
    .catch((error) => {
      console.log('Error listing users:', error)
    })
}
// Start listing users from the beginning, 1000 at a time.
listAllUsers()

// prepare express app
const app = express()

// integrate with socket.io
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
  },
  parser: msgPack,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
})

// save memory by not storing request object
io.engine.on('connection', (rawSocket) => {
  rawSocket.request = null
})

// schedule write to db every 5 minutes
setInterval(async () => {
  await db.write()
}, 1000 * 60 * 5)

setInterval(async () => {
  await db.update((data) => {
    data.Users.forEach((user) => {
      if (user.stamina < maxStamina)
        user.stamina = Math.min(user.stamina + staminaRecoveryRate, maxStamina)
    })
  })

  // broadcast stamina update
  sessions.forEach((token, socketId) => {
    const user = db.data.Users.find(user => user.uid === token.uid)
    if (user) {
      io.to(socketId).emit(EventNames__UpdateGameStore, {
        stamina: user.stamina,
      })
    }
  })
}, recoverInterval)

// Function to send error notification
function sendInAppNotification(socket: Socket, message: string, broadcast = false) {
  const event = {
    id: 'error',
    message,
    timestamp: Date.now(),
    ttl: 5000,
    tone: 'critical',
  } satisfies InAppNotificationEvent

  if (broadcast)
    socket.broadcast.emit(EventNames__InAppNotification, event)

  else
    socket.emit(EventNames__InAppNotification, event)
}

// auth middleware
async function decodeIdToken(token: string) {
  let decodedIdToken: DecodedIdToken | undefined

  try {
    decodedIdToken = await firebaseAuth.verifyIdToken(token)
  }
  catch (error: any) {
    throw new Error('Invalid token')
  }

  if (decodedIdToken === undefined || decodedIdToken.email === undefined)
    throw new Error('Invalid token')

  if (!decodedIdToken.email_verified)
    throw new Error('Email not verified')

  if (allowedEmail.length > 0 && !decodedIdToken.email.endsWith(allowedEmail))
    throw new Error('Email not allowed')

  return decodedIdToken
}

async function syncTiles(socket: Socket) {
  const quizzes = db.data.Tiles
  const tiles: Tile[] = []
  for (const quiz of quizzes) {
    tiles.push({
      coverImageUrl: quiz.coverImageUrl,
      name: quiz.name,
      awardeeAvatarUrl: quiz.awardeeAvatarUrl,
    })
  }

  await socket.emitWithAck(EventNames__RenderTiles, {
    tiles,
  } satisfies TilesSyncedEvent)
}

function showAttemptResult(socket: Socket, animation: ResultAnimation, message: string) {
  socket.emit(EventNames__UpdateGameStore, {
    isQuestionSubmitting: false,
    lastAttemptResult: {
      animation,
      message,
    },
  } satisfies UpdateGameStoreEvent)
}

function closeQuestionDialog(socket: Socket) {
  socket.emit(EventNames__UpdateGameStore, {
    shouldShowModalQuiz: false,
  })
}

async function processAnswer(socket: Socket, evt: SubmitAnswerEvent) {
  if (!authGuard(socket))
    return

  const tokenData = sessions.get(socket.id)
  if (!tokenData) {
    sendInAppNotification(socket, ERROR_MESSAGES.AUTH_ERROR)
    closeQuestionDialog(socket)
    return
  }

  const attempt = quizAttempts.get(socket.id)
  if (!attempt) {
    sendInAppNotification(socket, 'Hệ thống không ghi nhận yêu cầu trả lời câu hỏi này của bạn trước đó. Có lẽ bạn đã bị ngắt kết nối giữa chừng, hãy thử lại với một ô khác.')
    closeQuestionDialog(socket)
    return
  }

  // release attempt
  quizAttempts.delete(socket.id)

  const userIndex = db.data.Users.findIndex(user => user.uid === tokenData.uid)
  if (userIndex === -1) {
    sendInAppNotification(socket, 'Lỗi này rất lạ, chúng tôi không thể tìm thấy user ID của bạn trong database, có gì đó sai, hãy thử login lại nhé.')
    closeQuestionDialog(socket)
    return
  }

  const tileIndex = db.data.Tiles.findIndex(tile => tile.name === attempt.tileName)
  if (tileIndex === -1) {
    sendInAppNotification(socket, 'Chúng tôi không hiểu tại sao, nhưng không thể tìm thấy ô mà bạn đang muốn giải mã. Hãy thử lại với ô khác.')
    closeQuestionDialog(socket)
    return
  }

  // check if the answer have been answered

  if (db.data.Tiles[tileIndex].awardeeUid) {
    let awardeeName = 'người chơi khác'
    const awardeeIndex = db.data.Users.findIndex(user => user.uid === db.data.Tiles[tileIndex].awardeeUid)
    if (awardeeIndex > -1)
      awardeeName = db.data.Users[awardeeIndex].displayName
    showAttemptResult(socket, 'late', `Bạn chậm chân hơn ${awardeeName} một chút rồi, Ô này đã được ${awardeeName} mở trước.`)
    return
  }

  const quizIndex = db.data.Quizzes.findIndex(quiz => quiz.name === attempt.quizName)
  if (quizIndex === -1) {
    sendInAppNotification(socket, 'Lỗi này chúng tôi không đỡ được, chúng tôi viết message bựa vì tôi nghĩ nó sẽ không bao giờ nên xảy ra cả, nhưng mà nó đã xảy ra, chúng tôi không tìm thấy id của câu hỏi mà bạn đang cố giải đáp, không đỡ nổi mà.')
    closeQuestionDialog(socket)
    return
  }

  if (db.data.Quizzes[quizIndex].correctAnswer !== evt.answer) {
    showAttemptResult(socket, 'wrong', getRandomWrongAnswerResponse())
    return
  }

  db.data.Tiles[tileIndex].awardeeUid = tokenData.uid
  db.data.Tiles[tileIndex].awardeeAvatarUrl = tokenData.picture
  db.data.Tiles[tileIndex].coverImageUrl = db.data.Tiles[tileIndex].unveiledImageUrl ?? ''
  db.data.Users[userIndex].score += 1

  showAttemptResult(socket, 'correct', congratulationMessages[Math.floor(Math.random() * congratulationMessages.length)])

  socket.emit(EventNames__UpdateGameStore, {
    isQuestionSubmitting: false,
    score: db.data.Users[userIndex].score,

  } satisfies UpdateGameStoreEvent)
  sendInAppNotification(socket, `${tokenData.name} vừa mở được thêm 1 ô`, true)

  const updatedTileEvent = {
    tileName: attempt.tileName,
    coverImageUrl: db.data.Tiles[tileIndex].unveiledImageUrl ?? '',
  } satisfies UpdateTileEvent

  socket.broadcast.emit(EventNames__UpdateTile, updatedTileEvent)
  socket.emit(EventNames__UpdateTile, updatedTileEvent)
}

function authGuard(socket: Socket) {
  if (!sessions.has(socket.id)) {
    sendInAppNotification(socket, 'Feature này đòi hỏi login, vui lòng đăng nhập trước. và thử lại!')
    socket.emit(EventNames__UpdateGameStore, {
      shouldShowLoginModal: true,
    })
    return false
  }

  return true
}

async function onProfileMenuClicked(socket: Socket) {
  if (!authGuard(socket))
    return
  socket.emit(EventNames__UpdateGameStore, {
    shouldShowProfileModal: true,
  })
}

async function onLoginWithIdToken(socket: Socket, token: string) {
  let decodedIdToken
  try {
    decodedIdToken = await decodeIdToken(token)
  }
  catch (error: any) {
    logger.error('Token decoding error', error.message)
    sendInAppNotification(socket, ERROR_MESSAGES.INVALID_TOKEN)
    socket.disconnect(true)
    return
  }

  sessions.set(socket.id, decodedIdToken)

  let user: User | undefined
  try {
    user = db.data.Users.find(user => user.uid === decodedIdToken.uid)
    if (!user) {
      user = {
        uid: decodedIdToken.uid,
        email: decodedIdToken.email ?? '',
        displayName: decodedIdToken.name,
        picture: decodedIdToken.picture ?? '',
        score: 0,
        stamina: maxStamina,
      }
      await db.update((data) => {
        data.Users.push(user!)
      })
    }
  }
  catch (error: any) {
    logger.error('Database update error', error.message)
    sendInAppNotification(socket, ERROR_MESSAGES.AUTH_ERROR)
    socket.disconnect(true)
  }

  socket.emit(EventNames__UpdateGameStore, {
    shouldShowLoginModal: false,
    stamina: user?.stamina ?? 0,
    score: user?.score ?? 0,
  })

  sendInAppNotification(socket, 'Chào mừng bạn đến với trò chơi giải mã bí ẩn. Hãy cùng nhau khám phá những bí ẩn thú vị nhé!?')

  const spawnPlayerEvent = {
    name: user?.displayName ?? '',
    uid: user?.uid ?? '',
    picture: user?.picture ?? '',
  }
  socket.broadcast.emit(EventNames__SpawnPlayer, spawnPlayerEvent)

  const shuffledUsers = shuffleArray(db.data.Users)
  const first10Users = shuffledUsers.slice(0, 50)

  // for each session, send the user list
  first10Users.forEach((token, _socketId) => {
    const user = db.data.Users.find(user => user.uid === token.uid)
    if (user) {
      const spawnPlayerEvent = {
        name: user.displayName,
        uid: user.uid,
        picture: user.picture,
      }
      socket.emit(EventNames__SpawnPlayer, spawnPlayerEvent)
    }
  })
}

async function onMenuClicked(socket: Socket, evt: MenuClickEvent) {
  switch (evt.menuId) {
    case 'menu':
      socket.emit(EventNames__FocusOnMenu)
      break
    case 'help':
      socket.emit(EventNames__UpdateGameStore, {
        shouldShowHelpModal: true,
      })
      break
    case 'leaderboard':
      const mapedUser = db.data.Users.map(user => ({
        name: user.displayName,
        score: user.score,
        picture: user.picture,
        creationTime: user.creationTime,
      })).filter(u => u.score > 0)
        .sort((a, b) => {
          return (b.score / b.creationTime) - (a.score / a.creationTime)
        })

      socket.emit(EventNames__UpdateGameStore, {
        shouldShowLeaderBoard: true,
        leaderBoard: mapedUser,
      })
      break
    case 'profile':
      await onProfileMenuClicked(socket)
      break
    case 'settings':
      socket.emit(EventNames__UpdateGameStore, {
        shouldShowSettingsModal: true,
      })
      break
    case 'prizes':
      socket.emit(EventNames__FocusOnPrize)
      break
    case 'game':
      socket.emit(EventNames__FocusOnGame)
      await syncTiles(socket)
      break
  }
}

function shuffleArray(array: any[]) {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ]
  }

  return array
}

// require auth, check fo tile
async function attemptToUnveilTile(socket: Socket, tileName: string) {
  // ensure user is authenticated
  if (!authGuard(socket))
    return

  const tile = db.data.Tiles.find(tile => tile.name === tileName)
  if (!tile) {
    sendInAppNotification(socket, 'Kì lạ, sao chuúng tôi k tìm thấy ô mà bạn đang muốn mở nhỉ. Có sai ở đâu không?')
    return
  }

  // ensure the tile is not already unveiled
  if (tile.awardeeUid) {
    let awardeeName = 'người chơi khác'
    const awardeeIndex = db.data.Users.findIndex(user => user.uid === tile.awardeeUid)
    if (awardeeIndex > -1)
      awardeeName = db.data.Users[awardeeIndex].displayName
    sendInAppNotification(socket, `Ô này đã được mở bởi ${awardeeName}`)
    return
  }

  const session = sessions.get(socket.id)
  if (!session) {
    sendInAppNotification(socket, ERROR_MESSAGES.AUTH_ERROR)
    return
  }

  // get user data
  const userIndex = db.data.Users.findIndex(user => user.uid === session.uid)
  if (userIndex === -1) {
    sendInAppNotification(socket, ERROR_MESSAGES.USER_NOT_FOUND)
    return
  }

  // ensure stamina is enough
  if (db.data.Users[userIndex].stamina <= staminaCostPerAttempt) {
    sendInAppNotification(socket, `Bạn không đủ thể lực để mở ô này. Chỉ còn ${db.data.Users[userIndex].stamina} thể lực. Bạn sẽ phục hồi ${staminaRecoveryRate} thể lực mỗi ${recoverInterval / 1000 / 60} phút. Tối đa ${maxStamina}.`)
    return
  }

  // get random quiz, do not search by name
  const quizData = db.data.Quizzes[Math.floor(Math.random() * db.data.Quizzes.length)]

  quizAttempts.set(socket.id, {
    tileName,
    quizName: quizData.name,
  })

  // decrease stamina
  const newStamina = db.data.Users[userIndex].stamina - staminaCostPerAttempt
  db.data.Users[userIndex].stamina = newStamina

  socket.emit(EventNames_UpdateStamina, {
    stamina: newStamina,
  })

  // this implement have a security issue, because client input the question, answer and the tileName, they can send the same correct answer to multiple tileName
  socket.emit(EventNames__UpdateGameStore, {
    shouldShowModalQuiz: true,
    stamina: newStamina,
    lastAttemptResult: {
      animation: 'none',
      message: '',
    },
    currentQuiz: {
      question: quizData.question,
      choices: shuffleArray(quizData.choices),
    },
  })
}

async function onConnection(socket: Socket) {
  // When user want to submit an answer
  socket.on(EventNames__SubmitAnswer, async (evt: SubmitAnswerEvent) => {
    try {
      await processAnswer(socket, evt)
    }
    catch (error: any) {
      sendInAppNotification(socket, error.message)
    }
  })

  socket.on(EventNames__MenuClicked, async (evt: MenuClickEvent) => {
    try {
      await onMenuClicked(socket, evt)
    }
    catch (error: any) {
      sendInAppNotification(socket, error.message)
    }
  })

  socket.on(EventNames__TileClicked, async (evt: TileClickEvent) => {
    try {
      await attemptToUnveilTile(socket, evt.tileName)
    }
    catch (error: any) {
      sendInAppNotification(socket, error.message)
    }
  })

  // setup event listeners
  socket.on('disconnecting', (_reason: DisconnectReason) => {
    socket.broadcast.emit(EventNames__RemovePlayer, {
      uid: sessions.get(socket.id)?.uid ?? '',
    } satisfies RemovePlayerEvent)

    sessions.delete(socket.id)
  })

  socket.on('disconnect', (_reason: DisconnectReason) => {
    logger.info('Client disconnected')
  })

  socket.on(EventNames__LoginWithIdToken, async (token: string) => {
    await onLoginWithIdToken(socket, token)
  })

  // reset some state when user focus on game
  socket.emit(EventNames__UpdateGameStore, {
    currentQuiz: {
      question: '',
      choices: [],
    },
    isQuestionSubmitting: false,
    shouldShowModalQuiz: false,
    lastAttemptResult: {
      animation: 'none',
      message: '',
    },
  })

  socket.emit(EventNames__RenderCanvas)
}

io.on('connection', onConnection)

process.on('SIGINT', async () => {
  logger.info('EXIT')
  await db.write()
  process.exit(0)
})

// handle fatal error
process.on('uncaughtException', async (error) => {
  logger.error('uncaughtException', error)
  await db.write()
  process.exit(1)
})

// start serve
server.listen(process.env.PORT ?? 3000, () => {
  logger.info(`server running on port ${process.env.PORT ?? 3000}`)
})
