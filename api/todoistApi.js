// Todoist API v1 Client (current/unified API)
const API_BASE = 'https://api.todoist.com/api/v1';

// Constants for completed tasks fetching
const COMPLETED_TASKS_START_DATE = '2025-08-01T00:00:00.000Z';
const CHUNK_SIZE_DAYS = 90; // 3 months in days
const API_REQUEST_DELAY = 100; // ms between requests

export class TodoistApiError extends Error {
  constructor(message, type, status, url) {
    super(message);
    this.name = 'TodoistApiError';
    this.type = type;
    this.status = status;
    this.url = url;
  }
}

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
                   Array.isArray(response?.items) ? response.items :  // Some endpoints use 'items'
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
    return this.request('/labels', { method: 'POST', body: label });
  }

  async getTasks(projectId, sectionId) {
    let endpoint = '/tasks?';
    const params = [];
    if (projectId) params.push(`project_id=${projectId}`);
    if (sectionId) params.push(`section_id=${sectionId}`);
    endpoint += params.join('&');
    
    return this.fetchPaged(endpoint);
  }

  async getCompletedTasks(projectId) {
    const now = new Date();
    const startFromDate = new Date(COMPLETED_TASKS_START_DATE);
    const allCompletedTasks = [];
    
    // Calculate how many chunks we need from start date to now
    const timeDiff = now.getTime() - startFromDate.getTime();
    const chunkDuration = CHUNK_SIZE_DAYS * 24 * 60 * 60 * 1000;
    const chunksNeeded = Math.max(1, Math.ceil(timeDiff / chunkDuration));
    
    for (let chunk = 0; chunk < chunksNeeded; chunk++) {
      // Calculate 3-month window, working backwards from now
      const endDate = new Date(now.getTime() - (chunk * chunkDuration));
      const startDate = new Date(Math.max(
        endDate.getTime() - chunkDuration,
        startFromDate.getTime()
      ));
      
      let endpoint = `/tasks/completed/by_completion_date?since=${startDate.toISOString()}&until=${endDate.toISOString()}`;
      if (projectId) endpoint += `&project_id=${projectId}`;
      
      try {
        const chunkResults = await this.fetchPaged(endpoint);
        allCompletedTasks.push(...chunkResults);
        
        // Add delay between requests to respect API rate limits
        if (chunk < chunksNeeded - 1) {
          await new Promise(resolve => setTimeout(resolve, API_REQUEST_DELAY));
        }
        
      } catch (error) {
        console.warn(`Error fetching completed tasks chunk ${chunk + 1}:`, error.message);
        continue;
      }
    }
    
    return allCompletedTasks;
  }

  async findTaskByDescription(projectId, sectionId, description) {
    const tasks = await this.getTasks(projectId, sectionId);
    return tasks.find(task => task.description?.includes(description));
  }

  findTaskByDescription(tasks, description) {
    return tasks.find(task => task.description?.includes(description));
  }

  async findTaskInProject(projectId, description) {
    try {
      // Search active tasks first (faster and more common)
      const activeTasks = await this.getTasks(projectId, null);
      const activeTask = this.findTaskByDescription(activeTasks, description);
      if (activeTask) {
        return { found: true, type: 'ACTIVE', task: activeTask };
      }

      // Search completed tasks if not found in active tasks
      const completedTasks = await this.getCompletedTasks(projectId);
      const completedTask = this.findTaskByDescription(completedTasks, description);
      if (completedTask) {
        return { found: true, type: 'COMPLETED', task: completedTask };
      }
      
      return { found: false };
    } catch (error) {
      console.error('Error searching for task:', error);
      
      // Fallback: search only active tasks if completed task search fails
      try {
        const activeTasks = await this.getTasks(projectId, null);
        const activeTask = this.findTaskByDescription(activeTasks, description);
        if (activeTask) {
          return { found: true, type: 'ACTIVE', task: activeTask };
        }
        return { found: false };
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return { found: false };
      }
    }
  }

  async createTask(task) {
    return this.request('/tasks', { method: 'POST', body: task });
  }
}

// Simple function exports for backward compatibility
export async function getProjects(token) {
  return new TodoistClient(token).getProjects();
}

export async function getSections(token, projectId) {
  return new TodoistClient(token).getSections(projectId);
}

export async function getLabels(token) {
  return new TodoistClient(token).getLabels();
}

export async function createLabel(token, payload) {
  return new TodoistClient(token).createLabel(payload);
}

export async function getTasks(token, projectId, sectionId) {
  return new TodoistClient(token).getTasks(projectId, sectionId);
}

export async function getCompletedTasks(token, projectId) {
  return new TodoistClient(token).getCompletedTasks(projectId);
}

export async function findTaskByDescription(token, projectId, sectionId, description) {
  return new TodoistClient(token).findTaskByDescription(projectId, sectionId, description);
}

export async function findTaskInProject(token, projectId, description) {
  return new TodoistClient(token).findTaskInProject(projectId, description);
}

export async function createTask(token, payload) {
  return new TodoistClient(token).createTask(payload);
}
