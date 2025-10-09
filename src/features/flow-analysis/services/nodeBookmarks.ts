import { Node } from 'reactflow';

export interface BookmarkedNode {
  id: string;
  nodeData: {
    label: string;
    technique?: string;
    tactic?: string;
    description?: string;
    severity?: string;
  };
  timestamp: number;
  tags: string[];
  notes: string;
  color?: string;
  analysisId?: string; // Link to specific analysis
}

export interface BookmarkFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  bookmarks: string[]; // Array of bookmark IDs
  created: number;
  modified: number;
}

const BOOKMARKS_STORAGE_KEY = 'threatflow_node_bookmarks';
const BOOKMARK_FOLDERS_STORAGE_KEY = 'threatflow_bookmark_folders';
const MAX_BOOKMARKS = 100;
const MAX_FOLDERS = 10;

class NodeBookmarkService {
  private bookmarks: Map<string, BookmarkedNode> = new Map();
  private folders: Map<string, BookmarkFolder> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      // Load bookmarks
      const bookmarksData = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (bookmarksData) {
        const bookmarksArray: BookmarkedNode[] = JSON.parse(bookmarksData);
        this.bookmarks = new Map(bookmarksArray.map(b => [b.id, b]));
      }

      // Load folders
      const foldersData = localStorage.getItem(BOOKMARK_FOLDERS_STORAGE_KEY);
      if (foldersData) {
        const foldersArray: BookmarkFolder[] = JSON.parse(foldersData);
        this.folders = new Map(foldersArray.map(f => [f.id, f]));
      }

      // Clean up old bookmarks (older than 90 days)
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      for (const [id, bookmark] of this.bookmarks) {
        if (bookmark.timestamp < ninetyDaysAgo) {
          this.bookmarks.delete(id);
        }
      }

