<script>
    import { onMount } from "svelte";
    import { mapLoader } from "../maps.js";

    let {
        center = { lat: 37.7749, lng: -122.4194 },
        zoom = 13,
        markers = [],
        route = null,
    } = $props();

    let mapContainer;
    let map;
    let mapMarkers = [];
    let directionsRenderer;

    onMount(async () => {
        const { Map } = await mapLoader.importLibrary("maps");
        const { DirectionsRenderer } = await mapLoader.importLibrary("routes");

        map = new Map(mapContainer, {
            center,
            zoom,
            disableDefaultUI: true,
            zoomControl: true,
        });

        directionsRenderer = new DirectionsRenderer({
            map: map,
            suppressMarkers: true,
        });

        updateMarkers();
    });

    $effect(() => {
        if (map && center) {
            map.setCenter(center);
        }
    });

    $effect(() => {
        if (map && zoom) {
            map.setZoom(zoom);
        }
    });

    $effect(() => {
        if (map && markers) {
            updateMarkers();
        }
    });

    $effect(() => {
        if (directionsRenderer) {
            if (route) {
                directionsRenderer.setDirections(route);
            } else {
                directionsRenderer.setDirections({ routes: [] });
            }
        }
    });

    async function updateMarkers() {
        if (!map) return;
        const { Marker } = await mapLoader.importLibrary("marker");

        mapMarkers.forEach((m) => m.setMap(null));
        mapMarkers = [];

        markers.forEach((m) => {
            const markerOptions = {
                map,
                position: m.position,
                title: m.title,
                label: m.label,
            };
            if (m.color) {
                markerOptions.icon = `http://maps.google.com/mapfiles/ms/icons/${m.color}-dot.png`;
            }

            const marker = new Marker(markerOptions);
            mapMarkers.push(marker);
        });
    }
</script>

<div
    bind:this={mapContainer}
    class="map-container"
    style="width: 100%; height: 100%;"
></div>
