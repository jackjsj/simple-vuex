<!-- app.vue -->
<template>
  <div id="app">
    <p>a module state aCount:{{$store.state.a.aCount}}</p>
    <p>b module state bCount:{{$store.state.b.bCount}}</p>
    <p>c module state cCount:{{$store.state.a.c.cCount}}</p>
    <p>a module getter aCountPlusCount:{{$store.getters.aCountPlusCount}}</p>
    <p>root module state count:{{$store.state.count}}</p>
    <Child></Child>
  </div>
</template>
<script>
import Child from '@/components/Child';

export default {
  components: {
    Child,
  },
  mounted() {
  },
};
</script>
