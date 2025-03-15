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
    state_id: string;
    districts: District[];
}

/**
 * District within a state
 */
export interface District extends BaseEntity {
    district_id: string;
    state_id: string;
    state_name: string;
    registration_offices: RegistrationOffice[];
}

/**
 * Registration center (sub-district level)
 */
export interface RegistrationOffice extends BaseEntity {
    registration_office_id: string;
    district_id: string;
    district_name: string;
    state_id: string;
    state_name: string;
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
    village_id: string;
    registration_office_id: string;
    registration_office_name: string;
    district_id: string;
    district_name: string;
    state_id: string;
    state_name: string;
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
    village_id: string;
    village_name: string;
    registration_office_id: string;
    registration_office_name: string;
    district_id: string;
    district_name: string;
    state_id: string;
    state_name: string;
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
