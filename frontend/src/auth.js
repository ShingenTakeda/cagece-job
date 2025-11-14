import { writable } from 'svelte/store';

const createAuth = () => {
    const { subscribe, set } = writable({ token: null });

    return {
        subscribe,
        login: (token) => {
            localStorage.setItem('token', token);
            set({ token });
        },
        logout: () => {
            localStorage.removeItem('token');
            set({ token: null });
        },
        init: () => {
            const token = localStorage.getItem('token');
            if (token) {
                set({ token });
            }
        }
    };
};

export const auth = createAuth();
