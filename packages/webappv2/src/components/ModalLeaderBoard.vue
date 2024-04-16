<script setup lang="ts">
import { useAttrs } from 'vue'
import { useGameStore } from '../stores/game.ts'

const attrs = useAttrs()
const gameStore = useGameStore()
</script>

<template>
  <AModal v-bind="attrs" title="Leaderboard" :footer="null">
    <AList
      class="demo-loadmore-list"
      item-layout="horizontal"
      :data-source="gameStore.leaderBoard"
    >
      <template #renderItem="{ item }">
        <AListItem>
          <AListItemMeta>
            <template #title>
              {{ item.name }}
            </template>
            <template #avatar>
              <AAvatar :src="item.picture" />
            </template>
          </AListItemMeta>
          <template #actions>
            {{ item.score }}
          </template>
        </AListItem>
      </template>
    </AList>
  </AModal>
</template>

<style scoped>

</style>
