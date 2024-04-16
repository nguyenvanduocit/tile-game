<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { SubmitAnswerEvent } from '@firegroup-culture/shared'
import { EventNames__SubmitAnswer } from '@firegroup-culture/shared'
import type { AlertType } from 'ant-design-vue/es/alert'
import { useGameStore } from '../stores/game.ts'
import { socket } from '../socket/service.ts'

const attrs = useAttrs()

const gameState = useGameStore()

function submitAnswer(answer: string) {
  socket.emit(EventNames__SubmitAnswer, { answer } satisfies SubmitAnswerEvent)
  gameState.isQuestionSubmitting = true
}

function closeModal() {
  gameState.isQuestionSubmitting = false
  gameState.shouldShowModalQuiz = false
  gameState.lastAttemptResult.animation = 'none'
  gameState.lastAttemptResult.message = ''
}

const alertTypeMap = {
  correct: 'success',
  wrong: 'error',
  timeout: 'warning',
  late: 'warning',
  none: 'warning', // add this if 'none' is a possible value of ResultAnimation
}

const hasResult = computed(() => gameState.lastAttemptResult.animation !== 'none')

const pattern = /<([a-zA-Z0-9_-]+)\.webp>/g

const images = computed(() => {
  return gameState.currentQuiz.question.match(pattern)
})

const pureQuestion = computed(() => {
  return gameState.currentQuiz.question.replace(pattern, '')
})
</script>

<template>
  <AModal v-bind="attrs" :title="pureQuestion" :footer="null" :closable="!gameState.isQuestionSubmitting" :mask-closable="!gameState.isQuestionSubmitting" @close="closeModal">
    <ASpin tip="Loading..." :spinning="gameState.isQuestionSubmitting">
      <div v-if="images" style="display: flex; justify-content: center; align-items: center; margin-bottom: 10px">
        <AImage v-for="(image, index) in images" :key="index" :height="200" :src="`/questions/${image.slice(1, -1)}`" />
      </div>
      <div v-if="!hasResult" :class="$style.container">
        <div v-for="(answer, index) in gameState.currentQuiz.choices" :key="index" :class="$style.choice" @click="submitAnswer(answer)">
          {{ answer }}
        </div>
      </div>
      <ASpace v-else direction="vertical">
        <AAlert :message="gameState.lastAttemptResult.message" :type="alertTypeMap[gameState.lastAttemptResult.animation] as AlertType" />
        <div>
          <AButton @click.prevent="closeModal">
            Giải ô khác
          </AButton>
        </div>
      </ASpace>
    </ASpin>
  </AModal>
</template>

<style module lang="stylus">
.container
  display grid
  grid-template-columns repeat(2, 1fr)
  gap 5px
  justify-content center
  align-items center
  margin-top 20px
  margin-bottom 10px
.choice
  width 100%
  height 100%
  background-color #f0f0f0
  padding 10px
  cursor pointer
  border-radius 5px
  &:hover
    background-color #e0e0e0
</style>
