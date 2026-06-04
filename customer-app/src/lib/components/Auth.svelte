<script>
    import { login, register } from '../auth.svelte.js';
    import { db } from '../firebase.js';
    import { doc, setDoc } from 'firebase/firestore';

    let { role = "customer" } = $props();

    let isLogin = $state(true);
    let email = $state('');
    let password = $state('');
    let errorMsg = $state('');
    let loading = $state(false);

    async function handleSubmit(e) {
        e.preventDefault();
        loading = true;
        errorMsg = '';
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                const userCred = await register(email, password);
                await setDoc(doc(db, 'users', userCred.user.uid), {
                    email: email,
                    role: role,
                    createdAt: new Date()
                });
            }
        } catch (err) {
            errorMsg = err.message;
        } finally {
            loading = false;
        }
    }
</script>

<div class="auth-wrapper">
    <div class="glass-card auth-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p class="subtitle">{role.charAt(0).toUpperCase() + role.slice(1)} Portal</p>
        
        {#if errorMsg}
            <div class="error-msg">{errorMsg}</div>
        {/if}

        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="email">Email</label>
                <input id="email" type="email" bind:value={email} required />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input id="password" type="password" bind:value={password} required />
            </div>
            <button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
            </button>
        </form>

        <div class="toggle-mode">
            <button class="text-btn" onclick={() => isLogin = !isLogin}>
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
        </div>
    </div>
</div>

<style>
    .auth-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100%;
        padding: 1rem;
    }
    .auth-card {
        width: 100%;
        max-width: 400px;
        text-align: center;
    }
    .subtitle {
        color: var(--text-secondary);
        margin-bottom: 2rem;
    }
    form {
        text-align: left;
    }
    button[type="submit"] {
        width: 100%;
        margin-top: 1rem;
    }
    .toggle-mode {
        margin-top: 1.5rem;
    }
    .text-btn {
        background: transparent;
        color: var(--accent-color);
        box-shadow: none;
        padding: 0;
        font-size: 0.875rem;
    }
    .text-btn:hover {
        background: transparent;
        color: var(--text-primary);
        box-shadow: none;
        transform: none;
    }
    .error-msg {
        background: rgba(239, 68, 68, 0.2);
        color: var(--danger);
        padding: 0.75rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 0.875rem;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }
</style>
