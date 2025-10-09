export interface Bookmark {
  id: string;
  type: 'node' | 'flow' | 'search' | 'analysis';
  title: string;
  description?: string;
  data: any; // The actual data being bookmarked
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    category?: string;
    isFavorite: boolean;
    accessCount: number;
    lastAccessed?: Date;
  };
  preview?: {
    thumbnail?: string; // Base64 encoded image
    summary: string;
    stats?: Record<string, number>;
  };
}

export interface BookmarkFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  bookmarks: string[]; // Bookmark IDs
  createdAt: Date;
  updatedAt: Date;
  isShared?: boolean;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export interface BookmarkCollection {
  bookmarks: Record<string, Bookmark>;
  folders: Record<string, BookmarkFolder>;
  tags: string[];
  categories: string[];
}

class BookmarkService {
  private readonly STORAGE_KEY = 'threatflow_bookmarks';
  private readonly MAX_BOOKMARKS = 1000;
  private readonly MAX_FOLDERS = 50;

  // Load bookmarks from localStorage
  private loadData(): BookmarkCollection {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.values(data.bookmarks || {}).forEach((bookmark: any) => {
          bookmark.metadata.createdAt = new Date(bookmark.metadata.createdAt);
          bookmark.metadata.updatedAt = new Date(bookmark.metadata.updatedAt);
          if (bookmark.metadata.lastAccessed) {
            bookmark.metadata.lastAccessed = new Date(bookmark.metadata.lastAccessed);
          }
        });
        Object.values(data.folders || {}).forEach((folder: any) => {
          folder.createdAt = new Date(folder.createdAt);
          folder.updatedAt = new Date(folder.updatedAt);
        });
        return data;
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
    
    return {
      bookmarks: {},
      folders: {},
      tags: [],
      categories: []
    };
  }

