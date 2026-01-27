'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Download, ExternalLink, Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  embedLink: string;
  thumbnailLink: string;
  downloadLink: string;
  labels: string[];
}

interface ApiResponse {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoWidth, setVideoWidth] = useState<500 | 820 | 960>(820);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionType, setActionType] = useState<'add' | 'edit' | 'delete' | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    embedLink: '',
    thumbnailLink: '',
    downloadLink: '',
    labels: [] as string[],
    newLabel: '',
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch videos
  const fetchVideos = useCallback(async (page: number = 1, label: string = 'all') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(label !== 'all' && { label }),
      });
      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data: ApiResponse = await response.json();
      setVideos(data.videos);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  }, []);

  const fetchAllVideos = useCallback(async () => {
    const response = await fetch(`/api/videos?limit=10000`);
    const data: ApiResponse = await response.json();
    setAllVideos(data.videos); // Semua video untuk label counting
  }, []);

  // Calculate label counts
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (allVideos || []).forEach(video => {
      (video.labels || []).forEach(label => {
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });
    return counts;
  }, [allVideos]);
  // ← Re-calculate ketika allVideos berubah

  // Extract all unique labels
  useEffect(() => {
    const labels = new Set<string>();
    videos.forEach(video => {
      video.labels.forEach(label => labels.add(label));
    });
    setAllLabels(Array.from(labels).sort());
  }, [videos]);

  useEffect(() => {
    const labels = new Set<string>();
    allVideos.forEach(video => {  // ← Menggunakan allVideos
      video.labels.forEach(label => labels.add(label));
    });
    setAllLabels(Array.from(labels).sort());
  }, [allVideos]);

  // Initial load
  useEffect(() => {
    fetchAllVideos();  // ← Fetch semua video
    fetchVideos(currentPage, selectedLabel);  // ← Fetch video per halaman
  }, [fetchAllVideos, fetchVideos]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchVideos(page, selectedLabel);
    }
  };

  // Handle label filter
  const handleLabelFilter = (label: string) => {
    setSelectedLabel(label);
    setCurrentPage(1);
    fetchVideos(1, label);
  };

  // Verify password and execute action
  const verifyPassword = async () => {
    try {
      const response = await fetch('/api/videos/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setPasswordError('Invalid password');
        return;
      }

      // Store password before clearing state
      const storedPassword = password;

      setPasswordError('');
      setIsPasswordDialogOpen(false);
      setPassword('');

      // Execute the pending action based on actionType
      if (actionType === 'add') {
        try {
          const addResponse = await fetch('/api/videos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'authorization': storedPassword,
            },
            body: JSON.stringify(formData),
          });

          if (!addResponse.ok) {
            const errorData = await addResponse.json();
            throw new Error(errorData.error || 'Failed to add video');
          }

          setIsAddDialogOpen(false);
          fetchVideos(currentPage, selectedLabel);
        } catch (error) {
          console.error('Error adding video:', error);
        }
      } else if (actionType === 'edit' && selectedVideo) {
        try {
          const editResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'authorization': storedPassword,
            },
            body: JSON.stringify(formData),
          });

          if (!editResponse.ok) {
            const errorData = await editResponse.json();
            throw new Error(errorData.error || 'Failed to update video');
          }

          setIsEditDialogOpen(false);
          setSelectedVideo(null);
          fetchVideos(currentPage, selectedLabel);
        } catch (error) {
          console.error('Error updating video:', error);
        }
      } else if (actionType === 'delete' && selectedVideo) {
        try {
          const deleteResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
            method: 'DELETE',
            headers: {
              'authorization': storedPassword,
            },
          });

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(errorData.error || 'Failed to delete video');
          }

          setIsDeleteDialogOpen(false);
          setSelectedVideo(null);
          fetchVideos(currentPage, selectedLabel);
        } catch (error) {
          console.error('Error deleting video:', error);
        }
      }

      setActionType(null);
    } catch (error) {
      console.error('Password verification failed:', error);
      setPasswordError('Invalid password');
    }
  };

  // Add label
  const handleAddLabel = () => {
    if (!formData.newLabel.trim()) return;

    const newLabels = formData.newLabel
      .split(/,|\n/)           // pisah pakai koma atau enter
      .map(l => l.trim())
      .filter(l => l.length);

    setFormData(prev => ({
      ...prev,
      labels: Array.from(new Set([...prev.labels, ...newLabels])), // anti duplicate
      newLabel: '',
    }));
  };

  const addExistingLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels
        : [...prev.labels, label],
    }));
  };

  // Remove label
  const handleRemoveLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label),
    }));
  };

  // Open add dialog
  const openAddDialog = () => {
    setFormData({
      title: '',
      embedLink: '',
      thumbnailLink: '',
      downloadLink: '',
      labels: [],
      newLabel: '',
    });
    setIsAddDialogOpen(true);
  };

  // Handle add video
  const handleAddVideo = () => {
    setActionType('add');
    setIsPasswordDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (video: Video) => {
    setSelectedVideo(video);
    setFormData({
      title: video.title,
      embedLink: video.embedLink,
      thumbnailLink: video.thumbnailLink,
      downloadLink: video.downloadLink,
      labels: [...video.labels],
      newLabel: '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle edit video
  const handleEditVideo = () => {
    if (!selectedVideo) return;
    setActionType('edit');
    setIsPasswordDialogOpen(true);
  };

  // Handle delete video
  const handleDeleteVideo = () => {
    if (!selectedVideo) return;
    setActionType('delete');
    setIsPasswordDialogOpen(true);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVideo) {
        setSelectedVideo(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideo]);

  // Handle click outside overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectedVideo) {
      setSelectedVideo(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-gray-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-2xl font-bold text-white">Docult</h1>

          {/* Desktop menu */}
          <div className="hidden md:flex flex-1 items-center gap-4 justify-between">
            {/* Search di tengah */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-150">
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 bg-black text-white placeholder-gray-400 border-gray-700"
                />

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter + Add di kanan */}
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="labelFilter" className="text-white"></Label>
                <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                  <SelectTrigger id="labelFilter" className="w-48 text-white border-gray-700">
                    <SelectValue placeholder="All Labels" />
                  </SelectTrigger>
                  <SelectContent className="text-white bg-black border-gray-700">
                    <SelectItem value="all">All Labels ({allVideos.length})</SelectItem>
                    {allLabels.map(label => (
                      <SelectItem key={label} value={label}>
                        {label} ({labelCounts.get(label) || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Video */}
              <Button onClick={openAddDialog} className="bg-white text-black hover:bg-gray-200 flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Video
              </Button>
            </div>
          </div>

          {/* Burger Menu untuk mobile di kanan */}
          <button
            className="text-white md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-4 bg-black p-4 rounded-lg">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="labelFilterMobile" className="text-white text-gray-300">Filter:</Label>
              <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                <SelectTrigger id="labelFilterMobile" className="w-full text-white border-gray-700">
                  <SelectValue placeholder="All Labels" />
                </SelectTrigger>
                <SelectContent className="text-white bg-black border-gray-700">
                  <SelectItem value="all">All Labels ({allVideos.length})</SelectItem>
                  {allLabels.map(label => (
                    <SelectItem key={label} value={label}>
                      {label} ({labelCounts.get(label) || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 bg-black text-white placeholder-gray-400 border-gray-700"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Add Video */}
            <Button onClick={openAddDialog} className="bg-white text-black hover:bg-gray-200 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Video
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2">
        <div className="max-w-7xl mx-auto">
          {/* Video Grid */}
          {videos.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-gray-400">
              <p>No videos found. Add your first video to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-2">
              {videos
                .filter(video =>
                  video.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(video => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="cursor-pointer group"
                >
                  {/* Thumbnail dengan label di atas kiri */}
                  <div className="relative aspect-video overflow-hidden bg-gray-900 rounded">
                    <img
                      src={video.thumbnailLink}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />

                    {/* Labels di atas kiri */}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                      {video.labels.slice(0, 2).map(label => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className="text-xs bg-black/60 text-white px-1 py-0.5 rounded"
                        >
                          {label}
                        </Badge>
                      ))}
                      {video.labels.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-black/60 text-white px-1 py-0.5 rounded"
                        >
                          +{video.labels.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Overlay with play button */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  {/* Title di bawah thumbnail */}
                  <div className="mt-2">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                className="border-gray-700 text-black hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!currentPage || currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-4 py-2 text-white">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                className="border-gray-700 text-black hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Full-screen Theater Overlay */}
      {selectedVideo && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-2"
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 max-w-full">
            {/* Video Player */}
            <div
              className="relative bg-black w-full max-w-full"
              style={{
                width: isMobile ? '100vw' : `${videoWidth}px`,
              }}
            >
              <div
                className="relative w-full"
                style={{ paddingTop: `${100 / (16 / 9)}%` }}
              >
                <iframe
                  src={selectedVideo.embedLink}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>

            {/* Video Info and Actions */}
            <div className="w-full lg:w-72 bg-black text-white flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="max-w-full">
                <h2 className="text-xl font-bold break-words leading-tight">{selectedVideo.title}</h2>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedVideo.labels.map(label => (
                    <Badge key={label} variant="secondary" className="bg-transparant border-gray-700 text-white">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Width Controls */}
              <div>
                <div className="flex flex-wrap gap-2">
                  {[500, 820, 960].map(width => (
                    <Button
                      key={width}
                      variant={videoWidth === width ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoWidth(width as 500 | 820 | 960);
                      }}
                      size="sm"
                      className={videoWidth === width ? 'bg-white text-black hover:bg-gray-200' : 'bg-transparent text-white border-gray-700 hover:bg-gray-300'}
                    >
                      {width}px
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="bg-transparent text-white border-gray-700 hover:bg-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(selectedVideo);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent text-white border-gray-700 hover:bg-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideo(selectedVideo);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
                {selectedVideo.downloadLink && (
                  <Button
                    variant="outline"
                    className="bg-transparent text-white border-gray-700 hover:bg-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(selectedVideo.downloadLink, '_blank');
                    }}
                  >
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Video Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" zIndex={200}>
          <DialogHeader>
            <DialogTitle>Add Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
              />
            </div>
            <div>
              <Label htmlFor="embedLink">Embed Link *</Label>
              <Input
                id="embedLink"
                value={formData.embedLink}
                onChange={(e) => setFormData(prev => ({ ...prev, embedLink: e.target.value }))}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
            <div>
              <Label htmlFor="thumbnailLink">Thumbnail Link *</Label>
              <Input
                id="thumbnailLink"
                value={formData.thumbnailLink}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailLink: e.target.value }))}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div>
              <Label htmlFor="downloadLink">Download Link (optional)</Label>
              <Input
                id="downloadLink"
                value={formData.downloadLink}
                onChange={(e) => setFormData(prev => ({ ...prev, downloadLink: e.target.value }))}
                placeholder="https://example.com/download/video.mp4"
              />
            </div>
            <div>
              <Label>Labels</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.newLabel}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLabel: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add a label"
                />
                <Button type="button" onClick={handleAddLabel} className="bg-white text-black hover:bg-gray-200">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.labels.map(label => (
                  <Badge key={label} variant="secondary" className="bg-black text-white">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-sm text-black mb-2">Existing labels:</p>

                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allLabels.map(label => {
                    const selected = formData.labels.includes(label);

                    return (
                      <Badge
                        key={label}
                        onClick={() => addExistingLabel(label)}
                        className={`cursor-pointer select-none transition
                          ${
                            selected
                              ? 'bg-white text-black'
                              : 'bg-black text-white hover:bg-gray-700'
                          }`}
                      >
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={handleAddVideo} disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}>
                Add Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" zIndex={200}>
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTitle">Title *</Label>
              <Input
                id="editTitle"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
              />
            </div>
            <div>
              <Label htmlFor="editEmbedLink">Embed Link *</Label>
              <Input
                id="editEmbedLink"
                value={formData.embedLink}
                onChange={(e) => setFormData(prev => ({ ...prev, embedLink: e.target.value }))}
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
            <div>
              <Label htmlFor="editThumbnailLink">Thumbnail Link *</Label>
              <Input
                id="editThumbnailLink"
                value={formData.thumbnailLink}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailLink: e.target.value }))}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div>
              <Label htmlFor="editDownloadLink">Download Link (optional)</Label>
              <Input
                id="editDownloadLink"
                value={formData.downloadLink}
                onChange={(e) => setFormData(prev => ({ ...prev, downloadLink: e.target.value }))}
                placeholder="https://example.com/download/video.mp4"
              />
            </div>
            <div>
              <Label>Labels</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.newLabel}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLabel: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add a label"
                />
                <Button type="button" onClick={handleAddLabel} className="bg-white text-black hover:bg-gray-200">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.labels.map(label => (
                  <Badge key={label} variant="secondary" className="bg-black text-white border-">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={handleEditVideo} disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent zIndex={200}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-black">Are you sure you want to delete this video? This action cannot be undone.</p>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="bg-red-700 text-white hover:bg-red-700" onClick={handleDeleteVideo}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent zIndex={200}>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                ref={inputRef}
                placeholder="Enter admin password"
              />
              {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" className="border-gray-700 text-black hover:bg-gray-200" onClick={verifyPassword}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
