// filepath: /c:/Users/kenji/Documents/clarknav-web/src/mapbox-sdk.d.ts
declare module '@mapbox/mapbox-sdk/services/directions' {
    import { LngLatLike } from 'mapbox-gl';

    interface DirectionsRequest {
        profile: 'driving' | 'walking' | 'cycling';
        waypoints: { coordinates: LngLatLike }[];
    }

    interface DirectionsResponse {
        body: {
            routes: {
                geometry: {
                    coordinates: number[][];
                };
                duration: number;
            }[];
        };
    }

    interface DirectionsService {
        getDirections(request: DirectionsRequest): {
            send(): Promise<DirectionsResponse>;
        };
    }

    function MapboxDirections(config: { accessToken: string }): DirectionsService;

    export default MapboxDirections;
}

// filepath: /c:/Users/kenji/Documents/clarknav-web/src/mapbox-sdk.d.ts
declare module '@mapbox/mapbox-sdk/services/geocoding' {
    import { LngLatLike } from 'mapbox-gl';

    interface GeocodingRequest {
        query: LngLatLike;
        limit?: number;
    }

    interface GeocodingResponse {
        body: {
            features: {
                place_name: string;
            }[];
        };
    }

    interface GeocodingService {
        reverseGeocode(request: GeocodingRequest): {
            send(): Promise<GeocodingResponse>;
        };
    }

    function MapboxGeocoding(config: { accessToken: string }): GeocodingService;

    export default MapboxGeocoding;
}