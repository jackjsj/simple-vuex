vuex 是 vue 的**状态管理器**插件，它采用**集中式存储**的方式管理**应用中所有组件的状态**，可以使**数据流**变得**清晰**、**可追踪可预测**。

本文将从 0 开始去实现 vuex 的核心功能，即 state, getters, mutations, actions 和 modules。

## Vue 插件的开发

我们知道 Vuex 是作为 Vue 的插件使用的，因此我们需要知道 Vue 插件是如何开发的。在 Vue 中使用插件非常简单，即：

```js
import MyPlugin from './MyPlugin';

Vue.use(MyPlugin, {
  someOption: true, // 可以传递一些参数
});
```

`Vue.use` 很智能，会自动阻止多次注册相同插件，即多次调用只会注册一次。

事实上，上面的 `MyPlguin` 是一个对象，里面包含了一个 `install` 属性，值是一个函数。

`Vue.use` 方法执行时，内部会去调用这个 `install` 方法。

```js
// MyPlugin.js
export defalut {
    install(Vue, options){
        // 逻辑...
    }
}
```

这个函数会接收两个参数，一个是 `Vue` 构造器，另一个就是 `Vue.use` 传递的第二个参数。我们有了这个 `Vue` 构造器后就可以做很多事情，比如：

```javascript
export defalut {
    install(Vue, options){
        // 1. 添加全局方法或属性
        Vue.myGlobalMethod = function(){}

        // 2. 添加全局指令或组件
        Vue.directive('my-directive',{});
        Vue.component('my-component',{});

        // 3. 添加全局混入
        Vue.mixin({
            beforeCreate(){}
        });

        // 4. 添加实例方法或属性
        Vue.prototype.$myMethod = function(){}
    }
}
```

根据 Vuex 的使用方式，我们知道在 `vuex.js` 内除了 install 方法外，还有一个 Store 类，其构造函数接收一个对象，这个对象里面包含用户设置的 `state` , `mutations` , `actions` 和 `modules` 。这样我们就可以写出自己的 vuex.js ，如下：

```js vuex.js
// vuex.js

class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions } = options;
  }
}

export default {
  // 暴露一个 install 方法
  install(Vue, options) {},
  // 再暴露一个 Store 类
  Store,
};
```

至此，我们的初步工作就做好了。下面我们再来看看如何将 `$store` 属性注入到所有的 vue 实例当中去的。

## 如何注入 `$store`

回顾一下我们使用 `vuex` 的过程：

```javascript
import store from './store';

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app');
```

在`store.js` 中，我们使用 `new Vuex.Store({})` 实例化出一个 `store` 对象，然后在 `new Vue(options)` 的时候将 `store` 作为 `options` 的一个属性传入其中，然后 `app` 及其所有子组件都能够通过 `this.$store` 访问到同一个 `store` 对象。

这个实现看似神奇，实际上思路非常简单。我们需要先清楚组件的生命周期以及父子组件的生命周期函数的执行顺序。

为了更好地理解 Vuex 的实现方法，我们来复习一下 Vue 实例的生命周期和执行过程。

> Vue 组件执行渲染的顺序是 `先父后子` ，渲染完成的顺序是 `先子后父` 。
>
> Vue 组件开始销毁的顺序是 `先父后子` ，销毁完成的顺序是 `先子后父` 。
>
> 结合生命周期函数来说明，加载渲染过程：
>
> **父 beforeCreate -> 父 created -> 父 beforeMount -> 子 beforeCreate -> 子 created -> 子 beforeMount -> 子 mounted -> 父 mounted** .
>
> 更新过程(如果一个状态发生变化，父子组件都需要更新的情况)：
>
> **父 beforeUpdate -> 子 beforeUpdate -> 子 updated -> 父 updated** .
>
> 销毁过程：
>
> **父 beforeDestory -> 子 beforeDestory -> 子 destoryed -> 父 destoryed** .

