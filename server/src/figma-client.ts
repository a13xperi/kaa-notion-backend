import axios, { AxiosError } from 'axios';
import { logger } from './logger';

interface FigmaClientConfig {
  accessToken: string;
}

export class FigmaClient {
  private readonly baseUrl = 'https://api.figma.com/v1';
  private readonly headers: Record<string, string>;

  constructor(config: FigmaClientConfig) {
    if (!config.accessToken) {
      throw new Error('Figma access token is required');
    }
    
    this.headers = {
      'X-Figma-Token': config.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async getFile(fileKey: string) {
    try {
      logger.info(`Fetching Figma file: ${fileKey}`);
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: this.headers,
      });
      logger.info('Figma file fetched successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error('Figma API Error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
        throw new Error(`Figma API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getFileNodes(fileKey: string, nodeIds: string[]) {
    try {
      logger.info(`Fetching Figma nodes: ${nodeIds.join(', ')} from file: ${fileKey}`);
      const response = await axios.get(
        `${this.baseUrl}/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`,
        {
          headers: this.headers,
        }
      );
      logger.info('Figma nodes fetched successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error('Figma API Error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
        throw new Error(`Figma API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getImageFills(fileKey: string, nodeIds: string[]) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/images/${fileKey}?ids=${nodeIds.join(',')}`,
        {
          headers: this.headers,
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching Figma image fills', { error });
      throw error;
    }
  }

  async getComments(fileKey: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}/comments`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching Figma comments', { error });
      throw error;
    }
  }
} 
