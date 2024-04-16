<script setup lang="ts">
import { ref, useAttrs } from 'vue'
import { useCurrentUser, useFirebaseAuth } from 'vuefire'
import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'

const attrs = useAttrs()

const auth = useFirebaseAuth()!
const user = useCurrentUser()

const error = ref(null)
function signIn() {
  signInWithPopup(auth, new GoogleAuthProvider())
    .then((result) => {
      console.log('result', result)
    })
    .catch((e) => {
      error.value = e
    })
}
</script>

<template>
  <AModal v-bind="attrs" title="Sign In" :footer="null">
    <AButton v-if="!user" @click.prevent="signIn">
      Đăng nhập băng Google
    </AButton>
    <div v-else>
      Đang xác thực với server
    </div>
  </AModal>
</template>

<style scoped>

</style>
