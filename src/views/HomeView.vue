<script setup lang="ts">
import LoginForm, { type LoginFormData } from '../components/LoginForm.vue'

function doStuff(data: LoginFormData) {
  // TODO: Login with the API or whatever
  console.debug(data)
  console.debug(data.email)
  console.debug(data.password)
}
</script>

<template>
  <main class="flex items-center justify-center h-screen">
    <LoginForm @submit="doStuff" />
  </main>
</template>
