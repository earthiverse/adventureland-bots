<template>
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-2">
        <input type="email" placeholder="Email" class="input input-bordered w-96" v-model="data.email" required />
        <input type="password" placeholder="Password" class="input input-bordered w-96" v-model="data.password"
            required />
        <button type="submit" class="btn btn-primary w-48">Login</button>
    </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// TODO: It would be nice if the form highlighted invalid fields on submit,
//       And reformat on subsequent submits

export interface LoginFormData {
    email: string
    password: string
}

const data = ref<LoginFormData>({
    email: '',
    password: ''
})

const emit = defineEmits<{
    (e: 'submit', form: LoginFormData): void
}>()
const handleSubmit = () => emit('submit', data.value)
</script>
