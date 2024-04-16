<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from './stores/game.ts'
import ModalUserProfile from './components/ModalUserProfile.vue'
import ModalLoginWithGoogle from './components/ModalLoginWithGoogle.vue'
import ModalQuiz from './components/ModalQuiz.vue'
import ModalLoading from './components/ModalLoading.vue'
import ModalLeaderBoard from './components/ModalLeaderBoard.vue'
import UserHelper from './components/UserHelper.vue'

const gameState = useGameStore()

const activeKey = ref<string | string[]>('0')

const helpItems = [
  {
    question: 'Làm sao để trả lời khác đâu hỏi?',
    answer: 'Click vào menu "Quizzes" để được di chuyển tới vị trí của các tiles, Click vào các tiles để nhận được thử thách. Khi vượt qua thử thách thì bạn sẽ nhận được điểm, đồng thời, vị trí của tile sẽ được lật mở, hé lộ một phần thông điệp.',
  },
  {
    question: 'Làm sao để di chuyển giữa các đảo?',
    answer: 'Click vào từng đảo để di chuyển tới đó, nếu không nhìn thấy đảo, hãy zoom out một chút và di chuyển màn hình để nhìn rõ hơn.',
  },
  {
    question: 'Stamina hoạt động như thế nào?',
    answer: 'Khi click vào một tile, bạn sẽ tiêu hao stamina bất kể trả lời đúng hay sai. Stamina sẽ hồi phục qua thời gian. Bạn có thể kiểm tra stamina khi bấm vào menu profile.',
  },
]
</script>

<template>
  <AModal :open="gameState.showConnectionModal" centered :closable="false" :footer="null">
    Connecting to server...
  </AModal>

  <ModalLoginWithGoogle v-model:open="gameState.shouldShowLoginModal" centered :closable="false" />

  <AModal v-model:open="gameState.shouldShowHelpModal" title="Help" centered :footer="null">
    <ASpace style="width: 100%" direction="vertical">
      <ACollapse v-model:activeKey="activeKey">
        <ACollapsePanel v-for="(item, index) in helpItems" :key="index" :header="item.question">
          {{ item.answer }}
        </ACollapsePanel>
      </ACollapse>
    </ASpace>
  </AModal>

  <ModalUserProfile v-model:open="gameState.shouldShowProfileModal" centered :footer="null" />

  <ModalQuiz v-model:open="gameState.shouldShowModalQuiz" centered />

  <ModalLoading v-model:open="gameState.shouldShowModalLoading" centered />

  <ModalLeaderBoard v-model:open="gameState.shouldShowLeaderBoard" centered />

  <UserHelper />
</template>