既然父的 beforeCreate 方法必定比子的 beforeCreate 方法先执行，那样就好办了。我们在 install 方法内添加全局混入，混入一个 beforeCreate 钩子函数。我们是在根实例上添加的 store 属性，所以一开始只有根实例有这个 store 属性（通过 `this.$options.store` 可访问），我们在根实例上添加 `$store` 属性来指向它。接着子实例的 beforeCreate 得到执行，显然它是没有 store 属性，那么我们可以把其父实例 `this.$parent` 上的 `$store` 赋给当前子实例的 `$store` 属性。这样所有实例的 beforeCreate 方法执行完以后，都有这个 `$store` 属性，并且都共享同一个，即我们一开始实例化出来的那个。

以上思路的代码实现如下：

```js
function install(Vue, options) {
  Vue.mixin({
    beforeCreate() {
      if (this.$options.store) {
        // 如果有store属性，说明是根实例
        this.$store = this.$options.store;
      } else {
        // 如果没有，就将其父实例的$store赋给它
        this.$store = this.$parent.$store;
      }
    },
  });
}
```

我们在 store/index.js 中实例化一个 store 并在 `App.vue` 中添加一个子组件，来测试一下。

```js store/index.js
import Vue from 'vue';
import Vuex from './vuex'; // 使用自己写的vuex

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    count: 0,
  },
  getters: {},
  mutations: {},
  actions: {},
});
```

```vue
<!-- app.vue -->
<template>
  <div id="app">
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
    console.log('在根实例中访问$store', this.$store); //
  },
};
</script>
```

```vue
<!-- Child.vue -->
<template>
  <div></div>
</template>

<script>
export default {
  mounted() {
    console.log('在子实例中访问$store', this.$store); //
  },
};
</script>
```

## 实现对 `state` 的访问

我们已经可以在所有组件中访问到 `$store` 对象了，现在我们需要通过 `this.$store.state.count` 得到我们设置在 `state` 上的 `count` 属性，这个需要在 Store 构造函数中完成。

```js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions } = options;
    this.state = state; //让 store 实例能访问到定义在 state 对象中的属性。
  }
}
```

我们修改 `app.vue` 和 `Child.vue` 来测试一下。

```vue
<!-- app.vue -->
<template>
  <div id="app">
    放在 app 中的count: {{ $store.state.count }}
    <Child></Child>
  </div>
</template>
<script>
import Child from '@/components/Child';

export default {
  components: {
    Child,
  },
};
</script>
```

```vue
<!-- Child.vue -->
<template>
  <div>放在 Child 中的 count: {{ $store.state.count }}</div>
</template>

<script>
export default {
  mounted() {
    setInterval(() => {
      this.$store.state.count++;
      console.log(this.$store.state.count);
    }, 1000);
  },
};
</script>
```

注意，我们在 `Child.vue` 中添加了定时器，每隔 1s 就将 count 加 1，并输出。可以发现，我们能成功获取到 count 的初始值，而且修改后能打印出正确的值，但是页面上的值确没有得到更新。这是因为 state 对象并不具有 vue 的响应式特性。那这又该如何实现呢？

## 给 state 添加响应特性

我们知道，如果我们需要数据具有响应特性，必须将数据定义在 `data` 中，但是这个 state 是在实例化 store 对象的时候设置的，而 store 是我们通过混入 beforeCreate 注入的，并不是在 data 中添加的，这样当 state 发生变化时，不会触发视图的更新。

那我们就将 state 定义在 data 当中似乎就可以解决问题，再次修改 Store 类。

```js
import Vue from 'vue';

class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions } = options;
    const vm = new Vue({
      data() {
        return {
          state,
        };
      },
    });
    this.state = vm.state;
  }
}
```

以上代码中，我们在构造函数中实例化了一个 Vue，并在其 data 中添加了 state 属性，然后将 store 实例的 state 属性指向它。果然，经这番修改后，视图中的 count 得到了更新。

实际上，在 Vue 2.6 版本的 api 中新增了一个类方法 `Vue.observable()`， 其接受一个对象，作用正是给该对象添加响应特性。因此，如使用 Vue 2.6 及以上版本，上面的代码可简化为：

```js
import Vue from 'vue';

class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性
  }
}
```

## 实现对 getters 的访问