  // Save bookmarks to localStorage
  private saveData(data: BookmarkCollection): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        this.cleanupOldBookmarks();
      }
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a new bookmark
  createBookmark(
    type: Bookmark['type'],
    title: string,
    data: any,
    options: {
      description?: string;
      tags?: string[];
      category?: string;
      folderId?: string;
      generatePreview?: boolean;
    } = {}
  ): string {
    const collection = this.loadData();
    
    if (Object.keys(collection.bookmarks).length >= this.MAX_BOOKMARKS) {
      throw new Error('Maximum number of bookmarks reached');
    }

    const id = this.generateId();
    const now = new Date();

    const bookmark: Bookmark = {
      id,
      type,
      title,
      description: options.description,
      data,
      metadata: {
        createdAt: now,
        updatedAt: now,
        tags: options.tags || [],
        category: options.category,
        isFavorite: false,
        accessCount: 0
      }
    };

    // Generate preview if requested
    if (options.generatePreview) {
      bookmark.preview = this.generatePreview(type, data);
    }

    // Update collection
    collection.bookmarks[id] = bookmark;
    
    // Update tags
    if (options.tags) {
      options.tags.forEach(tag => {
        if (!collection.tags.includes(tag)) {
          collection.tags.push(tag);
        }
      });
    }

    // Update categories
    if (options.category && !collection.categories.includes(options.category)) {
      collection.categories.push(options.category);
    }

    // Add to folder if specified
    if (options.folderId && collection.folders[options.folderId]) {
      collection.folders[options.folderId].bookmarks.push(id);
      collection.folders[options.folderId].updatedAt = now;
    }

    this.saveData(collection);
    return id;
  }

  // Get all bookmarks
  getAllBookmarks(): Bookmark[] {
    const collection = this.loadData();
    return Object.values(collection.bookmarks).sort(
      (a, b) => b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
    );
  }

  // Get bookmarks by type
  getBookmarksByType(type: Bookmark['type']): Bookmark[] {
    return this.getAllBookmarks().filter(bookmark => bookmark.type === type);
  }

  // Get bookmarks by folder
  getBookmarksByFolder(folderId: string): Bookmark[] {
    const collection = this.loadData();
    const folder = collection.folders[folderId];
    if (!folder) return [];

    return folder.bookmarks
      .map(id => collection.bookmarks[id])
      .filter(Boolean)
      .sort((a, b) => b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime());
  }

  // Search bookmarks
  searchBookmarks(query: string, filters: {
    type?: Bookmark['type'];
    tags?: string[];
    category?: string;
    isFavorite?: boolean;
  } = {}): Bookmark[] {
    const bookmarks = this.getAllBookmarks();
    const searchTerm = query.toLowerCase();

    return bookmarks.filter(bookmark => {
      // Text search
      const matchesQuery = !query || 
        bookmark.title.toLowerCase().includes(searchTerm) ||
        bookmark.description?.toLowerCase().includes(searchTerm) ||
        bookmark.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm));

      // Type filter
      const matchesType = !filters.type || bookmark.type === filters.type;

      // Tags filter
      const matchesTags = !filters.tags?.length || 
        filters.tags.some(tag => bookmark.metadata.tags.includes(tag));

      // Category filter
      const matchesCategory = !filters.category || 
        bookmark.metadata.category === filters.category;

      // Favorite filter
      const matchesFavorite = filters.isFavorite === undefined || 
        bookmark.metadata.isFavorite === filters.isFavorite;

      return matchesQuery && matchesType && matchesTags && matchesCategory && matchesFavorite;
    });
  }

  // Get bookmark by ID
  getBookmark(id: string): Bookmark | null {
    const collection = this.loadData();
    const bookmark = collection.bookmarks[id];
    
    if (bookmark) {
      // Update access tracking
      bookmark.metadata.accessCount++;
      bookmark.metadata.lastAccessed = new Date();
      this.saveData(collection);
    }
    
    return bookmark || null;
  }

  // Update bookmark
  updateBookmark(id: string, updates: Partial<Bookmark>): boolean {
    const collection = this.loadData();
    const bookmark = collection.bookmarks[id];
    
    if (!bookmark) return false;

    // Merge updates
    Object.assign(bookmark, updates);
    bookmark.metadata.updatedAt = new Date();

    // Update tags collection
    if (updates.metadata?.tags) {
      updates.metadata.tags.forEach(tag => {
        if (!collection.tags.includes(tag)) {
          collection.tags.push(tag);
        }
      });
    }

    // Update categories collection
    if (updates.metadata?.category && !collection.categories.includes(updates.metadata.category)) {
      collection.categories.push(updates.metadata.category);
    }

    this.saveData(collection);
    return true;
  }

  // Delete bookmark
  deleteBookmark(id: string): boolean {
    const collection = this.loadData();
    
    if (!collection.bookmarks[id]) return false;

    // Remove from folders
    Object.values(collection.folders).forEach(folder => {
      const index = folder.bookmarks.indexOf(id);
      if (index > -1) {
        folder.bookmarks.splice(index, 1);
        folder.updatedAt = new Date();
      }
    });

    // Remove bookmark
    delete collection.bookmarks[id];
    
    this.saveData(collection);
    return true;
  }

  // Toggle favorite status
  toggleFavorite(id: string): boolean {
    const collection = this.loadData();
    const bookmark = collection.bookmarks[id];
    
    if (!bookmark) return false;

    bookmark.metadata.isFavorite = !bookmark.metadata.isFavorite;
    bookmark.metadata.updatedAt = new Date();
    
    this.saveData(collection);
    return bookmark.metadata.isFavorite;
  }

  // Create folder
  createFolder(name: string, options: {
    description?: string;
    color?: string;
  } = {}): string {
    const collection = this.loadData();
    
    if (Object.keys(collection.folders).length >= this.MAX_FOLDERS) {
      throw new Error('Maximum number of folders reached');
    }

    const id = this.generateId();
    const now = new Date();

    const folder: BookmarkFolder = {
      id,
      name,
      description: options.description,
      color: options.color || '#3b82f6',
      bookmarks: [],
      createdAt: now,
      updatedAt: now
    };

    collection.folders[id] = folder;
    this.saveData(collection);
    
    return id;
  }

  // Get all folders
  getAllFolders(): BookmarkFolder[] {
    const collection = this.loadData();
    return Object.values(collection.folders).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }

  // Update folder
  updateFolder(id: string, updates: Partial<BookmarkFolder>): boolean {
    const collection = this.loadData();
    const folder = collection.folders[id];
    
    if (!folder) return false;

    Object.assign(folder, updates);
    folder.updatedAt = new Date();
    
    this.saveData(collection);
    return true;
  }

  // Delete folder
  deleteFolder(id: string, moveBookmarksTo?: string): boolean {
    const collection = this.loadData();
    const folder = collection.folders[id];
    
    if (!folder) return false;

    // Handle bookmarks in the folder
    if (moveBookmarksTo && collection.folders[moveBookmarksTo]) {
      // Move bookmarks to another folder
      collection.folders[moveBookmarksTo].bookmarks.push(...folder.bookmarks);
      collection.folders[moveBookmarksTo].updatedAt = new Date();
    }
    // If no destination folder, bookmarks become uncategorized

    delete collection.folders[id];
    this.saveData(collection);
    
    return true;
  }

  // Add bookmark to folder
  addToFolder(bookmarkId: string, folderId: string): boolean {
    const collection = this.loadData();
    const bookmark = collection.bookmarks[bookmarkId];
    const folder = collection.folders[folderId];
    
    if (!bookmark || !folder) return false;

    if (!folder.bookmarks.includes(bookmarkId)) {
      folder.bookmarks.push(bookmarkId);
      folder.updatedAt = new Date();
      this.saveData(collection);
    }
    
    return true;
  }

  // Remove bookmark from folder
  removeFromFolder(bookmarkId: string, folderId: string): boolean {
    const collection = this.loadData();
    const folder = collection.folders[folderId];
    
    if (!folder) return false;

    const index = folder.bookmarks.indexOf(bookmarkId);
    if (index > -1) {
      folder.bookmarks.splice(index, 1);
      folder.updatedAt = new Date();
      this.saveData(collection);
      return true;
    }
    
    return false;
  }

  // Get available tags
  getAllTags(): string[] {
    const collection = this.loadData();
    return [...collection.tags].sort();
  }

  // Get available categories
  getAllCategories(): string[] {
    const collection = this.loadData();
    return [...collection.categories].sort();
  }

  // Get bookmark statistics
  getStatistics() {
    const collection = this.loadData();
    const bookmarks = Object.values(collection.bookmarks);
    
    const typeStats = bookmarks.reduce((acc, bookmark) => {
      acc[bookmark.type] = (acc[bookmark.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = bookmarks.reduce((acc, bookmark) => {
      const category = bookmark.metadata.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: bookmarks.length,
      favorites: bookmarks.filter(b => b.metadata.isFavorite).length,
      folders: Object.keys(collection.folders).length,
      tags: collection.tags.length,
      categories: collection.categories.length,
      byType: typeStats,
      byCategory: categoryStats,
      mostAccessed: bookmarks
        .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
        .slice(0, 5),
      recentlyAdded: bookmarks
        .sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())
        .slice(0, 5)
    };
  }

  // Generate preview for different bookmark types
  private generatePreview(type: Bookmark['type'], data: any): Bookmark['preview'] {
    switch (type) {
      case 'node':
        return {
          summary: `${data.type || 'Node'}: ${data.label || data.id}`,
          stats: {
            connections: data.connections || 0,
            confidence: data.confidence || 0
          }
        };

      case 'flow':
        return {
          summary: `Flow with ${data.nodes?.length || 0} nodes and ${data.edges?.length || 0} edges`,
          stats: {
            nodes: data.nodes?.length || 0,
            edges: data.edges?.length || 0,
            tactics: new Set(data.nodes?.map((n: any) => n.data?.tactic_id).filter(Boolean)).size
          }
        };

      case 'search':
        return {
          summary: `Search: "${data.query || 'Advanced search'}"`,
          stats: {
            filters: Object.keys(data.filters || {}).length,
            results: data.resultCount || 0
          }
        };

      case 'analysis':
        return {
          summary: data.title || 'Analysis result',
          stats: {
            findings: data.findings?.length || 0,
            riskScore: data.riskScore || 0
          }
        };

      default:
        return {
          summary: 'Bookmark',
          stats: {}
        };
    }
  }

  // Cleanup old bookmarks when storage is full
  private cleanupOldBookmarks(): void {
    const collection = this.loadData();
    const bookmarks = Object.values(collection.bookmarks);
    
    // Sort by last accessed (oldest first)
    bookmarks.sort((a, b) => {
      const aTime = a.metadata.lastAccessed?.getTime() || a.metadata.createdAt.getTime();
      const bTime = b.metadata.lastAccessed?.getTime() || b.metadata.createdAt.getTime();
      return aTime - bTime;
    });

    // Remove oldest 10% of bookmarks (excluding favorites)
    const toRemove = Math.floor(bookmarks.length * 0.1);
    const removed = bookmarks
      .filter(b => !b.metadata.isFavorite)
      .slice(0, toRemove);

    removed.forEach(bookmark => {
      this.deleteBookmark(bookmark.id);
    });
  }

  // Export bookmarks
  exportBookmarks(): string {
    const collection = this.loadData();
    return JSON.stringify(collection, null, 2);
  }

  // Import bookmarks
  importBookmarks(data: string, options: { merge?: boolean } = {}): boolean {
    try {
      const importedCollection: BookmarkCollection = JSON.parse(data);
      
      if (options.merge) {
        const currentCollection = this.loadData();
        
        // Merge bookmarks
        Object.assign(currentCollection.bookmarks, importedCollection.bookmarks);
        Object.assign(currentCollection.folders, importedCollection.folders);
        
        // Merge tags and categories
        currentCollection.tags = [...new Set([...currentCollection.tags, ...importedCollection.tags])];
        currentCollection.categories = [...new Set([...currentCollection.categories, ...importedCollection.categories])];
        
        this.saveData(currentCollection);
      } else {
        this.saveData(importedCollection);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      return false;
    }
  }

  // Clear all bookmarks
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const bookmarkService = new BookmarkService();