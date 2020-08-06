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