`getters` 的作用与 `computed` 非常类似，getters 属性是一个对象，可在其内定义一些方法，方法接受两个参数，一个是 state 对象, 另一个是 getters 对象。通过 `$store.getters.xxx` 可以访问通过 xxx 方法计算出来的值，它可能会依赖 state 和 其它 getter 中的状态。

我们再次修改 Store 类的代码：

```js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });
  }
}
```

思路很简单，就是遍历 getters 中的每个键，然后通过 `Object.defineProperty` 来定义 `this.getters` 的 get 方法，让它根据当前的 `state` 和 `getters` 来计算派生状态。

注意，这里必须使用 `Object.defineProperty` 来定义 `this.getters` 的 get 方法，如果写成 `this.getters[key] = getters[key](this.state, this.getters)` ，那这个值就会按照此时的 state 和 getters 的状态计算出来，而在以后 state 变化或者 getters 变化后，拿到的值都是最初计算的值，所以需要定义 get 方法这种动态计算的方式来获取值。

我们在 store/index.js 中添加一个 getter ，然后修改 `app.vue` 对 getters 访问进行测试：

```js store/index.js
import Vue from 'vue';
import Vuex from './vuex'; // 使用自己写的vuex

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    count: 0,
  },
  getters: {
    doubleCount(state, getters) {
      return state.count * 2;
    },
  },
  mutations: {},
  actions: {},
});
```

```vue
<!-- app.vue -->
<template>
  <div id="app">
    放在 app 中的count: {{ $store.getters.doubleCount }}
    <Child></Child>
  </div>
</template>
<script>
import Child from '@/components/Child';

export default {
  components: {
    Child,
  },
};
</script>
```

页面上你将可以看到 app 组件的 count 是 child 组件 count 的 两倍。

## 实现 commit 方法提交 mutations

vuex 中有一个约定，即更改 state 需要通过 commit 提交 mutation 的方式来完成，这是为了让状态可追踪，易于调试。如我们想将 count 状态递增，需先定义一个 mutation 对象，它是一个方法，接受两个参数，一个是 state, 另一个是 payload。然后通过 `this.$store.commit('mutationName', payload)` 来完成状态的更改。

我们需在 Store 类中实现 commit 方法：

```js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions, modules } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });
  }

  commit(mutationName, payload) {
    // 根据mutationName 找到 mutation 并执行
    this.options.mutations[mutationName](this.state, payload);
  }
}
```

commit 实现非常简单，这里不过多赘述。我们在 store/index.js 中添加一个 mutation , 然后把 Child 组件中直接修改 count 的方式改为 commit 提交方式，做一下测试。

```js store/index.js
import Vue from 'vue';
import Vuex from './vuex'; // 使用自己写的vuex

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    count: 0,
  },
  getters: {
    doubleCount(state, getters) {
      return state.count * 2;
    },
  },
  mutations: {
    increament(state, payload) {
      state.count += payload.value;
    },
  },
  actions: {},
});
```

```vue Child.vue
<!-- Child.vue -->
<template>
  <div>放在 Child 中的 count: {{ $store.state.count }}</div>
</template>

<script>
export default {
  mounted() {
    setInterval(() => {
      this.$store.commit('increament', { value: 1 }); // 每 1s 增加 1
      console.log(this.$store.state.count);
    }, 1000);
  },
};
</script>
```

## 实现 dispatch 方法分发 actions

在 vuex 中还有一个约定，就是 mutation 只能是同步方法，因为如果含有异步，vuex 无法得知状态什么时候发生改变，导致难以追踪状态。因此 vuex 提供了 action，在 action 中可以定义异步方法，在异步回调时再执行 commit 提交 mutation 来完成状态的改变，这样就可以追踪状态的变化了。

其使用方式是 `this.$store.dispatch('actionName', payload)` 。而 action 函数接受一个与 store 实例具有相同方法和属性的 context 对象，因此可以调用 `context.commit` 来提交一个 mutation, 或者通过 `context.state` 和 `context.getters` 来获取状态。但要注意这个 context 对象并不是 store 实例本身。

我们要继续修改我们定义的 Store 类，添加一个 dispatch 方法：

