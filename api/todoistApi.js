/**
 * Modern Todoist API v1 Client
 * Minimal wrapper for essential Todoist operations
 */

const API_BASE = 'https://api.todoist.com/api/v1';

class TodoistApiError extends Error {
  constructor(message, type, status, url) {
    super(message);
    this.name = 'TodoistApiError';
    this.type = type;
    this.status = status;
    this.url = url;
  }
}

/**
 * Core HTTP client for Todoist API
 */
class TodoistClient {
  constructor(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new TodoistApiError('API token required', 'AUTH');
    }

    const url = `${API_BASE}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        ...(options.method !== 'GET' && { 'Content-Type': 'application/json' }),
      },
      ...options,
      ...(options.body && { body: JSON.stringify(options.body) }),
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new TodoistApiError(
          text || response.statusText,
          'HTTP',
          response.status,
          url
        );
      }

      if (response.status === 204) return null;
      return await response.json().catch(() => null);
      
    } catch (error) {
      if (error instanceof TodoistApiError) throw error;
      throw new TodoistApiError(error.message, 'NETWORK');
    }
  }

  async fetchPaged(endpoint) {
    const results = [];
    let cursor = null;

    do {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = cursor ? `${endpoint}${separator}cursor=${cursor}` : endpoint;
      
      const response = await this.request(url);
      const batch = Array.isArray(response?.results) ? response.results : 
                   Array.isArray(response) ? response : [];
      
      results.push(...batch);
      cursor = response?.next_cursor || null;
    } while (cursor);

    return results;
  }

  async getProjects() {
    return this.fetchPaged('/projects');
  }

  async getSections(projectId) {
    const endpoint = projectId ? `/sections?project_id=${projectId}` : '/sections';
    return this.fetchPaged(endpoint);
  }

  async getLabels() {
    return this.fetchPaged('/labels');
  }

  async createLabel(label) {
    return this.request('/labels', {
      method: 'POST',
      body: label,
    });
  }

  async createTask(task) {
    return this.request('/tasks', {
      method: 'POST',
      body: task,
    });
  }
}

/**
 * Legacy exports for backward compatibility
 */
export async function getProjects(token) {
  const client = new TodoistClient(token);
  return client.getProjects();
}

export async function getSections(token, projectId) {
  const client = new TodoistClient(token);
  return client.getSections(projectId);
}

export async function getLabels(token) {
  const client = new TodoistClient(token);
  return client.getLabels();
}

export async function createLabel(token, payload) {
  const client = new TodoistClient(token);
  return client.createLabel(payload);
}

export async function createTask(token, payload) {
  const client = new TodoistClient(token);
  return client.createTask(payload);
}

export { TodoistClient, TodoistApiError };
