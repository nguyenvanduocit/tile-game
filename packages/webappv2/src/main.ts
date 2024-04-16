import { createApp } from 'vue'
import type {
  InAppNotificationEvent,
  UpdateGameStoreEvent,
} from '@firegroup-culture/shared'
import {
  EventNames__InAppNotification
  , EventNames__LoginWithIdToken,
  EventNames__Logout,
  EventNames__RenderCanvas,
  EventNames__UpdateGameStore,
} from '@firegroup-culture/shared'
import { createPinia } from 'pinia'

import { message } from 'ant-design-vue'
import { VueFire, VueFireAuth } from 'vuefire'
import type { NoticeType } from 'ant-design-vue/es/message'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css'
import { socket } from './socket/service.ts'
import { useGameStore } from './stores/game.ts'
import { fireAuth, firebaseApp } from './firebase/firebase.ts'

const pinia = createPinia()

createApp(App).use(pinia).use(VueFire, {
  // imported above but could also just be created here
  firebaseApp,
  modules: [
    // we will see other modules later on
    VueFireAuth(),
  ],
}).mount('#app')

const gameState = useGameStore()

fireAuth.onAuthStateChanged(async (user) => {
  if (user === null)
    socket.emit(EventNames__Logout)
  else
    socket.emit(EventNames__LoginWithIdToken, await user.getIdToken())
})

// we do it here, because we want to make this event listener global
socket.on('connect', async () => {
  gameState.wsConnectStatus = 'connected'
  await message.success('Connected to server')

  // try to authenticate with firebase
  const user = fireAuth.currentUser
  if (user !== null)
    socket.emit(EventNames__LoginWithIdToken, await user.getIdToken())
})

socket.on('disconnect', () => {
  gameState.wsConnectStatus = 'disconnected'
})

socket.on('connect_error', async (err) => {
  await message.error(`Connection error: ${err.message}`)
})

socket.on('reconnect', () => {
  gameState.wsConnectStatus = 'reconnected'
})

socket.on(EventNames__UpdateGameStore, (evt: UpdateGameStoreEvent) => {
  console.log(evt)
  gameState.$patch(evt)
})

socket.on(EventNames__InAppNotification, async (evt: InAppNotificationEvent) => {
  await message.open({
    type: evt.tone as NoticeType,
    content: evt.message,
  })
})

socket.on(EventNames__RenderCanvas, async () => {
  if (gameState.isCanvasRendered)
    return
  try {
    const { renderCanvas } = await import('./canvas')
    renderCanvas()
    gameState.isCanvasRendered = true
  }
  catch (err) {
    await message.error('Failed to render canvas. Please contact admin.')
  }
})

socket.connect()