```js vuex.js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions, modules } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });
  }

  commit(mutationName, payload) {
    // 根据mutationName 找到 mutation 并执行
    this.options.mutations[mutationName](this.state, payload);
  }

  dispatch(actionName, payload) {
    // 根据 actionName 找到 action 并执行
    this.options.actions[actionName](
      {
        state: this.state,
        getters: this.getters,
        commit: this.commit.bind(this), // 注意，这里要指定this
      },
      payload
    );
  }
}
```

我们在 store/index.js 中添加一个 action， 并在 Child 组件中使用 dispatch 来分发这个 action。

```js store/index.js
import Vue from 'vue';
import Vuex from './vuex'; // 使用自己写的vuex

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    count: 0,
  },
  getters: {
    doubleCount(state, getters) {
      return state.count * 2;
    },
  },
  mutations: {
    increament(state, payload) {
      state.count += payload.value;
    },
  },
  actions: {
    increamentAsync({ commit }, payload) {
      setInterval(() => {
        commit('increament', payload);
      }, 3000);
    },
  },
});
```

```vue Child.vue
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
```

## 实现 modules

使用单一状态树，应用所有状态集中到一个比较大的对象。随着应用变得复杂，store 对象就会变得十分臃肿。 vuex 的 store 还有一个重要的属性 `modules` ，用它可以将 store 分割成模块。每个模块都有自己的state、mutations、actions、getters 甚至是 modules （再次模块划分）。

我们先看看 vuex 的 modules 是如何使用的：

```js store/index.js
export default new Vuex.Store({
  modules: {
    a: {
      modules:{
          c:{
              state:{
                  cCount:300
              }
          }
      },
      state: {
        aCount: 100,
      },
    },
    b: {
      state: {
        bCount: 200,
      },
    },
  },
  state: {
    count: 0,
  },
  // ...
});
```

我们定义了两个子模块 a 和 b，并在其内分别添加了 aCount 和 bCount 两个状态，而且还在 a 模块中定义了 c 模块，其内有一个 cCount 状态。在 App.vue 中添加获取 aCount ，bCount，cCount 的代码：

```vue
<!-- app.vue -->
<template>
  <div id="app">
    <p>a module state aCount:{{$store.state.a.aCount}}</p>
    <p>b module state bCount:{{$store.state.b.bCount}}</p>
    <p>c module state cbCount:{{$store.state.a.c.cCount}}</p>
  </div>
</template>
```

要能实现这种访问，就 `a` 和 `b` 而言，就是在 state 上添加 `a`，`b` 属性 ，值为 `a` 模块定义的 state 和 `b` 模块定义的state。而就 `c` 而言，就是在 `state.a` 上添加一个 `c` 属性，其值为 `c` 模块定义的state。光添加还不够，因为这样并不会具有响应特性，所以我们需要借助 `Vue.set()` 这个方法来添加属性。

我们在 Store 类中添加一个注册模块的方法 `register` ，这个方法接收三个参数，第一个是用户传入的 modules , 第二个接收一个数组，第三个参数则是根模块的 state 。

我们重点解释一下第二个参数，这个数组将用来表示当前注册模块的路径，注册模块是从根模块一直递归往下注册的，比如一开始从根模块注册，我们会传一个空的数组，在注册根模块时，会找到了两个子模块 `a` 和 `b`, 这就会依次将它们注册，如果发现子模块中还包含子模块，就会再次调用 `register` 方法，而传的第二个参数就会是在原来空数组的基础上中添加一个模块的名字，如 `['a']`，第二次调用 `register` 方法时，会在 a 的子模块中找到一个 `c` 模块，此时我们要添加一个 c 属性到一个地方，其实就是 `state.a` ，但是此时`register` 接收的三个参数中没有这个 state.a ，这时就需要用到了这个 path 数组，有了这个 path ，我们才能从 rootState 取到 a 。

现在我们先根据现有的思路，完成 `register` 方法，并实现对各模块中 state 的注册：

