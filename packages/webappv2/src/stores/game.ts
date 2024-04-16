import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import type { ResultAnimation } from '@firegroup-culture/shared'

export type WsConnectStatus = 'initializing' | 'connected' | 'disconnected' | 'reconnected'

export const useGameStore = defineStore('game', () => {
  const wsConnectStatus = ref('initializing')
  const showConnectionModal = computed(() => wsConnectStatus.value !== 'connected')
  const showGameScreen = ref(false)
  const isCanvasRendered = ref(false)
  const shouldShowLoginModal = ref(false)
  const shouldShowHelpModal = ref(false)
  const shouldShowProfileModal = ref(false)
  const shouldShowSettingsModal = ref(false)
  const shouldShowModalQuiz = ref(false)
  const shouldShowModalLoading = ref(false)
  const shouldShowLeaderBoard = ref(false)
  const stamina = ref(0)
  const score = ref(0)
  const leaderBoard = ref([] as { name: string, score: number, picture: string }[])
  const isQuestionSubmitting = ref(false)
  const currentQuiz = reactive({
    question: '',
    choices: [] as string[],
  })
  const lastAttemptResult = reactive<{
    animation: ResultAnimation
    message: string

  }>({
    animation: 'none',
    message: 'dfddf',
  })

  return { lastAttemptResult, currentQuiz, leaderBoard, shouldShowLeaderBoard, stamina, score, isQuestionSubmitting, wsConnectStatus, shouldShowModalQuiz, shouldShowModalLoading, showConnectionModal, showGameScreen, isCanvasRendered, shouldShowLoginModal, shouldShowHelpModal, shouldShowProfileModal, shouldShowSettingsModal }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot))
