import { create } from 'zustand';
import axios from 'axios';

const useStore = create((set) => ({
  tasks: [],
  fetchTasks: async () => {
    const response = await axios.get('/api/task-management');
    set({ tasks: response.data });
  },
}));

export { useStore };