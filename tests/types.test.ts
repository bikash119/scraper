/**
 * Tests for the type definitions
 */

import { describe, it, expect } from 'vitest';
import { BaseEntity, State, District, RegistrationOffice, Village, Plot, GeoCoordinates } from '@/core/types/index.js';

describe('Type Definitions', () => {
  describe('BaseEntity', () => {
    it('should have the correct properties', () => {
      const entity: BaseEntity = {
        id: '123',
        name: 'Test Entity',
      };

      expect(entity.id).toBe('123');
      expect(entity.name).toBe('Test Entity');
    });
  });

  describe('State', () => {
    it('should extend BaseEntity and have districts', () => {
      const state: State = {
        id: '1',
        name: 'Odisha',
        districts: [],
      };

      expect(state.id).toBe('1');
      expect(state.name).toBe('Odisha');
      expect(Array.isArray(state.districts)).toBe(true);
    });
  });

  describe('District', () => {
    it('should extend BaseEntity and have registration offices', () => {
      const district: District = {
        id: '1',
        name: 'CUTTACK',
        registration_offices: [],
      };

      expect(district.id).toBe('1');
      expect(district.name).toBe('CUTTACK');
      expect(Array.isArray(district.registration_offices)).toBe(true);
    });
  });

  describe('RegistrationOffice', () => {
    it('should extend BaseEntity and have villages', () => {
      const center: RegistrationOffice = {
        id: '1',
        name: 'Cuttack Sadar',
        villages: [],
        type_id: '1',
        head_id: '2',
        office_initial: 'CS',
        active: true,
        created_by: 'admin',
        created_on: new Date(),
        updated_by: 'admin',
        updated_on: new Date(),
      };

      expect(center.id).toBe('1');
      expect(center.name).toBe('Cuttack Sadar');
      expect(Array.isArray(center.villages)).toBe(true);
      expect(center.type_id).toBe('1');
      expect(center.head_id).toBe('2');
      expect(center.office_initial).toBe('CS');
      expect(center.active).toBe(true);
      expect(center.created_by).toBe('admin');
      expect(center.created_on).toBeInstanceOf(Date);
      expect(center.updated_by).toBe('admin');
      expect(center.updated_on).toBeInstanceOf(Date);
    });

    it('should allow optional properties', () => {
      const center: RegistrationOffice = {
        id: '1',
        name: 'Cuttack Sadar',
        villages: [],
      };

      expect(center.id).toBe('1');
      expect(center.name).toBe('Cuttack Sadar');
      expect(Array.isArray(center.villages)).toBe(true);
      expect(center.type_id).toBeUndefined();
      expect(center.head_id).toBeUndefined();
      expect(center.office_initial).toBeUndefined();
      expect(center.active).toBeUndefined();
      expect(center.created_by).toBeUndefined();
      expect(center.created_on).toBeUndefined();
      expect(center.updated_by).toBeUndefined();
      expect(center.updated_on).toBeUndefined();
    });
  });

  describe('Village', () => {
    it('should extend BaseEntity and have plots', () => {
      const village: Village = {
        id: '1',
        name: 'Naraj',
        plots: [],
      };

      expect(village.id).toBe('1');
      expect(village.name).toBe('Naraj');
      expect(Array.isArray(village.plots)).toBe(true);
    });
  });

  describe('GeoCoordinates', () => {
    it('should have required and optional properties', () => {
      const coordinates: GeoCoordinates = {
        latitude: 20.4625,
        longitude: 85.8830,
        altitude: 45,
      };

      expect(coordinates.latitude).toBe(20.4625);
      expect(coordinates.longitude).toBe(85.8830);
      expect(coordinates.altitude).toBe(45);
    });

    it('should allow optional altitude', () => {
      const coordinates: GeoCoordinates = {
        latitude: 20.4625,
        longitude: 85.8830,
      };

      expect(coordinates.latitude).toBe(20.4625);
      expect(coordinates.longitude).toBe(85.8830);
      expect(coordinates.altitude).toBeUndefined();
    });
  });

  describe('Plot', () => {
    it('should extend BaseEntity and have all properties', () => {
      const plot: Plot = {
        id: '1',
        plot_id: '123',
        name: 'Plot 123',
        plot_number: '123',
        plot_type: 'Residential',
        area: 1000,
        area_unit: 'sq.ft',
        benchmark_value: 500000,
        value_per_unit: 500,
        currency: 'INR',
        owner: 'John Doe',
        last_updated: new Date(),
        coordinates: {
          latitude: 20.4625,
          longitude: 85.8830,
        },
      };

      expect(plot.id).toBe('1');
      expect(plot.name).toBe('Plot 123');
      expect(plot.plot_number).toBe('123');
      expect(plot.plot_type).toBe('Residential');
      expect(plot.area).toBe(1000);
      expect(plot.area_unit).toBe('sq.ft');
      expect(plot.benchmark_value).toBe(500000);
      expect(plot.value_per_unit).toBe(500);
      expect(plot.currency).toBe('INR');
      expect(plot.owner).toBe('John Doe');
      expect(plot.last_updated).toBeInstanceOf(Date);
      expect(plot.coordinates).toEqual({
        latitude: 20.4625,
        longitude: 85.8830,
      });
    });

    it('should allow optional properties', () => {
      const plot: Plot = {
        id: '1',
        plot_id: '123',
        name: 'Plot 123',
        plot_number: '123',
        plot_type: 'Residential',
      };

      expect(plot.id).toBe('1');
      expect(plot.name).toBe('Plot 123');
      expect(plot.plot_number).toBe('123');
      expect(plot.plot_type).toBe('Residential');
      expect(plot.area).toBeUndefined();
      expect(plot.area_unit).toBeUndefined();
      expect(plot.benchmark_value).toBeUndefined();
      expect(plot.value_per_unit).toBeUndefined();
      expect(plot.currency).toBeUndefined();
      expect(plot.owner).toBeUndefined();
      expect(plot.last_updated).toBeUndefined();
      expect(plot.coordinates).toBeUndefined();
    });
  });
}); 