<script>
    import { userState, logout } from './lib/auth.svelte.js';
    import Auth from './lib/components/Auth.svelte';
    import AgentDashboard from './AgentDashboard.svelte';

    let { user, loading } = $derived(userState);
</script>

<main class="app-container">
    {#if loading}
        <div class="loader-container">
            <div class="loader"></div>
            <p>Loading application...</p>
        </div>
    {:else if !user}
        <Auth role="agent" />
    {:else}
        <header class="top-bar">
            <h1>DeliveryMapper <span>Agent</span></h1>
            <div class="user-info">
                <span>{user.email}</span>
                <button class="logout-btn" onclick={logout}>Logout</button>
            </div>
        </header>
        <AgentDashboard {user} />
    {/if}
</main>

<style>
    .loader-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
    .loader {
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top: 4px solid var(--accent-color);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    h1 {
        font-size: 1.5rem;
    }
    h1 span {
        color: var(--accent-color);
        font-weight: 300;
    }
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .logout-btn {
        background-color: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    }
    .logout-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
</style>
