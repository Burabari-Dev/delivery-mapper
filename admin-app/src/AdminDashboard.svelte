<script>
    import { onMount, onDestroy } from 'svelte';
    import { db } from './lib/firebase.js';
    import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
    import Map from './lib/components/Map.svelte';

    let deliveries = $state([]);
    let agents = $state([]);
    let agentLocations = $state({});
    
    // Map states
    let mapCenter = $state();
    let mapZoom = $state(12);
    let mapMarkers = $state([]);
    let selectedAgents = $state({});

    let unsubDeliveries;
    let unsubAgents;
    let unsubAgentLocations;

    onMount(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!mapCenter) {
                        mapCenter = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                    }
                },
                (error) => console.error("Error getting location", error),
                { enableHighAccuracy: true }
            );
        }

        // Fetch all non-completed deliveries
        const qDeliveries = query(collection(db, "deliveries"), where("status", "!=", "completed"));
        unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
            const list = [];
            snapshot.forEach(d => {
                list.push({ id: d.id, ...d.data() });
            });
            deliveries = list;
            updateMapMarkers();
        });

        // Fetch agents
        const qAgents = query(collection(db, "users"), where("role", "==", "agent"));
        unsubAgents = onSnapshot(qAgents, (snapshot) => {
            const list = [];
            snapshot.forEach(a => {
                list.push({ id: a.id, ...a.data() });
            });
            agents = list;
        });

        // Fetch all agent locations
        unsubAgentLocations = onSnapshot(collection(db, "agent_locations"), (snapshot) => {
            const locs = {};
            snapshot.forEach(doc => {
                locs[doc.id] = doc.data().location;
            });
            agentLocations = locs;
            updateMapMarkers();
        });
    });

    onDestroy(() => {
        if (unsubDeliveries) unsubDeliveries();
        if (unsubAgents) unsubAgents();
        if (unsubAgentLocations) unsubAgentLocations();
    });

    function updateMapMarkers() {
        let markers = [];
        
        // Add delivery destinations
        deliveries.forEach(d => {
            markers.push({
                position: { lat: d.destination.lat, lng: d.destination.lng },
                title: `Delivery: ${d.status}`,
                label: "D",
                color: "red"
            });
        });

        // Add agents
        Object.keys(agentLocations).forEach(agentId => {
            markers.push({
                position: agentLocations[agentId],
                title: `Agent`,
                label: "A",
                color: "blue"
            });
        });

        mapMarkers = markers;
        
        if (!mapCenter && markers.length > 0) {
            mapCenter = markers[0].position;
        }
    }

    async function assignAgent(deliveryId, agentId) {
        if (!agentId) return;
        try {
            await updateDoc(doc(db, "deliveries", deliveryId), {
                agentId: agentId,
                status: 'assigned'
            });
        } catch (e) {
            console.error(e);
            alert("Failed to assign agent");
        }
    }
</script>

<div class="dashboard-layout">
    <div class="sidebar glass-card">
        <h3>Active Deliveries</h3>
        
        {#if deliveries.length === 0}
            <p class="empty-state">No active deliveries.</p>
        {:else}
            <ul class="delivery-list">
                {#each deliveries as delivery}
                    <li class="delivery-item">
                        <div class="status {delivery.status}">{delivery.status.replace('_', ' ')}</div>
                        <div class="address">{delivery.destination.address}</div>
                        
                        {#if delivery.status === 'pending'}
                            <div class="assign-section">
                                <select bind:value={selectedAgents[delivery.id]}>
                                    <option value="">Select Agent...</option>
                                    {#each agents as agent}
                                        <option value={agent.id}>{agent.email}</option>
                                    {/each}
                                </select>
                                <button onclick={() => {
                                    assignAgent(delivery.id, selectedAgents[delivery.id]);
                                }}>Assign</button>
                            </div>
                        {:else}
                            <div class="assigned-info">
                                Assigned to: {agents.find(a => a.id === delivery.agentId)?.email || 'Unknown'}
                            </div>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <div class="main-content">
        {#if mapCenter}
            <Map center={mapCenter} zoom={mapZoom} markers={mapMarkers} />
        {:else}
            <div class="glass-card" style="margin: auto; text-align: center; padding: 3rem;">
                <h2>Acquiring Location...</h2>
                <p>Please allow location access or wait for active deliveries to display the map.</p>
            </div>
        {/if}
    </div>
</div>

<style>
    .dashboard-layout {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    .sidebar {
        width: 400px;
        margin: 1rem 0 1rem 1rem;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 1rem 1rem 1rem 0;
    }
    .empty-state {
        color: var(--text-secondary);
        font-size: 0.875rem;
    }
    .delivery-list {
        list-style: none;
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .delivery-item {
        background: rgba(0,0,0,0.2);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.05);
    }
    .status {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        display: inline-block;
        margin-bottom: 0.5rem;
    }
    .status.pending { background: var(--warning); color: #000; }
    .status.assigned { background: var(--accent-color); }
    .status.in_transit { background: var(--success); }
    .status.completed { background: rgba(255,255,255,0.2); }
    
    .address {
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
    .assign-section {
        display: flex;
        gap: 0.5rem;
    }
    .assign-section select {
        flex: 1;
        padding: 0.5rem;
    }
    .assign-section button {
        padding: 0.5rem 1rem;
    }
    .assigned-info {
        font-size: 0.875rem;
        color: var(--text-secondary);
        background: rgba(255,255,255,0.05);
        padding: 0.5rem;
        border-radius: 4px;
    }
    h3 {
        margin-bottom: 1rem;
    }
</style>
