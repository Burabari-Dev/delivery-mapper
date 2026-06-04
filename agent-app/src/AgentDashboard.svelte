<script>
    import { onMount, onDestroy } from 'svelte';
    import { db } from './lib/firebase.js';
    import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
    import { mapLoader } from './lib/maps.js';
    import Map from './lib/components/Map.svelte';

    let { user } = $props();

    let deliveries = $state([]);
    let agentLocation = $state(null);
    let watchId = null;

    // Map states
    let mapCenter = $state();
    let mapZoom = $state(13);
    let mapMarkers = $state([]);
    let route = $state(null);

    let unsubDeliveries;

    onMount(() => {
        // Start watching location
        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    agentLocation = loc;
                    
                    if (!route) {
                        mapCenter = loc;
                    }
                    
                    await setDoc(doc(db, "agent_locations", user.uid), {
                        location: loc,
                        updatedAt: new Date()
                    }, { merge: true });

                    updateOptimizedRoute();
                },
                (error) => console.error("Error watching location", error),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        } else {
            alert("Geolocation is not supported by your browser");
        }

        // Fetch assigned deliveries
        const q = query(collection(db, "deliveries"), where("agentId", "==", user.uid));
        unsubDeliveries = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(d => {
                list.push({ id: d.id, ...d.data() });
            });
            deliveries = list.filter(d => d.status !== 'completed');
            updateOptimizedRoute();
        });
    });

    onDestroy(() => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (unsubDeliveries) unsubDeliveries();
    });

    async function updateOptimizedRoute() {
        if (!agentLocation || deliveries.length === 0) {
            if (agentLocation) {
                mapMarkers = [{ position: agentLocation, title: "Me", label: "A", color: "blue" }];
            }
            route = null;
            return;
        }

        const { DirectionsService } = await mapLoader.importLibrary("routes");
        const directionsService = new DirectionsService();

        const destinations = deliveries.map(d => ({
            location: { lat: d.destination.lat, lng: d.destination.lng },
            stopover: true
        }));

        const endDestination = destinations.pop();

        directionsService.route({
            origin: agentLocation,
            destination: endDestination.location,
            waypoints: destinations,
            optimizeWaypoints: true,
            travelMode: 'DRIVING'
        }, (response, status) => {
            if (status === 'OK') {
                route = response;
                
                let markers = [{ position: agentLocation, title: "Me", label: "A", color: "blue" }];
                
                let orderedDeliveries = [];
                const order = response.routes[0].waypoint_order;
                
                order.forEach(index => {
                    orderedDeliveries.push(deliveries[index]);
                });
                orderedDeliveries.push(deliveries[deliveries.length - 1]); // the end destination
                
                orderedDeliveries.forEach((d, index) => {
                    markers.push({
                        position: { lat: d.destination.lat, lng: d.destination.lng },
                        title: d.destination.address,
                        label: (index + 1).toString(),
                        color: "red"
                    });
                });
                mapMarkers = markers;
            } else {
                console.error("Directions request failed", status);
            }
        });
    }

    async function updateStatus(deliveryId, newStatus) {
        try {
            await updateDoc(doc(db, "deliveries", deliveryId), {
                status: newStatus
            });
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    }
</script>

<div class="dashboard-layout">
    <div class="sidebar glass-card">
        <h3>Assigned Deliveries</h3>
        
        {#if deliveries.length === 0}
            <p class="empty-state">No assigned deliveries.</p>
        {:else}
            <ul class="delivery-list">
                {#each deliveries as delivery}
                    <li class="delivery-item">
                        <div class="status {delivery.status}">{delivery.status.replace('_', ' ')}</div>
                        <div class="address">{delivery.destination.address}</div>
                        
                        <div class="actions">
                            {#if delivery.status === 'assigned'}
                                <button onclick={() => updateStatus(delivery.id, 'in_transit')}>Start Transit</button>
                            {:else if delivery.status === 'in_transit'}
                                <button class="btn-success" onclick={() => updateStatus(delivery.id, 'completed')}>Mark Completed</button>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <div class="main-content">
        {#if agentLocation}
            <Map center={mapCenter} zoom={mapZoom} markers={mapMarkers} {route} />
        {:else}
            <div class="glass-card" style="margin: auto; text-align: center; padding: 3rem;">
                <h2>Acquiring Location...</h2>
                <p>Please allow location access to continue.</p>
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
        width: 350px;
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
    .status.assigned { background: var(--accent-color); }
    .status.in_transit { background: var(--warning); color: #000; }
    
    .address {
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
    .actions button {
        width: 100%;
    }
    .actions .btn-success {
        background-color: var(--success);
        box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
    }
    .actions .btn-success:hover {
        background-color: #059669;
    }
    h3 {
        margin-bottom: 1rem;
    }
</style>