```js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions, modules } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });

    // 注册模块
    this.register(modules, [], this.state);
  }

  register(modules, path, rootState) {
    // 遍历 modules 的 key
    Object.keys(modules).forEach((modKey) => {
      // 这里 modKey 将会是 a b c
      const module = modules[modKey]; // 获取当前模块对象
      const moduleState = module.state; // 获取当前模块的 state 对象
      // a b 都是在根 state 上可以设置，但是c 需要在 a 上里面设置
      // 所以要计算出当前模块父 state
      // 如果将当前模块 是 a 或 b，则需设置到根 state, 此时的path是[]空数组，这时的parentState 是 this.rootState
      // 如果当前模块 是 c ，需设置在 a 上，此时的 path 是[a],那么 parentState应该是 this.rootState.a
      const parentState = path.reduce((cur, next) => cur[next], rootState);
      Vue.set(parentState, modKey, moduleState);
      // 如果当前模块还有 modules 属性, 说明还有子模块
      if (module.modules) {
        // 则需要递归执行注册函数
        this.register(module.modules, path.concat(modKey), rootState);
      }
    });
  }
}
```

我们接着完成对模块中 getters 的注册。我们先在 a 模块中定义一个 getters, 然后在 App.vue 中访问这个 getters：

```js store/index.js
export default new Vuex.Store({
  modules: {
    a: {
      modules: {
        c: {
          state: {
            cCount: 300,
          },
        },
      },
      state: {
        aCount: 100,
      },
      // 添加了一个 getter
      getters: {
        aCountPlusCount(state, getters, rootState) {
          return rootState.count + state.aCount;
        },
      },
    },
    b: {
      state: {
        bCount: 200,
      },
    },
  },
  state: {
    count: 0,
  },
  //...
});
```

```vue App.vue
<!-- app.vue -->
<template>
  <div id="app">
    <p>a module state aCount:{{$store.state.a.aCount}}</p>
    <p>b module state bCount:{{$store.state.b.bCount}}</p>
    <p>c module state cCount:{{$store.state.a.c.cCount}}</p>
    <p>a module getter aCountPlusCount:{{$store.getters.aCountPlusCount}}</p>
    <Child></Child>
  </div>
</template>
```

可见，模块中的 getters 最终都被添加到 `$store.getters` 上，所以代码很简单，只需在注册过程中把模块的 getters 添加上即可：

```js
register(modules, path, rootState) {
    Object.keys(modules).forEach((modKey) => {
      const module = modules[modKey]; // 获取当前模块对象
      const moduleState = module.state; // 获取当前模块的 state 对象
      const parentState = path.reduce((cur, next) => cur[next], rootState);
      Vue.set(parentState, modKey, moduleState);

      // 获取当前模块的 getters 对象
      const moduleGetters = module.getters;
      if (moduleGetters) { // 只有存在才添加
        Object.keys(moduleGetters).forEach((key) => {
          Object.defineProperty(this.getters, key, {
            get: () => moduleGetters[key](moduleState, this.getters, rootState),
             // 这里会传三个值，模块中的 state ，store 的 getters, 以及根模块中的 state
          });
        });
      }

      // 如果当前模块还有 modules 属性, 说明还有子模块
      if (module.modules) {
        // 则需要递归执行注册函数
        this.register(module.modules, path.concat(modKey), rootState);
      }
    });
}
```

接着是 mutations 的注册，我们先在 a 模块中添加一个和根模块同名的 mutation increament， 然后在 `App.vue` 中提交这个 mutation：

```js store/index.js
export default new Vuex.Store({
  modules: {
    a: {
      // ...
      state: {
        aCount: 100,
      },
      // 添加了一个 getter
      getters: {
        aCountPlusCount(state, getters, rootState) {
          return rootState.count + state.aCount;
        },
      },
      // 添加了一个 mutation
      mutations: {
        increament(state, payload) {
          state.aCount += payload.value;
        },
      },
    },
    //...
  },
  state: {
    count: 0,
  },
  // 根模块也有一个同名的 mutation
  mutations: {
      increament(state, payload) {
          state.count += payload.value;
      },
  },
  //...
});
```

