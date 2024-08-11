import type { CharacterListData, Game } from 'alclient'
import { computed, ref, watch } from 'vue'
import { type RemovableRef, useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

export const useAdventurelandStore = defineStore('counter', () => {
  const login = ref<RemovableRef<typeof Game.user>>(
    useStorage(
      'login',
      {
        userAuth: '',
        userID: '',
        secure: true
      },
      localStorage,
      { mergeDefaults: true }
    )
  )

  watch(login, () => {})

  const isLoggedIn = computed(() => {
    return login.value.userAuth !== ''
  })

  const characters = ref<RemovableRef<{ [T in string]: CharacterListData }>>(
    useStorage('characters', {}, localStorage, { mergeDefaults: true })
  )

  return { characters, isLoggedIn, login }
})
