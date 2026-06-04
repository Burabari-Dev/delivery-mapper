import { auth } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const userState = $state({
    user: null,
    loading: true
});

onAuthStateChanged(auth, (u) => {
    userState.user = u;
    userState.loading = false;
});

export const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const register = async (email, password) => {
    return await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
    return await signOut(auth);
};