```vue App.vue
<!-- app.vue -->
<template>
  <div id="app">
    <p>a module state aCount:{{$store.state.a.aCount}}</p>
    <p>b module state bCount:{{$store.state.b.bCount}}</p>
    <p>c module state cCount:{{$store.state.a.c.cCount}}</p>
    <p>a module getter aCountPlusCount:{{$store.getters.aCountPlusCount}}</p>
    <p>root module state count:{{$store.state.count}}</p>
    <!-- <Child></Child> -->
  </div>
</template>
<script>
import Child from '@/components/Child';

export default {
  components: {
    Child,
  },
  mounted() {
    setInterval(()=>{
        this.$store.commit('increament', {
            value:1,
        });
    },1000)
  },
};
</script>
```

我们发现在提交 `increament` 这个 mutation 后，a 模块和根模块中的这个 mutation 方法都会执行，那我们需要修改 `commit` 方法。之前的 `commit` 方法是认为根据 mutationName 只会找到一个 mutation 方法，而实际上应该会找到多个，并用数组将执行方法存起来，并依次调用相应的方法。

```js
class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions, modules } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });

    // this.mutations[key]是一个数组,数组中每个元素是一个函数
    this.mutations = {};
    Object.keys(mutations).forEach((key) => {
      this.mutations[key] = [
        (payload) => {
          mutations[key](this.state, payload);
        },
      ];
    });
    // 注册模块
    this.register(modules, [], this.state);
  }

  register(modules, path, rootState) {
    // 遍历 modules 的 key
    Object.keys(modules).forEach((modKey) => {
      const module = modules[modKey]; // 获取当前模块对象
      const moduleState = module.state; // 获取当前模块的 state 对象
      const parentState = path.reduce((cur, next) => cur[next], rootState);
      Vue.set(parentState, modKey, moduleState);

      // 获取当前模块的 getters 对象
      const moduleGetters = module.getters;
      if (moduleGetters) {
        Object.keys(moduleGetters).forEach((key) => {
          Object.defineProperty(this.getters, key, {
            get: () => moduleGetters[key](moduleState, this.getters, rootState),
          });
        });
      }

      // 获取当前模块的 mutations
      const moduleMutations = module.mutations;
      if (moduleMutations) {
        Object.keys(moduleMutations).forEach((key) => {
          if (this.mutations[key]) {
            this.mutations[key].push((payload) => {
              moduleMutations[key](moduleState, payload);
            });
          }
        });
      }

      // 如果当前模块还有 modules 属性, 说明还有子模块
      if (module.modules) {
        // 则需要递归执行注册函数
        this.register(module.modules, path.concat(modKey), rootState);
      }
    });
  }

  commit(mutationName, payload) {
    // 根据mutationName 找到 mutation 并执行
    this.mutations[mutationName].forEach((mutationFunc) => {
      mutationFunc(payload);
    });
  }

  dispatch(actionName, payload) {
    // 根据 actionName 找到 action 并执行
    this.options.actions[actionName](
      {
        state: this.state,
        getters: this.getters,
        commit: this.commit.bind(this), // 注意，这里要指定this
      },
      payload
    );
  }
}
```

上面代码中，`this.mutations[key]` 是一个数组，数组中的每个元素是一个可执行的函数，在注册模块时，遍历模块的 mutations 的 key 值，然后根据 key 来判断 `this.mutations[key]` 是否已经存在，如果不存在，则创建一个新组数，如果存在，则在原数组中添加一个新的函数，该函数中实际执行的是当前模块指定的 mutation 方法，并传入了当前模块的 state 和用户传入 payload 两个参数。

actions 和 mutations 类似，只需参考 mutations 的改造方式即可。官方 api 中 store 实例有一个 registerModule 方法，用来动态注册模块，实际上就是调用 register 方法就可实现，这里把这个方法加上，完整代码如下：

