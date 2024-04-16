<script setup lang="ts">
import { useAttrs } from 'vue'
import { useCurrentUser } from 'vuefire'

const attrs = useAttrs()
const user = useCurrentUser()
</script>

<template>
  <AModal v-bind="attrs" title="Settings">
    {{ user?.displayName }}
  </AModal>
</template>

<style scoped>

</style>
