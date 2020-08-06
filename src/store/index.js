import Vue from 'vue';
import Vuex from './vuex'; // 使用自己写的vuex

Vue.use(Vuex);

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
      getters: {
        aCountPlusCount(state, getters, rootState) {
          return rootState.count + state.aCount;
        },
      },
      mutations: {
        increament(state, payload) {
          state.aCount += payload.value;
        },
      },
      actions: {
        increamentAsync({ state, commit, rootState }, payload) {
          setInterval(() => {
            commit('increament', payload);
          }, 3000);
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
