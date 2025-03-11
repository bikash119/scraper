/**
 * Base entity with common properties
 */
export interface BaseEntity {
    name: string;
    id: string;
}

/**
 * State representation with districts
 */
export interface State extends BaseEntity {
    districts: District[];
}

/**
 * District within a state
 */
export interface District extends BaseEntity {
    registration_offices: RegistrationOffice[];
}

/**
 * Registration center (sub-district level)
 */
export interface RegistrationOffice extends BaseEntity {
    villages: Village[];
    type_id?: string;
    head_id?: string;
    office_initial?: string;
    active?: boolean;
    created_by?: string;
    created_on?: Date | string;
    updated_by?: string;
    updated_on?: Date | string;
}

/**
 * Village or town
 */
export interface Village extends BaseEntity {
    plots: Plot[];
}

/**
 * Geographic coordinates
 */
export interface GeoCoordinates {
    latitude: number;
    longitude: number;
    altitude?: number;
}

/**
 * Land plot with details
 */
export interface Plot extends BaseEntity {
    plot_number: string;
    plot_id: string;
    plot_type?: string;
    area?: number;
    area_unit?: string;
    benchmark_value?: number;
    value_per_unit?: number;
    currency?: string;
    owner?: string;
    last_updated?: Date | string;
    coordinates?: GeoCoordinates;
}
