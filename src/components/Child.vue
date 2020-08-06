<!-- Child.vue -->
<template>
  <div>放在 Child 中的 count: {{ $store.state.count }}</div>
</template>

<script>
export default {
  mounted() {
    this.$store.dispatch('increamentAsync', { value: 2 });
  },
};
</script>
