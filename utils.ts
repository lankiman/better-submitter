export const createStateManager = <T>(initialState: T | null = null) => {
  let state = initialState;
  //   const subscribers: Array<(state: T | null) => unknown> = [];
  const subscribers = new Set<(state: T | null) => unknown>();
  return {
    getState() {
      return state;
    },
    setState(newState: T) {
      state = newState;
      subscribers.forEach((fn) => fn(state));
    },

    subscribe(fn: () => unknown) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
    resetState() {
      this.setState(initialState);
    }
  };
};
