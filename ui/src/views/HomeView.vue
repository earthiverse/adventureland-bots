<script setup lang="ts">
import LoginForm, { type LoginFormData } from '../components/LoginForm.vue'
import { useAdventurelandStore } from '@/stores/adventureland';

const adventurelandStore = useAdventurelandStore();

async function login(data: LoginFormData) {
  const result = await fetch('/al/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (result.ok) {
    adventurelandStore.login = await result.json()
  }
}

async function updateCharacters() {
  const result = await fetch('/al/get-characters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adventurelandStore.login)
  })

  if (result.ok) {
    adventurelandStore.characters = await result.json()
  }
}
</script>

<template>
  <main class="flex items-center justify-center h-screen">
    <div v-if="adventurelandStore.isLoggedIn">
      <p>We're logged in!</p>
      <p>Our userID is {{ adventurelandStore.login.userID }}</p>
      <p>
      <details>
        <summary>Click to reveal User Auth</summary>
        {{ adventurelandStore.login.userAuth }}
      </details>
      </p>
      <button class="btn" @click="updateCharacters">Click to update characters</button>
      <h2>Characters:</h2>
      <div v-for="(character, name) in adventurelandStore.characters" :key="name">
        <span>{{ name }}: </span>
        <span v-if="!character.online || name.includes('Mag') || name.includes('Mer2')"
          class="text-red-600">Offline</span>
        <span v-else class="text-green-600">Online!</span>
      </div>
    </div>
    <div v-else>
      <LoginForm @submit="login" />
    </div>
  </main>
</template>