```js
import Vue from 'vue';

class Store {
  constructor(options) {
    this.options = options;
    const { state, getters, mutations, actions, modules } = options;
    this.state = Vue.observable(state); // 通过 observable api 给对象添加响应特性

    // 实现通过 getter 来访问派生状态
    this.getters = {};
    Object.keys(getters).forEach((key) => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](this.state, this.getters),
      });
    });

    this.mutations = {};
    Object.keys(mutations).forEach((key) => {
      this.mutations[key] = [
        (payload) => {
          mutations[key](this.state, payload);
        },
      ]; // this.mutations[key]是一个数组
    });

    this.actions = {};
    Object.keys(actions).forEach((key) => {
      this.actions[key] = [
        (payload) => {
          actions[key](
            {
              state: this.state,
              getters: this.getters,
              commit: this.commit.bind(this), // 注意，这里要指定this
            },
            payload
          );
        },
      ]; // this.mutations[key]是一个数组
    });

    // 注册模块
    this.register(modules, [], this.state);
  }

  register(modules, path, rootState) {
    // 遍历 modules 的 key
    Object.keys(modules).forEach((modKey) => {
      // 这里 modKey 将会是 a b c
      const module = modules[modKey]; // 获取当前模块对象
      const moduleState = module.state; // 获取当前模块的 state 对象
      // a b 都是在根 state 上可以设置，但是c 需要在 a 上里面设置
      // 所以要计算出当前模块父 state
      // 如果将当前模块 是 a 或 b，则需设置到根 state, 此时的path是[]空数组，这时的parentState 是 this.rootState
      // 如果当前模块 是 c ，需设置在 a 上，此时的 path 是[a],那么 parentState应该是 this.rootState.a
      const parentState = path.reduce((cur, next) => cur[next], rootState);
      Vue.set(parentState, modKey, moduleState);

      // 获取当前模块的 getters 对象
      const moduleGetters = module.getters;
      if (moduleGetters) {
        Object.keys(moduleGetters).forEach((key) => {
          Object.defineProperty(this.getters, key, {
            get: () => moduleGetters[key](moduleState, this.getters, rootState),
          });
        });
      }

      const moduleMutations = module.mutations;
      if (moduleMutations) {
        Object.keys(moduleMutations).forEach((key) => {
          if (this.mutations[key]) {
            this.mutations[key].push((payload) => {
              moduleMutations[key](moduleState, payload);
            });
          }
        });
      }

      const moduleActions = module.actions;
      if (moduleActions) {
        Object.keys(moduleActions).forEach((key) => {
          if (this.actions[key]) {
            this.actions[key].push((payload) => {
              moduleActions[key](
                {
                  state: this.state,
                  getters: this.getters,
                  commit: this.commit.bind(this), // 注意，这里要指定this
                  rootState,
                },
                payload
              );
            });
          }
        });
      }

      // 如果当前模块还有 modules 属性, 说明还有子模块
      if (module.modules) {
        // 则需要递归执行注册函数
        this.register(module.modules, path.concat(modKey), rootState);
      }
    });
  }

  registerModule(path, modules) {
    this.register(modules, path, this.state);
  }

  commit(mutationName, payload) {
    // 根据mutationName 找到 mutation 并执行
    this.mutations[mutationName].forEach((mutationFunc) => {
      mutationFunc(payload);
    });
  }

  dispatch(actionName, payload) {
    // 根据 actionName 找到 action 并执行
    this.options.actions[actionName](
      {
        state: this.state,
        getters: this.getters,
        commit: this.commit.bind(this), // 注意，这里要指定this
      },
      payload
    );
  }
}
export default {
  install(_Vue, options) {
    _Vue.mixin({
      beforeCreate() {
        if (this.$options.store) {
          // 如果有store属性，说明是根实例
          this.$store = this.$options.store;
        } else {
          // 如果没有，就将其父实例的$store赋给它
          this.$store = this.$parent.$store;
        }
      },
    });
  },
  Store,
};
```

至此，vuex 的核心功能已完成了。源码见：

回顾一下之前的过程，其实 vuex 的核心就是一个 store 对象，这个对象中包含了以下内容：

- **state和getter**，用来定义状态和计算派生状态；
- **mutation和action**，用来改变状态，修改状态会自动触发视图更新，mutation 是同步方法，action可执行异步方法；
- **module**，用于对状态进行**模块化分割**；

除此之外，vuex 还包含了的 module, 以及提供了**mapState,mapGetters,mapActions,mapMutations**辅助函数**方便开发者**在实例中**处理store对象**。
