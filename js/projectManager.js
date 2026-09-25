/**
 * Stop Challenge Pro Studio - CapCut Project Manager Engine
 * Manages multiple projects, persistent storage in localStorage, blank project initialization,
 * and project metadata (name, thumbnail, aspect ratio, duration, last modified).
 */

class ProjectManager {
  constructor() {
    this.STORAGE_KEY = 'stop_challenge_projects_db_v2';
    this.ACTIVE_KEY = 'stop_challenge_active_project_id';
    this.projects = this.loadProjectsFromStorage();
    this.currentProject = null;
  }

  loadProjectsFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('Could not parse projects database:', e);
    }
    return [];
  }

  saveProjectsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to save projects to storage (may be quota limit):', e);
    }
  }

  getAllProjects() {
    return this.projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getProjectById(id) {
    return this.projects.find(p => p.id === id) || null;
  }

  createBlankProject(name = null) {
    const timestamp = Date.now();
    const id = 'proj_' + timestamp + '_' + Math.random().toString(36).substr(2, 6);
    const projectName = name || `Challenge_${new Date(timestamp).toLocaleDateString().replace(/\//g, '')}_${this.projects.length + 1}`;

    const newProj = {
      id: id,
      name: projectName,
      createdAt: timestamp,
      updatedAt: timestamp,
      aspectRatio: '9:16',
      items: [], // Completely blank on startup as requested
      itemCount: 0,
      background: {
        mode: 'presets',
        preset: 'cyberpunk',
        customGrad: { type: '135deg', c1: '#0f0c29', c2: '#302b63' },
        customImage: null,
        fit: 'cover',
        dim: 35,
        blur: 0
      },
      audio: {
        preset: 'cyber-trap',
        customAudio: null,
        volume: 80
      },
      text: {
        header: 'CAN YOU STOP THIS? 🛑',
        headerSize: 52,
        headerColor: '#ffe600',
        sub: 'PAUSE EXACTLY IN THE OUTLINE! 🎯',
        subSize: 28
      },
      outline: {
        mode: 'outline-only',
        thickness: 6,
        glow: 15,
        color: '#ffffff',
        yOffset: 0,
        pulse: true
      },
      motion: {
        style: 'pendulum',
        speed: 1.0,
        amplitude: 85,
        duration: 10
      },
      thumbnail: null
    };

    this.projects.unshift(newProj);
    this.saveProjectsToStorage();
    this.currentProject = newProj;
    localStorage.setItem(this.ACTIVE_KEY, id);
    return newProj;
  }

  saveCurrentProject(projectState) {
    if (!this.currentProject) {
      this.currentProject = this.createBlankProject(projectState.name || 'Untitled Project');
    }

    const idx = this.projects.findIndex(p => p.id === this.currentProject.id);
    const updated = {
      ...this.currentProject,
      ...projectState,
      updatedAt: Date.now()
    };

    if (idx !== -1) {
      this.projects[idx] = updated;
    } else {
      this.projects.unshift(updated);
    }

    this.currentProject = updated;
    this.saveProjectsToStorage();
    return updated;
  }

  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjectsToStorage();
    if (this.currentProject && this.currentProject.id === id) {
      this.currentProject = null;
      localStorage.removeItem(this.ACTIVE_KEY);
    }
  }

  duplicateProject(id) {
    const src = this.getProjectById(id);
    if (!src) return null;

    const timestamp = Date.now();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'proj_' + timestamp + '_' + Math.random().toString(36).substr(2, 6);
    copy.name = `${src.name} (Copy)`;
    copy.createdAt = timestamp;
    copy.updatedAt = timestamp;

    this.projects.unshift(copy);
    this.saveProjectsToStorage();
    return copy;
  }

  getActiveProject() {
    const activeId = localStorage.getItem(this.ACTIVE_KEY);
    if (activeId) {
      const p = this.getProjectById(activeId);
      if (p) {
        this.currentProject = p;
        return p;
      }
    }
    return null;
  }
}

window.projectManager = new ProjectManager();
