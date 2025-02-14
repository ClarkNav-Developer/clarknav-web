export interface RouteUsage {
    created_at: string | number | Date;
    route_type: 'Jeepney' | 'Bus' | 'Taxi';
    route_name: string;
    route_id: string;
    color: string;
    origin: string;
    destination: string;
}