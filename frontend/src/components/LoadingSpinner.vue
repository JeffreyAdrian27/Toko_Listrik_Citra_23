<template>
  <div class="loading-container" :style="{ minHeight: minHeight }">
    <div class="spinner-wrapper">
      <div class="custom-spinner" :class="`spinner-${size}`"></div>
      <div class="spinner-pulse"></div>
    </div>
    <div v-if="text" class="loading-title">{{ text }}</div>
    <div v-if="subtext" class="loading-desc">{{ subtext }}</div>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: 'Memuat data...'
  },
  subtext: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md' // 'sm', 'md', 'lg'
  },
  minHeight: {
    type: String,
    default: '180px'
  }
});
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 36px 16px;
  text-align: center;
}

.spinner-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.custom-spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: #DBEAFE;
  border-top-color: #005CE6;
  border-right-color: #005CE6;
  animation: spin 0.75s linear infinite;
}

.spinner-sm {
  width: 22px;
  height: 22px;
  border-width: 2.5px;
}

.spinner-md {
  width: 38px;
  height: 38px;
  border-width: 3.5px;
}

.spinner-lg {
  width: 52px;
  height: 52px;
  border-width: 4px;
}

.spinner-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 92, 230, 0.12) 0%, rgba(0, 92, 230, 0) 70%);
  animation: pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}

.loading-title {
  font-size: 0.925rem;
  font-weight: 600;
  color: var(--text-main, #0F172A);
  letter-spacing: -0.01em;
}

.loading-desc {
  font-size: 0.8rem;
  color: var(--text-muted, #64748B);
  margin-top: 4px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.35);
    opacity: 0.9;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
