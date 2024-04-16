<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useGameStore } from '../stores/game.ts'

const attrs = useAttrs()
const user = useCurrentUser()
const gameStore = useGameStore()
const title = computed(() => `Hi! ${user.value?.displayName}`)
</script>

<template>
  <AModal v-bind="attrs" :title="title">
    <ADescriptions layout="vertical" bordered>
      <ADescriptionsItem label="Thể lực">
        {{ gameStore.stamina }}
      </ADescriptionsItem>

      <ADescriptionsItem label="Số ô gạch đã mở">
        {{ gameStore.score }}
      </ADescriptionsItem>
    </ADescriptions>
  </AModal>
</template>

<style scoped>

</style>
