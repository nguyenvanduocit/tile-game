import type { useGameStore } from 'webappv2/src/stores/game.ts'
import type { Tile, User } from './types.ts'

export const EventNames__ConnectError = 'connect_error'

export const EventNames__Auth_Passed = 'auth/_passed'
export interface AuthPassedEvent {
  user: User
}

export const EventNames__InAppNotification = 'in-app-notificaion'
export interface InAppNotificationEvent {
  id: string
  message: string
  timestamp: number
  ttl: number
  tone: 'info' | 'success' | 'warning' | 'critical'
}

export const EventNames__Users_Added = 'users/_added'
export interface UserAddedEvent {
  user: User
}

export const EventNames__Users_Removed = 'users/_removed'
export interface UserRemovedEvent {
  uid: string
  name: string
}

export const EventNames__RenderTiles = 'tiles/_synced'
export interface TilesSyncedEvent {
  tiles: Tile[]
}

export const EventNames__FetchTiles = 'titles/_fetch'

export const EventNames__SubmitAnswer = 'answer/_submit'
export interface SubmitAnswerEvent {
  answer: string
}

export const EventNames__AttemptToQuiz = 'quiz/_attempt'
export interface AttemptToQuizEvent {
  tileName: string
}

export const EventNames__RenderCanvas = 'canvas/_render'

export const EventNames__CanvasRendered = 'canvas/_rendered'
export const EventNames__StartGame = 'game/_start'

export const EventNames__StartIdleAnimation = 'idle/_start'

export const EventNames__UpdateGameStore = 'game/_update'
export interface UpdateGameStoreEvent extends Partial<Record<keyof ReturnType<typeof useGameStore>, any>> {}

export const EventNames__OpenQuizModal = 'quiz/_open'
export interface OpenQuizModalEvent {
  quizName: string
  question: string
}

export const EventNames__CloseQuizModal = 'quiz/_close'

export const EventNames__UpdateTile = 'tile/_update'
export interface UpdateTileEvent {
  tileName: string
  coverImageUrl: string
}

export const EventNames__MenuClicked = 'menu/_click'
export interface MenuClickEvent {
  menuId: string
}

export const EventNames__LoginWithIdToken = 'auth/_login'

export const EventNames__Logout = 'auth/_logout'

export const EventNames__SelectAnswer = 'answer/_select'

export const EventNames__BackToMenu = 'menu/_back'

export const EventNames__TileClicked = 'tile/_click'
export interface TileClickEvent {
  tileName: string
}

export const EventNames__ShowQuizForm = 'quiz/_show'
export interface ShowQuizFormEvent {
  question: string
  tileName: string
  choices: string[]
}

export const EventNames_UpdateStamina = 'stamina/_update'

export const EventNames__FocusOnGame = 'game/_focus'

export const EventNames__FocusToTile = 'tile/_focus'
export interface FocusToTileEvent {
  tileName: string
}

export const EventNames__FocusOnPrize = 'prize/_focus'

export const EventNames__FocusOnMenu = 'menu/_focus'

export const EventNames__SpawnPlayer = 'player/_spawn'
export interface SpawnPlayerEvent {
  name: string
  picture: string
  uid: string
}

// remove player
export const EventNames__RemovePlayer = 'player/_remove'
export interface RemovePlayerEvent {
  uid: string
}