      this.saveToStorage();
    } catch (error) {
      console.warn('Failed to load bookmarks from storage:', error);
      this.bookmarks = new Map();
      this.folders = new Map();
    }
  }

  private saveToStorage(): void {
    try {
      // Save bookmarks
      const bookmarksArray = Array.from(this.bookmarks.values());
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarksArray));

      // Save folders
      const foldersArray = Array.from(this.folders.values());
      localStorage.setItem(BOOKMARK_FOLDERS_STORAGE_KEY, JSON.stringify(foldersArray));
    } catch (error) {
      console.warn('Failed to save bookmarks to storage:', error);
    }
  }

  private generateBookmarkId(nodeId: string, analysisId?: string): string {
    const base = analysisId ? `${analysisId}_${nodeId}` : nodeId;
    return btoa(base).replace(/[/+=]/g, '').substring(0, 16);
  }

  // Add a bookmark
  addBookmark(node: Node, options?: {
    tags?: string[];
    notes?: string;
    color?: string;
    analysisId?: string;
    folderId?: string;
  }): BookmarkedNode {
    const bookmarkId = this.generateBookmarkId(node.id, options?.analysisId);
    
    // Check if already bookmarked
    if (this.bookmarks.has(bookmarkId)) {
      return this.bookmarks.get(bookmarkId)!;
    }

    // Check bookmark limit
    if (this.bookmarks.size >= MAX_BOOKMARKS) {
      // Remove oldest bookmark
      const oldest = Array.from(this.bookmarks.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.removeBookmark(oldest.id);
    }

    const bookmark: BookmarkedNode = {
      id: bookmarkId,
      nodeData: {
        label: node.data?.label || node.data?.name || node.id,
        technique: node.data?.technique_id || node.data?.technique,
        tactic: node.data?.tactic || node.data?.category,
        description: node.data?.description,
        severity: node.data?.severity || node.data?.risk,
      },
      timestamp: Date.now(),
      tags: options?.tags || [],
      notes: options?.notes || '',
      color: options?.color,
      analysisId: options?.analysisId,
    };

    this.bookmarks.set(bookmarkId, bookmark);

    // Add to folder if specified
    if (options?.folderId && this.folders.has(options.folderId)) {
      const folder = this.folders.get(options.folderId)!;
      if (!folder.bookmarks.includes(bookmarkId)) {
        folder.bookmarks.push(bookmarkId);
        folder.modified = Date.now();
      }
    }

    this.saveToStorage();
    return bookmark;
  }

  // Remove a bookmark
  removeBookmark(bookmarkId: string): boolean {
    if (!this.bookmarks.has(bookmarkId)) {
      return false;
    }

    this.bookmarks.delete(bookmarkId);

    // Remove from all folders
    this.folders.forEach(folder => {
      const index = folder.bookmarks.indexOf(bookmarkId);
      if (index !== -1) {
        folder.bookmarks.splice(index, 1);
        folder.modified = Date.now();
      }
    });

    this.saveToStorage();
    return true;
  }

  // Toggle bookmark status
  toggleBookmark(node: Node, analysisId?: string): { bookmarked: boolean; bookmark?: BookmarkedNode } {
    const bookmarkId = this.generateBookmarkId(node.id, analysisId);
    
    if (this.bookmarks.has(bookmarkId)) {
      this.removeBookmark(bookmarkId);
      return { bookmarked: false };
    } else {
      const bookmark = this.addBookmark(node, { analysisId });
      return { bookmarked: true, bookmark };
    }
  }

  // Check if a node is bookmarked
  isBookmarked(nodeId: string, analysisId?: string): boolean {
    const bookmarkId = this.generateBookmarkId(nodeId, analysisId);
    return this.bookmarks.has(bookmarkId);
  }

  // Get bookmark by ID
  getBookmark(bookmarkId: string): BookmarkedNode | null {
    return this.bookmarks.get(bookmarkId) || null;
  }

  // Get all bookmarks
  getBookmarks(): BookmarkedNode[] {
    return Array.from(this.bookmarks.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get bookmarks by tags
  getBookmarksByTags(tags: string[]): BookmarkedNode[] {
    return this.getBookmarks().filter(bookmark =>
      tags.some(tag => bookmark.tags.includes(tag))
    );
  }

  // Search bookmarks
  searchBookmarks(query: string): BookmarkedNode[] {
    const searchTerm = query.toLowerCase();
    return this.getBookmarks().filter(bookmark =>
      bookmark.nodeData.label.toLowerCase().includes(searchTerm) ||
      bookmark.nodeData.technique?.toLowerCase().includes(searchTerm) ||
      bookmark.nodeData.tactic?.toLowerCase().includes(searchTerm) ||
      bookmark.notes.toLowerCase().includes(searchTerm) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Update bookmark
  updateBookmark(bookmarkId: string, updates: Partial<Pick<BookmarkedNode, 'notes' | 'tags' | 'color'>>): BookmarkedNode | null {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {return null;}

    const updatedBookmark = {
      ...bookmark,
      ...updates,
      timestamp: Date.now(), // Update timestamp on modification
    };

    this.bookmarks.set(bookmarkId, updatedBookmark);
    this.saveToStorage();
    return updatedBookmark;
  }

  // Create folder
  createFolder(name: string, description: string = '', color: string = '#3498db'): BookmarkFolder | null {
    if (this.folders.size >= MAX_FOLDERS) {
      return null; // Max folders reached
    }

    const folderId = `folder_${Date.now()}`;
    const folder: BookmarkFolder = {
      id: folderId,
      name,
      description,
      color,
      bookmarks: [],
      created: Date.now(),
      modified: Date.now(),
    };

    this.folders.set(folderId, folder);
    this.saveToStorage();
    return folder;
  }

  // Get folder by ID
  getFolder(folderId: string): BookmarkFolder | null {
    return this.folders.get(folderId) || null;
  }

  // Get all folders
  getFolders(): BookmarkFolder[] {
    return Array.from(this.folders.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Add bookmark to folder
  addToFolder(bookmarkId: string, folderId: string): boolean {
    const folder = this.folders.get(folderId);
    if (!folder || !this.bookmarks.has(bookmarkId)) {
      return false;
    }

    if (!folder.bookmarks.includes(bookmarkId)) {
      folder.bookmarks.push(bookmarkId);
      folder.modified = Date.now();
      this.saveToStorage();
    }
    return true;
  }

  // Remove bookmark from folder
  removeFromFolder(bookmarkId: string, folderId: string): boolean {
    const folder = this.folders.get(folderId);
    if (!folder) {return false;}

    const index = folder.bookmarks.indexOf(bookmarkId);
    if (index !== -1) {
      folder.bookmarks.splice(index, 1);
      folder.modified = Date.now();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Get bookmarks in folder
  getFolderBookmarks(folderId: string): BookmarkedNode[] {
    const folder = this.folders.get(folderId);
    if (!folder) {return [];}

    return folder.bookmarks
      .map(id => this.bookmarks.get(id))
      .filter((bookmark): bookmark is BookmarkedNode => bookmark !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Delete folder
  deleteFolder(folderId: string): boolean {
    const folder = this.folders.get(folderId);
    if (!folder) {return false;}

    this.folders.delete(folderId);
    this.saveToStorage();
    return true;
  }

  // Get bookmark statistics
  getStatistics() {
    const allTags = new Set<string>();
    const tacticCount = new Map<string, number>();
    const severityCount = new Map<string, number>();

    this.bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => allTags.add(tag));
      
      const tactic = bookmark.nodeData.tactic;
      if (tactic) {
        tacticCount.set(tactic, (tacticCount.get(tactic) || 0) + 1);
      }

      const severity = bookmark.nodeData.severity;
      if (severity) {
        severityCount.set(severity, (severityCount.get(severity) || 0) + 1);
      }
    });

    return {
      totalBookmarks: this.bookmarks.size,
      totalFolders: this.folders.size,
      uniqueTags: Array.from(allTags),
      tacticDistribution: Object.fromEntries(tacticCount),
      severityDistribution: Object.fromEntries(severityCount),
      oldestBookmark: this.bookmarks.size > 0 
        ? Math.min(...Array.from(this.bookmarks.values()).map(b => b.timestamp))
        : null,
      newestBookmark: this.bookmarks.size > 0 
        ? Math.max(...Array.from(this.bookmarks.values()).map(b => b.timestamp))
        : null,
    };
  }

  // Export bookmarks
  exportBookmarks(): { bookmarks: BookmarkedNode[]; folders: BookmarkFolder[] } {
    return {
      bookmarks: this.getBookmarks(),
      folders: this.getFolders(),
    };
  }

  // Import bookmarks
  importBookmarks(data: { bookmarks: BookmarkedNode[]; folders?: BookmarkFolder[] }): boolean {
    try {
      // Merge bookmarks (don't overwrite existing ones)
      data.bookmarks.forEach(bookmark => {
        if (!this.bookmarks.has(bookmark.id)) {
          this.bookmarks.set(bookmark.id, bookmark);
        }
      });

      // Merge folders
      if (data.folders) {
        data.folders.forEach(folder => {
          if (!this.folders.has(folder.id)) {
            this.folders.set(folder.id, folder);
          }
        });
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import bookmarks:', error);
      return false;
    }
  }

  // Clear all bookmarks
  clearBookmarks(): void {
    this.bookmarks.clear();
    this.folders.clear();
    this.saveToStorage();
  }

  // Get bookmarked node IDs for current analysis
  getBookmarkedNodeIds(analysisId?: string): string[] {
    return Array.from(this.bookmarks.values())
      .filter(bookmark => !analysisId || bookmark.analysisId === analysisId)
      .map(bookmark => {
        // Extract original node ID from bookmark ID
        return bookmark.id.includes('_') 
          ? bookmark.id.split('_').slice(1).join('_')
          : bookmark.id;
      });
  }
}

// Export singleton instance
export const nodeBookmarkService = new NodeBookmarkService();