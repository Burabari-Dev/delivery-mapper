<script>
    import { onMount, onDestroy } from "svelte";
    import { db } from "./lib/firebase.js";
    import {
        collection,
        query,
        where,
        onSnapshot,
        addDoc,
        serverTimestamp,
        doc,
    } from "firebase/firestore";
    import { mapLoader } from "./lib/maps.js";
    import Map from "./lib/components/Map.svelte";

    let { user } = $props();

    let deliveries = $state([]);
    let activeDelivery = $state(null);
    let addressInput = $state("");
    let autocomplete;
    let inputRef;

    // Map states
    let mapCenter = $state();
    let mapZoom = $state(13);
    let mapMarkers = $state([]);
    let route = $state(null);

    let unsubscribe = () => {};
    let agentUnsubscribe = null;
    let agentLocation = $state(null);

    onMount(async () => {
        // Setup Autocomplete
        const { Autocomplete } = await mapLoader.importLibrary("places");
        autocomplete = new Autocomplete(inputRef, {
            fields: ["geometry", "name", "formatted_address"],
            types: ["address"],
        });

        // Listen for deliveries
        const q = query(
            collection(db, "deliveries"),
            where("customerId", "==", user.uid),
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            // Sort by latest first
            list.sort(
                (a, b) =>
                    (b.createdAt?.toMillis() || 0) -
                    (a.createdAt?.toMillis() || 0),
            );
            deliveries = list;

            // Set active delivery (first one that isn't completed)
            const newActive = deliveries.find((d) => d.status !== "completed");

            // Only update map if active delivery changed
            if (
                newActive?.id !== activeDelivery?.id ||
                newActive?.agentId !== activeDelivery?.agentId
            ) {
                activeDelivery = newActive;
                setupAgentListener();
            } else {
                activeDelivery = newActive;
                updateRouteAndMarkers();
            }
        });
    });

    onDestroy(() => {
        unsubscribe();
        if (agentUnsubscribe) agentUnsubscribe();
    });

    function setupAgentListener() {
        if (agentUnsubscribe) {
            agentUnsubscribe();
            agentUnsubscribe = null;
        }
        agentLocation = null;

        if (activeDelivery && activeDelivery.agentId) {
            agentUnsubscribe = onSnapshot(
                doc(db, "agent_locations", activeDelivery.agentId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        agentLocation = docSnap.data().location;
                        updateRouteAndMarkers();
                    }
                },
            );
        } else {
            updateRouteAndMarkers();
        }
    }

    async function updateRouteAndMarkers() {
        if (!activeDelivery) {
            mapMarkers = [];
            route = null;
            return;
        }

        const dest = activeDelivery.destination;
        let newMarkers = [
            {
                position: { lat: dest.lat, lng: dest.lng },
                title: "Destination",
                label: "D",
                color: "#FF0000",
            },
        ];

        // Default center to destination
        mapCenter = { lat: dest.lat, lng: dest.lng };

        if (agentLocation) {
            newMarkers.push({
                position: agentLocation,
                title: "Agent",
                label: "A",
                color: "#0000FF",
            });

            const { DirectionsService } =
                await mapLoader.importLibrary("routes");
            const directionsService = new DirectionsService();

            directionsService.route(
                {
                    origin: agentLocation,
                    destination: { lat: dest.lat, lng: dest.lng },
                    travelMode: "DRIVING",
                },
                (response, status) => {
                    if (status === "OK") {
                        route = response;
                    } else {
                        console.error(
                            "Directions request failed due to " + status,
                        );
                        route = null;
                    }
                },
            );
        } else {
            route = null;
        }

        mapMarkers = newMarkers;
    }

    async function requestDelivery() {
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) {
            alert("Please select a valid address from the dropdown.");
            return;
        }

        const newDelivery = {
            customerId: user.uid,
            agentId: null,
            status: "pending",
            destination: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address || place.name,
            },
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, "deliveries"), newDelivery);
            addressInput = "";
            inputRef.value = "";
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to request delivery.");
        }
    }
</script>

<div class="dashboard-layout">
    <div class="sidebar glass-card">
        <h3>Request Delivery</h3>
        <div class="form-group">
            <input
                bind:this={inputRef}
                bind:value={addressInput}
                placeholder="Enter delivery address..."
            />
        </div>
        <button onclick={requestDelivery}>Request Now</button>

        <h3 style="margin-top: 2rem;">Your Deliveries</h3>
        {#if deliveries.length === 0}
            <p class="empty-state">No deliveries yet.</p>
        {:else}
            <ul class="delivery-list">
                {#each deliveries as delivery}
                    <li
                        class="delivery-item {activeDelivery?.id === delivery.id
                            ? 'active'
                            : ''}"
                    >
                        <div class="status {delivery.status}">
                            {delivery.status.replace("_", " ")}
                        </div>
                        <div class="address">
                            {delivery.destination.address}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>

    <div class="main-content">
        {#if activeDelivery}
            <div class="tracking-info glass-card">
                <div>
                    <h4>Tracking Active Delivery</h4>
                    <p>
                        Status: <strong
                            style="color: var(--accent-color); text-transform: uppercase;"
                            >{activeDelivery.status.replace("_", " ")}</strong
                        >
                    </p>
                </div>
                <div>
                    {#if activeDelivery.agentId}
                        <p>
                            Agent assigned. {route
                                ? `ETA: ${route.routes[0].legs[0].duration.text}`
                                : "Calculating ETA..."}
                        </p>
                    {:else}
                        <p>Waiting for admin to assign an agent.</p>
                    {/if}
                </div>
            </div>
            {#if mapCenter}
                <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    markers={mapMarkers}
                    {route}
                />
            {:else}
                <div
                    class="glass-card"
                    style="margin: auto; text-align: center; padding: 3rem;"
                >
                    <h2>Loading Map...</h2>
                    <p>Preparing tracking information.</p>
                </div>
            {/if}
        {:else}
            <div
                class="glass-card"
                style="margin: 1rem; text-align: center; padding: 3rem;"
            >
                <h2>No active deliveries</h2>
                <p>Request a delivery from the sidebar to see it on the map.</p>
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
        padding: 0 1rem 1rem 0;
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
        gap: 0.75rem;
    }
    .delivery-item {
        background: rgba(0, 0, 0, 0.2);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .delivery-item.active {
        border-color: var(--accent-color);
        background: rgba(59, 130, 246, 0.1);
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
    .status.pending {
        background: var(--warning);
        color: #000;
    }
    .status.assigned {
        background: var(--accent-color);
    }
    .status.in_transit {
        background: var(--success);
    }
    .status.completed {
        background: rgba(255, 255, 255, 0.2);
    }

    .address {
        font-size: 0.875rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .tracking-info {
        margin: 1rem 1rem 0 1rem;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    h3,
    h4 {
        margin-bottom: 1rem;
    }
</style>
