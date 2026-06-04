import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export const MAPS_API_KEY = "AIzaSyCpHuFo98j7kxXpdJIjRthXOkuzQsiiXU0";

setOptions({
  key: MAPS_API_KEY,
  v: "weekly",
  libraries: ["places", "routes", "geometry"]
});

export const mapLoader = {
  importLibrary
};
