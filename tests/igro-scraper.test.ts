/**
 * Tests for the IGRO Odisha scraper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { 
  initializeSession, 
  fetchRegistrationOffices, 
  fetchVillages, 
  fetchPlots, 
  parseMRValueResponse,
  scrapeIGRO 
} from '@/igro-scraper.js';

// Mock axios
vi.mock('axios');

// Mock logger to avoid console output during tests
vi.mock('@/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('IGRO Scraper', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('initializeSession', () => {
    it('should initialize a session and extract tokens', async () => {
      // Mock the response from the IGRO website
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <body>
              <form>
                <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="viewStateValue" />
                <select id="ContentPlaceHolder1_ddldist">
                  <option value="0">--SELECT--</option>
                  <option value="1">ANGUL</option>
                  <option value="2">BALASORE</option>
                </select>
              </form>
            </body>
          </html>
        `,
        headers: {
          'set-cookie': [
            '__AntiXsrfToken=antiXsrfTokenValue; path=/; HttpOnly',
            'ASP.NET_SessionId=sessionIdValue; path=/; HttpOnly',
          ],
        },
      });

      // Call the function
      const sessionData = await initializeSession();

      // Verify the function made the correct HTTP request
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        'https://igrodisha.gov.in/ViewFeeValue.aspx',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );

      // Verify the function extracted the correct data
      expect(sessionData).toEqual({
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: [
          '__AntiXsrfToken=antiXsrfTokenValue; path=/; HttpOnly',
          'ASP.NET_SessionId=sessionIdValue; path=/; HttpOnly',
        ],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      });
    });

    it('should handle missing tokens gracefully', async () => {
      // Mock a response with missing tokens
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <body>
              <form>
                <!-- No hidden fields -->
                <select id="ContentPlaceHolder1_ddldist">
                  <option value="0">--SELECT--</option>
                </select>
              </form>
            </body>
          </html>
        `,
        headers: {
          'set-cookie': [
            // No anti-XSRF token
            'ASP.NET_SessionId=sessionIdValue; path=/; HttpOnly',
          ],
        },
      });

      // Call the function
      const sessionData = await initializeSession();

      // Verify the function extracted what it could
      expect(sessionData).toEqual({
        antiXsrfToken: '',
        cookies: [
          'ASP.NET_SessionId=sessionIdValue; path=/; HttpOnly',
        ],
        data: '',
        districts: {}
      });
    });

    it('should handle network errors', async () => {
      // Mock a network error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(initializeSession()).rejects.toThrow('Failed to initialize session with IGRO Odisha website');
    });
  });

  describe('fetchRegistrationOffices', () => {
    it('should fetch and parse registration offices', async () => {
      // Mock session data
      const sessionData = {
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: ['cookie1=value1', 'cookie2=value2'],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      };

      // Mock the response from the IGRO website
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          d: [
            {
              REGOFF_ID: 101,
              REGOFF_NAME: 'Office 1',
              REGOFF_HEAD_ID: 201,
              REGOFF_INITIAL: 'OFF1',
              REGOFF_TYPE_ID: 301,
              REGOFF_ACTIVE: 1
            },
            {
              REGOFF_ID: 102,
              REGOFF_NAME: 'Office 2',
              REGOFF_HEAD_ID: 202,
              REGOFF_INITIAL: 'OFF2',
              REGOFF_TYPE_ID: 302,
              REGOFF_ACTIVE: 0
            }
          ]
        }
      });

      // Call the function
      const offices = await fetchRegistrationOffices(sessionData, '1');

      // Verify the function made the correct HTTP request
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://igrodisha.gov.in/ViewFeeValue.aspx/GetRegoffice',
        { distId: '1' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': expect.stringContaining('cookie1=value1; cookie2=value2'),
          }),
        })
      );

      // Verify the function extracted the correct offices
      expect(offices).toEqual([
        {
          id: '101',
          name: 'Office 1',
          head_id: '201',
          office_initial: 'OFF1',
          type_id: '301',
          active: true,
          villages: []
        },
        {
          id: '102',
          name: 'Office 2',
          head_id: '202',
          office_initial: 'OFF2',
          type_id: '302',
          active: false,
          villages: []
        }
      ]);
    });

    it('should handle empty response gracefully', async () => {
      // Mock session data
      const sessionData = {
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: ['cookie1=value1', 'cookie2=value2'],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      };

      // Mock a response with no offices
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          d: []
        }
      });

      // Call the function
      const offices = await fetchRegistrationOffices(sessionData, '1');

      // Verify the function returned an empty array
      expect(offices).toEqual([]);
    });

    it('should handle network errors', async () => {
      // Mock session data
      const sessionData = {
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: ['cookie1=value1', 'cookie2=value2'],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      };

      // Mock a network error
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(fetchRegistrationOffices(sessionData, '1')).rejects.toThrow('Failed to fetch registration offices for district ID 1');
    });
  });

  describe('fetchVillages', () => {
    it('should fetch and parse villages', async () => {
      // Mock session data
      const sessionData = {
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: ['cookie1=value1', 'cookie2=value2'],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      };

      // Mock the response from the IGRO website
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          d: [
            {
              VILL_ID: 201,
              VILL_NAME: 'Village 1'
            },
            {
              VILL_ID: 202,
              VILL_NAME: 'Village 2'
            }
          ]
        }
      });

      // Call the function
      const villages = await fetchVillages(sessionData, '101');

      // Verify the function made the correct HTTP request
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://igrodisha.gov.in/ViewFeeValue.aspx/GetVillage',
        { RegoffId: '101' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': expect.stringContaining('cookie1=value1; cookie2=value2'),
          }),
        })
      );

      // Verify the function extracted the correct villages
      expect(villages).toEqual([
        {
          id: '201',
          name: 'Village 1',
          plots: []
        },
        {
          id: '202',
          name: 'Village 2',
          plots: []
        }
      ]);
    });
  });

  describe('fetchPlots', () => {
    it('should fetch and parse plots', async () => {
      // Mock session data
      const sessionData = {
        antiXsrfToken: 'antiXsrfTokenValue',
        cookies: ['cookie1=value1', 'cookie2=value2'],
        data: 'viewStateValue',
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        }
      };

      // Mock the response from the IGRO website
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          d: [
            {
              One: '301'
            },
            {
              One: '302'
            }
          ]
        }
      });

      // Call the function
      const plots = await fetchPlots(sessionData, '201');

      // Verify the function made the correct HTTP request
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://igrodisha.gov.in/ViewFeeValue.aspx/GetPlotDtl',
        { StrVillageId: '201' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': expect.stringContaining('cookie1=value1; cookie2=value2'),
          }),
        })
      );

      // Verify the function extracted the correct plots
      expect(plots).toEqual([
        {
          id: '301',
          name: '301',
          plot_id: '301',
          plot_number: '301'
        },
        {
          id: '302',
          name: '302',
          plot_id: '302',
          plot_number: '302'
        }
      ]);
    });
  });

  describe('parseMRValueResponse', () => {
    it('should parse MR value response correctly', () => {
      const responseData = '100.00 - Acre@$500000@$30000@$25000@$5000@$560000@$Additional Info@$Some notes';
      
      const result = parseMRValueResponse(responseData);
      
      expect(result).toEqual({
        area: '100.00',
        unit: 'Acre',
        marketValue: 500000,
        registrationFee: 30000,
        stampDuty: 25000,
        additionalStampDuty: 5000,
        totalValue: 560000,
        additionalInfo: 'Additional Info',
        notes: 'Some notes'
      });
    });

    it('should handle missing optional fields', () => {
      const responseData = '100.00 - Acre@$500000@$30000@$25000@$5000@$560000@$@$NA';
      
      const result = parseMRValueResponse(responseData);
      
      expect(result).toEqual({
        area: '100.00',
        unit: 'Acre',
        marketValue: 500000,
        registrationFee: 30000,
        stampDuty: 25000,
        additionalStampDuty: 5000,
        totalValue: 560000,
        additionalInfo: undefined,
        notes: undefined
      });
    });

    it('should handle invalid numeric values', () => {
      const responseData = '100.00 - Acre@$invalid@$30000@$25000@$5000@$560000@$@$NA';
      
      const result = parseMRValueResponse(responseData);
      
      expect(result.marketValue).toBe(0);
    });
  });

  describe('scrapeIGRO', () => {
    it('should initialize a session and fetch districts', async () => {
      // Mock the responses for API calls
      vi.mocked(axios.get).mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <body>
              <form>
                <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="viewStateValue" />
                <select id="ContentPlaceHolder1_ddldist">
                  <option value="0">--SELECT--</option>
                  <option value="1">ANGUL</option>
                  <option value="2">BALASORE</option>
                </select>
              </form>
            </body>
          </html>
        `,
        headers: {
          'set-cookie': [
            '__AntiXsrfToken=antiXsrfTokenValue; path=/; HttpOnly',
            'ASP.NET_SessionId=sessionIdValue; path=/; HttpOnly',
          ],
        },
      });

      // Call the function with minimal parameters to avoid making too many requests
      const result = await scrapeIGRO(1000, false, false);

      // Verify the function made the correct HTTP requests
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Verify the function returned the correct data structure
      expect(result).toEqual({
        sessionData: expect.objectContaining({
          antiXsrfToken: 'antiXsrfTokenValue',
          districts: {
            '1': 'ANGUL',
            '2': 'BALASORE'
          }
        }),
        districts: {
          '1': 'ANGUL',
          '2': 'BALASORE'
        },
        registrationOffices: expect.any(Object),
        villages: expect.any(Object),
        plots: expect.any(Object)
      });
    });
  });
}); 