'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Download, ExternalLink, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [labelCounts, setLabelCounts] = useState<Map<string, number>>(new Map());
  const [totalVideos, setTotalVideos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true); // apakah masih ada video untuk load
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [actionType, setActionType] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete';
    data?: Video | null;
  } | null>(null);

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
  const fetchVideos = useCallback(
    async (page = 1, label = 'all', search = '', append = false) => {
      if (!hasMore && append) return;

      try {
        setIsLoadingMore(true);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(label !== 'all' && { label }),
          ...(search && { s: search }),
        });

        const res = await fetch(`/api/videos?${params}`);
        const data = await res.json();

        setVideos(prev => append ? [...prev, ...data.videos] : data.videos);
        setCurrentPage(page);
        setHasMore(data.pagination.hasNextPage);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore]
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          fetchVideos(currentPage + 1, selectedLabel, searchInput, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchVideos, isLoadingMore, hasMore, currentPage, selectedLabel]);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/videos/meta');
      if (!res.ok) throw new Error();

      const data = await res.json();

      const counts = new Map<string, number>();
      data.labels.forEach((l: { label: string; count: number }) => {
        counts.set(l.label, l.count);
      });

      setLabelCounts(counts);
      setAllLabels(data.labels.map((l: any) => l.label));
      setTotalVideos(data.totalVideos); // 🔥 INI KUNCI
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Initial load
  // Di useEffect initial load:
  // Initial load, hanya sekali saat component mount
  useEffect(() => {
    fetchMeta();                    // 1x untuk labels + count
    fetchVideos(1, selectedLabel);

    // Cek apakah sudah login sebelumnya
    const savedPass = sessionStorage.getItem("admin_pass");
    if (savedPass) {
      const verifyStoredPassword = async () => {
        try {
          const response = await fetch('/api/videos/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: savedPass }),
          });
          if (response.ok) setIsAuthenticated(true);
          else {
            sessionStorage.removeItem("admin_pass");
            setIsAuthenticated(false);
          }
        } catch {
          sessionStorage.removeItem("admin_pass");
          setIsAuthenticated(false);
        }
      };
      verifyStoredPassword();
    }
  }, []);  // ⚠ kosong agar hanya run sekali

  useEffect(() => {
    const handler = setTimeout(() => {
      setVideos([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchVideos(1, selectedLabel, searchInput, false);
    }, 400); // debounce 400ms

    return () => clearTimeout(handler);
  }, [searchInput, selectedLabel]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Tambahkan handler ketika password dialog ditutup:
  const handlePasswordDialogClose = () => {
    setIsPasswordDialogOpen(false);
    setPassword('');
    setPasswordError('');
    setPendingAction(null);
  };

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
    setHasMore(true);
    setVideos([]);

    fetchVideos(1, label, searchInput, false);
  };

  const executeAction = async (
    type: 'add' | 'edit' | 'delete',
    storedPassword: string
  ) => {

    if (type === 'add') {
      const addResponse = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: storedPassword,
        },
        body: JSON.stringify(formData),
      });

      if (!addResponse.ok) throw new Error("Add failed");

      setIsAddDialogOpen(false);

      // Refresh semua video dan labels
      await fetchMeta(); // untuk update allLabels
      fetchVideos(1, 'all', searchInput, false);
    }

    if (type === 'edit' && selectedVideo) {
      const editResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          authorization: storedPassword,
        },
        body: JSON.stringify(formData),
      });

      if (!editResponse.ok) throw new Error("Edit failed");

      setIsEditDialogOpen(false);
      setSelectedVideo(null);

      // Refresh allVideos dan fetch videos
      await fetchMeta();
      fetchVideos(currentPage, selectedLabel);
    }

    if (type === 'delete' && selectedVideo) {
      const deleteResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
        method: 'DELETE',
        headers: {
          authorization: storedPassword,
        },
      });

      if (!deleteResponse.ok) throw new Error("Delete failed");

      setIsDeleteDialogOpen(false);
      setSelectedVideo(null);

      // Refresh allVideos dan fetch videos
      await fetchMeta();
      fetchVideos(currentPage, selectedLabel);
    }
  };

  // Verify password and execute action
  // Ubah verifyPassword function:
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

      // Password benar
      setPasswordError('');
      setIsPasswordDialogOpen(false);
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_pass", password);

      // Jalankan action yang tertunda
      if (pendingAction) {
        if (pendingAction.type === 'add') {
          setFormData({
            title: '',
            embedLink: '',
            thumbnailLink: '',
            downloadLink: '',
            labels: [],
            newLabel: '',
          });
          setIsAddDialogOpen(true);
        } 
        else if (pendingAction.type === 'edit' && pendingAction.data) {
          setSelectedVideo(pendingAction.data);
          setFormData({
            title: pendingAction.data.title,
            embedLink: pendingAction.data.embedLink,
            thumbnailLink: pendingAction.data.thumbnailLink,
            downloadLink: pendingAction.data.downloadLink,
            labels: [...pendingAction.data.labels],
            newLabel: '',
          });
          setIsEditDialogOpen(true);
        }
        else if (pendingAction.type === 'delete' && pendingAction.data) {
          setSelectedVideo(pendingAction.data);
          setIsDeleteDialogOpen(true);
        }
        
        setPendingAction(null);
      }

      setPassword('');
    } catch (err) {
      console.error(err);
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

  const toggleExistingLabel = (label: string) => {
    setFormData(prev => {
      const isSelected = prev.labels.includes(label);

      return {
        ...prev,
        labels: isSelected
          ? prev.labels.filter(l => l !== label) // remove
          : [...prev.labels, label],             // add
      };
    });
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
    if (!isAuthenticated) {
      setPendingAction({ type: 'add' });
      setIsPasswordDialogOpen(true);
      return;
    }
    
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
    const saved = sessionStorage.getItem("admin_pass");

    if (saved) {
      executeAction('add', saved);
    } else {
      setActionType('add');
      setIsPasswordDialogOpen(true);
    }
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

    const saved = sessionStorage.getItem("admin_pass");

    if (saved) {
      executeAction('edit', saved);
    } else {
      setActionType('edit');
      setIsPasswordDialogOpen(true);
    }
  };

  // Handle delete video
  const handleDeleteVideo = () => {
    if (!selectedVideo) return;

    const saved = sessionStorage.getItem("admin_pass");

    if (saved) {
      executeAction('delete', saved);
    } else {
      setActionType('delete');
      setIsPasswordDialogOpen(true);
    }
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
          <a href="/" rel="noopener noreferrer">
            <h1 className="text-2xl font-bold text-white">Docult</h1>
          </a>

          {/* Desktop menu */}
          <div className="hidden md:flex flex-1 items-center gap-4 justify-between">
            {/* Search di tengah */}
            <div className="flex-1 flex justify-center">
              <div className="relative flex w-full max-w-2xl">

                {/* INPUT */}
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by title..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pr-8 bg-black text-white"
                  />
                </div>
              </div>
            </div>

            {/* Filter + Add di kanan */}
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                  <SelectTrigger id="labelFilter" className="w-60 text-white">
                    <SelectValue placeholder="All Labels" />
                  </SelectTrigger>
                  <SelectContent className="text-white bg-black border-gray-700">
                    <SelectItem value="all">All Labels ({totalVideos})</SelectItem>
                    {Array.from(labelCounts.keys())
                      .sort((a, b) => a.localeCompare(b))
                      .map(label => (
                      <SelectItem key={label} value={label}>
                        {label} ({labelCounts.get(label)})
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
              <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                <SelectTrigger id="labelFilterMobile" className="w-full text-white">
                  <SelectValue placeholder="All Labels" />
                </SelectTrigger>
                <SelectContent className="text-white bg-black">
                    <SelectItem value="all">All Labels ({totalVideos})</SelectItem>
                    {Array.from(labelCounts.keys())
                      .sort((a, b) => a.localeCompare(b))
                      .map(label => (
                      <SelectItem key={label} value={label}>
                        {label} ({labelCounts.get(label)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative">
                  <Input
                    placeholder="Search by title..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pr-8 bg-black text-white"
                  />
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
              <p>No videos found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-2">
              {videos
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
                      <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[90%]">
                        {/* LABEL UTAMA — mobile & desktop */}
                        {video.labels.slice(0, 1).map(label => (
                          <Badge
                            key={label}
                            variant="secondary"
                            className="
                              bg-black/60 text-white rounded
                              text-[10px] px-0.5 py-0
                              sm:text-xs sm:px-1 sm:py-0.5
                            "
                          >
                            {label}
                          </Badge>
                        ))}

                        {/* LABEL KE-2 — desktop only */}
                        {video.labels.length > 1 && (
                          <Badge
                            variant="secondary"
                            className="
                              hidden sm:inline-flex
                              bg-black/60 text-white rounded
                              text-xs px-1 py-0.5
                            "
                          >
                            {video.labels[1]}
                          </Badge>
                        )}

                        {/* +N — mobile & desktop */}
                        {video.labels.length > 2 && (
                          <Badge
                            variant="secondary"
                            className="
                              bg-black/60 text-white rounded
                              text-[10px] px-0.5 py-0
                              sm:text-xs sm:px-1 sm:py-0.5
                            "
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

              {/* Load More Trigger untuk Infinite Scroll */}
              <div ref={loadMoreRef} className="col-span-full h-4"></div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingMore && (
            <div className="flex justify-center mt-4">
              <p className="text-gray-400">Loading...</p>
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
                {selectedVideo.embedLink.endsWith('.mp4') ? (
                  <video
                    src={selectedVideo.embedLink}
                    controls
                    autoPlay
                    className="absolute inset-0 w-full h-full"
                  />
                ) : selectedVideo.embedLink.endsWith('.m3u8') ? (
                  <iframe
                    src={selectedVideo.embedLink}
                    title={selectedVideo.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <iframe
                    src={selectedVideo.embedLink}
                    title={selectedVideo.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )}
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

              {/* Width Controls + Close */}
              <div className="flex justify-center mt-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {[500, 820, 960].map(width => (
                    <Button
                      key={width}
                      variant={videoWidth === width ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoWidth(width as 500 | 820 | 960);
                      }}
                      size="sm"
                      className={
                        videoWidth === width
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-transparent text-white border-gray-700 hover:bg-gray-300'
                      }
                    >
                      {width}px
                    </Button>
                  ))}

                  {/* Tombol Close */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent text-white border-gray-700 hover:bg-gray-300"
                    onClick={() => setSelectedVideo(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="bg-transparent text-white border-gray-700 hover:bg-gray-300"
                  onClick={(e) => {
                  e.stopPropagation();
                  
                  if (!isAuthenticated) {
                    setSelectedVideo(selectedVideo);
                    setPendingAction({ type: 'edit', data: selectedVideo });
                    setIsPasswordDialogOpen(true);
                    return;
                  }
                  
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
                    
                    if (!isAuthenticated) {
                      setSelectedVideo(selectedVideo);
                      setPendingAction({ type: 'delete', data: selectedVideo });
                      setIsPasswordDialogOpen(true);
                      return;
                    }
                    
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" zIndex={200} >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Add Video</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
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
                placeholder="https://example.com/video.mp4"
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

                <div className="flex flex-wrap gap-2">
                  {allLabels.map(label => {
                    const selected = formData.labels.includes(label);

                    return (
                      <Badge
                        key={label}
                        onClick={() => toggleExistingLabel(label)}
                        className={`cursor-pointer select-none transition-all
                          ${
                            selected
                              ? 'bg-white text-black border border-black'
                              : 'bg-black text-white hover:bg-gray-700'
                          }`}
                      >
                        {selected}
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER STICKY */}
          <div className="shrink-0 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-200"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-200"
              onClick={handleAddVideo}
              disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}
            >
              Add Video
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] flex flex-col"
          zIndex={200}
        >
          {/* HEADER */}
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>

          {/* BODY (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto px-6 pr-4 space-y-4">
            <div>
              <Label htmlFor="editTitle">Title *</Label>
              <Input
                id="editTitle"
                value={formData.title}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="editEmbedLink">Embed Link *</Label>
              <Input
                id="editEmbedLink"
                value={formData.embedLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, embedLink: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="editThumbnailLink">Thumbnail Link *</Label>
              <Input
                id="editThumbnailLink"
                value={formData.thumbnailLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, thumbnailLink: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="editDownloadLink">Download Link (optional)</Label>
              <Input
                id="editDownloadLink"
                value={formData.downloadLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, downloadLink: e.target.value }))
                }
              />
            </div>

            {/* LABELS */}
            <div>
              <Label>Labels</Label>

              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.newLabel}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, newLabel: e.target.value }))
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add a label"
                />
                <Button
                  type="button"
                  onClick={handleAddLabel}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {formData.labels.map(label => (
                  <Badge key={label} className="bg-black text-white">
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

              <div className="mt-4">
                <p className="text-sm text-black mb-2">Existing labels:</p>

                <div className="flex flex-wrap gap-2">
                  {allLabels.map(label => {
                    const selected = formData.labels.includes(label);

                    return (
                      <Badge
                        key={label}
                        onClick={() => toggleExistingLabel(label)}
                        className={`cursor-pointer transition-all
                          ${
                            selected
                              ? 'bg-white text-black border border-black'
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
          </div>

          {/* FOOTER (STICKY) */}
          <div className="shrink-0 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-200"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-200"
              onClick={handleEditVideo}
              disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}
            >
              Save Changes
            </Button>
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
      <Dialog open={isPasswordDialogOpen} onOpenChange={handlePasswordDialogClose}>
        <DialogContent zIndex={200}>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password"></Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                ref={inputRef}
                placeholder="Password....."
              />
              {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                className="border-gray-700 text-black hover:bg-gray-200" 
                onClick={handlePasswordDialogClose}
              >
                Cancel
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-700 text-black hover:bg-gray-200" 
                onClick={verifyPassword}
              >
                Authenticate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
