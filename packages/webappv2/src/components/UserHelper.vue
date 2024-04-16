<script setup lang="ts">
import { useCurrentUser } from 'vuefire'
import { useGameStore } from '../stores/game.ts'

const gameStore = useGameStore()
const currentUser = useCurrentUser()
</script>

<template>
  <div v-if="currentUser" :class="$style.container">
    <AAvatar :src="currentUser.photoURL!" />
    <div :class="$style.item">
      <img src="/sprites/coin.png"><strong>{{ gameStore.score }}</strong><small>coins</small>
    </div>
    <div :class="$style.item">
      <img src="/sprites/stamina.png"><strong>{{ gameStore.stamina }}</strong> <small>stamina</small>
    </div>
  </div>
</template>

<style lang="stylus" module>
.container
  padding 10px 15px
  border-radius 8px
  position fixed
  right 10px
  top 10px
  z-index 1
  min-width 200px
  background transparent
  backdrop-filter blur(50px)
  color white
  border none
  display flex
  flex-direction row
  flex-wrap nowrap
  gap 10px
.item
  display grid
  grid-template-columns 20px 20px 50px
  justify-content center
  align-items center
  gap 8px
  img
    width 20px
    height auto
</style>
