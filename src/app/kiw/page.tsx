'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Settings, Play, ChevronLeft, ChevronRight, LogIn, LogOut, Loader2, Eye, EyeOff, CopyCheck } from 'lucide-react';
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
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [totalVideos, setTotalVideos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoStatus, setVideoStatus] = useState<Record<string, 'ok' | 'broken' | 'checking'>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'broken'>('all');
  const [videoWidth, setVideoWidth] = useState<500 | 820 | 960>(820);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [password, setPassword] = useState('');
  const [turbovipKey, setTurbovipKey] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  // BULK ACTION STATE
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkLabels, setBulkLabels] = useState<string[]>([]);
  const [bulkNewLabel, setBulkNewLabel] = useState('');
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const visibleVideos = videos;

  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [lastWatched, setLastWatched] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<string>('created_desc');
  const [watchFilter, setWatchFilter] = useState<'all' | 'watched' | 'unwatched' | 'last'>('all');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [gridCols, setGridCols] = useState(4);
  const [showInfo, setShowInfo] = useState(true);
  const [provider, setProvider] = useState<
    'turbovip' | 'byse' | 'rpmshare' | 'streamp2p' | 'seekstreaming' | 'player4me' | 'upnshare'
  >('turbovip');

  const [actionType, setActionType] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete';
    data?: Video | null;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    embedLink: '',
    thumbnailLink: '',
    downloadLink: '',
    labels: [] as string[],
    newLabel: '',
  });

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

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
          ...(sort && { sort }),
        });

        const res = await fetch(`/api/videos?${params}`);
        const data = await res.json();

        setVideos((prev) => (append ? [...prev, ...(data.videos || [])] : data.videos || []));
        setCurrentPage(page);
        setHasMore(data.pagination?.hasNextPage ?? false);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore, sort]
  );

  const checkVideoLink = useCallback(async (video: Video) => {
    // Set status checking
    setVideoStatus(prev => ({ ...prev, [video.id]: 'checking' }));

    const url = video.embedLink;
    // Deteksi apakah ini berkas video langsung (mp4, m3u8, dll)
    const isVideoFile = /\.(mp4|m3u8|ts|webm|ogg|mov|mkv)$/i.test(url.split('?')[0].split('#')[0]);

    if (isVideoFile) {
      // Gunakan elemen video untuk menguji aksesibilitas
      return new Promise<void>((resolve) => {
        const videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        videoEl.src = url;
        // Set crossorigin agar tidak terkendala credentials
        videoEl.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
          cleanup();
          setVideoStatus(prev => ({ ...prev, [video.id]: 'broken' }));
          resolve();
        }, 10000); // timeout 10 detik

        const onSuccess = () => {
          clearTimeout(timeout);
          cleanup();
          setVideoStatus(prev => ({ ...prev, [video.id]: 'ok' }));
          resolve();
        };

        const onError = () => {
          clearTimeout(timeout);
          cleanup();
          setVideoStatus(prev => ({ ...prev, [video.id]: 'broken' }));
          resolve();
        };

        const cleanup = () => {
          videoEl.removeEventListener('loadedmetadata', onSuccess);
          videoEl.removeEventListener('error', onError);
          videoEl.src = '';
          videoEl.load();
        };

        videoEl.addEventListener('loadedmetadata', onSuccess);
        videoEl.addEventListener('error', onError);
      });
    } else {
      // Fallback ke metode lama (fetch HEAD dengan mode no-cors)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        // Jika fetch tidak throw, anggap OK (walaupun tidak bisa lihat status HTTP)
        setVideoStatus(prev => ({ ...prev, [video.id]: 'ok' }));
      } catch {
        setVideoStatus(prev => ({ ...prev, [video.id]: 'broken' }));
      }
    }
  }, []);

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  };

  const setCookie = (name: string, value: string, days = 365) => {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/';
  };

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/videos/meta', { cache: 'no-store' });
      if (!res.ok) throw new Error();

      const data = await res.json();

      const counts = new Map<string, number>();
      data.labels.forEach((l: { label: string; count: number }) => counts.set(l.label, l.count));

      setLabelCounts(counts);
      setAllLabels(data.labels.map((l: any) => l.label));
      setTotalVideos(data.totalVideos);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          fetchVideos(currentPage + 1, selectedLabel, searchInput, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchVideos, isLoadingMore, hasMore, currentPage, selectedLabel]);

  useEffect(() => {
    const key = getCookie(`api_${provider}`);
    setTurbovipKey(key || '');
  }, [provider]);

  useEffect(() => {
    fetchVideos(1, selectedLabel, '');
  }, [sort, selectedLabel]);

  useEffect(() => {
    fetchMeta();

    const savedPass = getCookie('admin_pass');

    if (!savedPass) {
      setIsPasswordDialogOpen(true);
      return;
    }

    const verifyStoredPassword = async () => {
      try {
        const response = await fetch('/api/videos/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: savedPass }),
        });

        if (response.ok) {
          setIsAuthenticated(true);
          fetchVideos(1, selectedLabel);
        } else {
          setIsPasswordDialogOpen(true);
          setIsAuthenticated(false);
        }
      } catch {
        setIsPasswordDialogOpen(true);
        setIsAuthenticated(false);
      }
    };

    verifyStoredPassword();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setVideos([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchVideos(1, selectedLabel, searchInput, false);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, selectedLabel]);

  useEffect(() => {
    videos.forEach(video => {
      if (!videoStatus[video.id]) {
        checkVideoLink(video);
      }
    });
  }, [videos]);

  useEffect(() => {
    const watched = localStorage.getItem('watched_videos');
    const last = localStorage.getItem('last_video');

    if (watched) {
      setWatchedVideos(new Set(JSON.parse(watched)));
    }

    if (last) {
      setLastWatched(last);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePasswordDialogClose = () => {
    setIsPasswordDialogOpen(false);
    setPassword('');
    setPasswordError('');
    setPendingAction(null);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) fetchVideos(page, selectedLabel);
  };

  const handleLabelFilter = (label: string) => {
    setSelectedLabel(label);
    setCurrentPage(1);
    setHasMore(true);
    setVideos([]);
    fetchVideos(1, label, searchInput, false);
  };

  const executeAction = async (type: 'add' | 'edit' | 'delete', storedPassword: string) => {
    try {
      if (type === 'add') {
        const addResponse = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: storedPassword },
          body: JSON.stringify(formData),
        });
        if (!addResponse.ok) throw new Error('Add failed');
        showToast('Video added successfully', 'success');
        setIsAddDialogOpen(false);
        await fetchMeta();
        fetchVideos(1, 'all', searchInput, false);
      }

      if (type === 'edit' && selectedVideo) {
        const editResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', authorization: storedPassword },
          body: JSON.stringify(formData),
        });
        if (!editResponse.ok) throw new Error('Edit failed');
        showToast('Video updated successfully', 'success');
        setIsEditDialogOpen(false);
        setSelectedVideo(null);
        await fetchMeta();
        fetchVideos(currentPage, selectedLabel);
      }

      if (type === 'delete' && selectedVideo) {
        const deleteResponse = await fetch(`/api/videos/${selectedVideo.id}`, {
          method: 'DELETE',
          headers: { authorization: storedPassword },
        });
        if (!deleteResponse.ok) throw new Error('Delete failed');
        showToast('Video deleted successfully', 'success');
        setIsDeleteDialogOpen(false);
        setSelectedVideo(null);
        await fetchMeta();
        fetchVideos(currentPage, selectedLabel);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Operation failed', 'error');
    }
  };

  const handleBulkEditLabels = async () => {
    const saved = getCookie('admin_pass');
    if (!saved) {
      setActionType('edit');
      setIsPasswordDialogOpen(true);
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedVideos).map(id =>
          fetch(`/api/videos/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              authorization: saved,
            },
            body: JSON.stringify({
              labels: bulkLabels,
            }),
          })
        )
      );

      showToast('Bulk update success', 'success');
      setIsBulkEditDialogOpen(false);
      setSelectedVideos(new Set());
      setBulkLabels([]);

      fetchMeta();
      fetchVideos(1, selectedLabel);
    } catch {
      showToast('Bulk update failed', 'error');
    }
  };

  const verifyPassword = async () => {
    try {
      const response = await fetch('/api/videos/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setPasswordError('Invalid password');
        showToast('Invalid password', 'error');
        return;
      }

      setPasswordError('');
      setIsPasswordDialogOpen(false);
      setIsAuthenticated(true);
      setCookie('admin_pass', password, 365);
      showToast('Authenticated successfully', 'success');

      if (pendingAction) {
        if (pendingAction.type === 'add') {
          setFormData({ title: '', embedLink: '', thumbnailLink: '', downloadLink: '', labels: [], newLabel: '' });
          setIsAddDialogOpen(true);
        } else if (pendingAction.type === 'edit' && pendingAction.data) {
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
        } else if (pendingAction.type === 'delete' && pendingAction.data) {
          setSelectedVideo(pendingAction.data);
          setIsDeleteDialogOpen(true);
        }
        setPendingAction(null);
      }

      setPassword('');
    } catch (err) {
      console.error(err);
      setPasswordError('Invalid password');
      showToast('Invalid password', 'error');
    }
  };

  const handleAddLabel = () => {
    if (!formData.newLabel.trim()) return;
    const newLabels = formData.newLabel
      .split(/,|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length);

    setFormData((prev) => ({
      ...prev,
      labels: Array.from(new Set([...prev.labels, ...newLabels])),
      newLabel: '',
    }));
  };

  const toggleExistingLabel = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter((l) => l !== label)
        : [...prev.labels, label],
    }));
  };

  const handleRemoveLabel = (label: string) => {
    setFormData((prev) => ({ ...prev, labels: prev.labels.filter((l) => l !== label) }));
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  };

  const openAddDialog = () => {
    if (!isAuthenticated) {
      setPendingAction({ type: 'add' });
      setIsPasswordDialogOpen(true);
      return;
    }

    setFormData({ title: '', embedLink: '', thumbnailLink: '', downloadLink: '', labels: [], newLabel: '' });
    setIsAddDialogOpen(true);
  };

  const openSettingsDialog = () => setIsSettingsDialogOpen(true);

  const handleAddVideo = () => {
    const saved = getCookie('admin_pass');
    if (saved) executeAction('add', saved);
    else {
      setActionType('add');
      setIsPasswordDialogOpen(true);
    }
  };

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

  const handleEditVideo = () => {
    if (!selectedVideo) return;
    const saved = getCookie('admin_pass');
    if (saved) executeAction('edit', saved);
    else {
      setActionType('edit');
      setIsPasswordDialogOpen(true);
    }
  };

  const handleDeleteVideo = () => {
    if (!selectedVideo) return;
    const saved = getCookie('admin_pass');
    if (saved) executeAction('delete', saved);
    else {
      setActionType('delete');
      setIsPasswordDialogOpen(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVideo(null);
      if (e.key === 'ArrowLeft') prevVideo();
      if (e.key === 'ArrowRight') nextVideo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideo, videos]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectedVideo) setSelectedVideo(null);
  };

  const handleTurboSync = async () => {
    if (!turbovipKey) return;
    try {
      setSyncLoading(true);
      const res = await fetch(`/api/${provider}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: turbovipKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Sync gagal', 'error');
        return;
      }

      showToast(
        `Sync selesai: ${data.inserted} video ditambahkan, ${data.skipped} duplikat`,
        'success'
      );
      fetchMeta();
      fetchVideos(1, selectedLabel);
    } catch (error) {
      showToast('Terjadi kesalahan saat sync', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    const visible = 6;
    return key.slice(0, visible) + key.slice(visible).replace(/./g, '•');
  };

  const sortOptions: { key: string; label: string }[] = [
    { key: 'created_desc', label: 'Newest' },
    { key: 'created_asc', label: 'Oldest' },
    { key: 'title_asc', label: 'A-Z' },
    { key: 'title_desc', label: 'Z-A' },
  ];

  const toggleSort = () => {
    const currentIndex = sortOptions.findIndex((s) => s.key === sort);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSort(sortOptions[nextIndex].key);
  };

  const currentVideoIndex = useMemo(() => {
    return selectedVideo ? videos.findIndex((v) => v.id === selectedVideo.id) : -1;
  }, [selectedVideo, videos]);

  const filteredLabels = useMemo(() => {
    if (!formData.newLabel.trim()) return allLabels;

    return allLabels.filter(label =>
      label.toLowerCase().includes(formData.newLabel.toLowerCase())
    );
  }, [formData.newLabel, allLabels]);

  const sortedLabels = useMemo(() => {
    return Array.from(labelCounts.keys()).sort((a, b) => a.localeCompare(b));
  }, [labelCounts]);

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (key.length === 1 && /[a-z0-9]/.test(key)) {
      const found = sortedLabels.find(label =>
        label.toLowerCase().startsWith(key)
      );

      if (found && labelRefs.current[found]) {
        labelRefs.current[found]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  };

  const prevVideo = () => {
    if (currentVideoIndex > 0) setSelectedVideo(videos[currentVideoIndex - 1]);
  };

  const nextVideo = () => {
    if (currentVideoIndex >= 0 && currentVideoIndex < videos.length - 1)
      setSelectedVideo(videos[currentVideoIndex + 1]);
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 10000);
  }, []);

  const SkeletonCard = () => (
    <div className="aspect-video bg-gray-800 rounded animate-pulse" />
  );

  const toggleBulkLabel = (label: string) => {
    setBulkLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const handleAddBulkLabel = () => {
    if (!bulkNewLabel.trim()) return;

    const newLabels = bulkNewLabel
      .split(/,|\n/)
      .map(l => l.trim())
      .filter(Boolean);

    setBulkLabels(prev =>
      Array.from(new Set([...prev, ...newLabels]))
    );

    setBulkNewLabel('');
  };

  const filteredBulkLabels = useMemo(() => {
    if (!bulkNewLabel.trim()) return allLabels;

    return allLabels.filter(label =>
      label.toLowerCase().includes(bulkNewLabel.toLowerCase())
    );
  }, [bulkNewLabel, allLabels]);

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
              <div className="flex items-center gap-2">
                {/* Filter */}
                <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                  <SelectTrigger id="labelFilter" className="w-60 text-white">
                    <SelectValue placeholder="All Labels" />
                  </SelectTrigger>
                  <SelectContent
                    className="text-white bg-black"
                    onKeyDown={handleLabelKeyDown}
                  >
                    <SelectItem value="all">All Labels ({totalVideos})</SelectItem>
                    {Array.from(labelCounts.keys())
                      .sort((a, b) => a.localeCompare(b))
                      .map((label) => (
                        <SelectItem
                          key={label}
                          value={label}
                          ref={(el) => {
                            labelRefs.current[label] = el;
                          }}
                        >
                          {label} ({labelCounts.get(label)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => {
                    setIsBulkMode(prev => !prev);
                    setSelectedVideos(new Set());
                  }}
                  className="bg-white text-black hover:bg-gray-500 flex items-center gap-1"
                >
                  {isBulkMode ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <CopyCheck className="w-4 h-4" />
                  )}
                </Button>

                {isBulkMode && (
                  <Button
                    onClick={() => {
                      const visibleIds = visibleVideos.map(v => v.id);

                      const isAllSelected = visibleIds.every(id => selectedVideos.has(id));

                      if (isAllSelected) {
                        const newSet = new Set(selectedVideos);
                        visibleIds.forEach(id => newSet.delete(id));
                        setSelectedVideos(newSet);
                      } else {
                        const newSet = new Set(selectedVideos);
                        visibleIds.forEach(id => newSet.add(id));
                        setSelectedVideos(newSet);
                      }
                    }}
                    className="bg-white text-black hover:bg-gray-500"
                  >
                    {visibleVideos.every(v => selectedVideos.has(v.id))
                      ? 'Unselect All'
                      : 'Select All'}
                  </Button>
                )}

                {/* Settings */}
                <Button
                  onClick={openSettingsDialog}
                  className="bg-white text-black hover:bg-gray-500 flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                </Button>

                {/* Add Video – hanya muncul jika sudah login */}
                {isAuthenticated && (
                  <Button
                    onClick={openAddDialog}
                    className="bg-white text-black hover:bg-gray-500 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Burger Menu untuk mobile */}
          <button
            className="text-white md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 grid grid-cols-2 gap-4 bg-black p-4 rounded-lg">
            {/* Filter */}
            <div>
              <Select value={selectedLabel} onValueChange={handleLabelFilter}>
                <SelectTrigger id="labelFilterMobile" className="w-full text-white">
                  <SelectValue placeholder="All Labels" />
                </SelectTrigger>
                <SelectContent className="text-white bg-black">
                  <SelectItem value="all">All Labels ({totalVideos})</SelectItem>
                  {Array.from(labelCounts.keys())
                    .sort((a, b) => a.localeCompare(b))
                    .map((label) => (
                      <SelectItem key={label} value={label}>
                        {label} ({labelCounts.get(label)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Settings */}
            <Button
              onClick={openSettingsDialog}
              className="bg-white text-black hover:bg-gray-500 flex items-center gap-1 justify-center"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Search */}
            <div className="col-span-1">
              <Input
                placeholder="Search by title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pr-8 bg-black text-white"
              />
            </div>

            {/* Add Video / Masuk */}
              {isAuthenticated && (
                  <Button
                    onClick={openAddDialog}
                    className="bg-white text-black hover:bg-gray-500 flex items-center gap-1 justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
          </div>
        )}
      </header>

      {/* Main Content */}
      {isAuthenticated && (
        <main className="flex-1 p-2">
          <div className="max-w-8xl mx-auto">
            {isBulkMode && selectedVideos.size > 0 && (
              <div className="mb-4 flex gap-2 items-center">
                <span className="text-white text-sm">
                  {selectedVideos.size} selected
                </span>

                <Button
                  onClick={() => setIsBulkEditDialogOpen(true)}
                  className="bg-white text-black hover:bg-gray-500"
                >
                  Edit Labels
                </Button>

                <Button
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  className="bg-red-700 text-white hover:bg-red-600"
                >
                  Delete Selected
                </Button>
              </div>
            )}
            {/* Video Grid */}
            {videos.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <p>No videos found.</p>
              </div>
            ) : (
              <div
                className={`grid gap-4 grid-cols-2 lg:grid-cols-4${viewMode === 'grid' ? '' : 'grid-cols-1'}`}
                style={{ gridTemplateColumns: viewMode === 'grid' ? window.innerWidth < 768 ? 'repeat(2, minmax(0, 1fr))' : `repeat(${gridCols}, minmax(0, 1fr))` : '1fr' }}
              >
                {videos
                  .filter(video => {
                    // 🔹 filter status (existing)
                    if (statusFilter !== 'all' && videoStatus[video.id] !== statusFilter) {
                      return false;
                    }

                    // 🔹 filter watch history (baru)
                    if (watchFilter === 'watched' && !watchedVideos.has(video.id)) {
                      return false;
                    }

                    if (watchFilter === 'unwatched' && watchedVideos.has(video.id)) {
                      return false;
                    }

                    if (watchFilter === 'last' && lastWatched !== video.id) {
                      return false;
                    }

                    return true;
                  })
                  .map(video => (
                <div
                  key={video.id}
                  onClick={() => {
                    if (isBulkMode) {
                      toggleSelectVideo(video.id);
                      return;
                    }

                    setSelectedVideo(video);

                    setWatchedVideos(prev => {
                      const updated = new Set(prev);
                      updated.add(video.id);

                      localStorage.setItem('watched_videos', JSON.stringify([...updated]));
                      return updated;
                    });

                    setLastWatched(video.id);
                    localStorage.setItem('last_video', video.id);
                  }}
                  className={`
                    cursor-pointer group
                    ${viewMode === 'list' ? 'flex gap-4 items-center mb-4' : ''}
                  `}
                >
                  {/* Thumbnail dengan label di atas kiri */}
                  <div className={`
                    relative
                    ${viewMode === 'list' ? 'w-40 flex-shrink-0 aspect-auto rounded' : 'aspect-video overflow-hidden rounded bg-gray-900'}
                  `}>
                    {isBulkMode && (
                      <div className="absolute top-2 right-2 z-20">
                        <input
                          type="checkbox"
                          checked={selectedVideos.has(video.id)}
                          onChange={() => toggleSelectVideo(video.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-white"
                        />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                      
                      {/* LEFT: Watch History */}
                      <div className="flex flex-col gap-1">
                        {lastWatched === video.id && (
                          <Badge className="
                              bg-black/60 text-white rounded
                              text-[10px] px-0.5 py-0
                              sm:text-xs sm:px-1 sm:py-0.5">Last</Badge>
                        )}
                        {watchedVideos.has(video.id) && lastWatched !== video.id && (
                          <Badge className="
                              bg-black/60 text-white rounded
                              text-[10px] px-0.5 py-0
                              sm:text-xs sm:px-1 sm:py-0.5">Watched</Badge>
                        )}
                      </div>

                      {/* RIGHT: Status Link */}
                      <div className="flex flex-col gap-1 items-end">
                        {videoStatus[video.id] === 'checking' && (
                          <Badge className="bg-yellow-600 text-white px-0.5 py-0 sm:text-xs sm:px-1 sm:py-0.5">Check</Badge>
                        )}
                        {videoStatus[video.id] === 'ok' && (
                          <Badge className="bg-green-600 text-white px-0.5 py-0 sm:text-xs sm:px-1 sm:py-0.5">Ok</Badge>
                        )}
                        {videoStatus[video.id] === 'broken' && (
                          <Badge className="bg-red-600 text-white px-0.5 py-0 sm:text-xs sm:px-1 sm:py-0.5">Broken</Badge>
                        )}
                      </div>

                    </div>
                    <img
                      src={video.thumbnailLink}
                      alt={video.title}
                      className={`
                        w-full h-full object-cover
                        transition-transform duration-300
                        group-hover:scale-105
                      `}
                      loading="lazy"
                      decoding="async"
                    />

                    {/* Labels di atas kiri */}
                    <div className={`
                      absolute top-2 left-2 flex gap-1 flex-wrap max-w-[90%]
                    `}>
                      {/* LABEL UTAMA */}
                      {Array.isArray(video.labels) &&
                        video.labels.slice(0, 1).map(label => (
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

                      {/* +N — mobile */}
                      {video.labels.length > 1 && (
                        <Badge
                          variant="secondary"
                          className="
                            sm:hidden
                            bg-black/60 text-white rounded
                            text-[10px] px-0.5 py-0
                          "
                        >
                          +{video.labels.length - 1}
                        </Badge>
                      )}

                      {/* +N — desktop */}
                      {video.labels.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="
                            hidden sm:inline-flex
                            bg-black/60 text-white rounded
                            text-xs px-1 py-0.5
                          "
                        >
                          +{video.labels.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Overlay dengan tombol play */}
                    <div className={`
                      absolute inset-0 bg-black/0 group-hover:bg-black/40
                      transition-colors duration-300 flex items-center justify-center
                    `}>
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  {/* Title & Labels di list mode */}
                  <div className={viewMode === 'list' ? 'flex-1' : 'mt-2'}>
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h3>
                    {viewMode === 'list' && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {video.labels.map(label => (
                          <Badge key={label} variant="secondary" className="bg-black/60 text-white text-xs px-1 py-0.5 rounded">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                    {isLoadingMore && videos.length === 0 && (
                      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                      </div>
                    )}
                </div>
              ))}

              {/* Load More Trigger untuk Infinite Scroll */}
              <div ref={loadMoreRef} className="col-span-full h-4"></div>

              </div>
            )}

            {/* Loading Indicator */}
            {isLoadingMore && (
              <div className="flex justify-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </main>
      )}

      {/* Full-screen Theater Overlay */}
      {/* Full-screen Theater Overlay */}
      {selectedVideo && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-2"
        >
          {/* 🔧 Tombol Toggle Info */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
          >
            {showInfo ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>

          <div className={`flex flex-col lg:flex-row items-center max-w-full max-h-[90vh] ${showInfo ? 'gap-6' : ''}`}>
            {/* Video Player */}
            <div
              className="relative bg-black w-full max-w-full"
              style={{
                width: isMobile ? '100vw' : `${videoWidth}px`,
              }}
            >
              {isBulkMode && (
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedVideos.has(selectedVideo.id)}
                    onChange={() => toggleSelectVideo(selectedVideo.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4"
                  />
                </div>
              )}
              <div className="relative w-full" style={{ paddingTop: `${100 / (16 / 9)}%` }}>
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

            {/* Panah Prev */}
            {currentVideoIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevVideo(); }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-transparent text-white p-2 rounded-full hover:bg-black/70"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Panah Next */}
            {currentVideoIndex < videos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextVideo(); }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent text-white p-2 rounded-full hover:bg-black/70"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* 🔧 Panel Info – hanya dirender jika showInfo true */}
            {showInfo && (
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
                    {!isMobile && [500, 820, 960].map(width => (
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
                            ? 'bg-white text-black hover:bg-gray-500'
                            : 'bg-transparent text-white border-gray-700 hover:bg-gray-500'
                        }
                      >
                        {width}px
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent text-white border-gray-700 hover:bg-gray-500"
                      onClick={() => setSelectedVideo(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className="bg-transparent text-white border-gray-700 hover:bg-gray-500"
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
                  )}
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className="bg-transparent text-white border-gray-700 hover:bg-gray-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideo(selectedVideo);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  {selectedVideo.downloadLink && (
                    <Button
                      variant="outline"
                      className="bg-transparent text-white border-gray-700 hover:bg-gray-500"
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
            )}
          </div>
        </div>
      )}

      {/* Add Video Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-black text-white border border-gray-800">

          {/* HEADER */}
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-800">
            <DialogTitle className="text-lg font-semibold text-center">
              Add Video
            </DialogTitle>
          </DialogHeader>
          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* PROVIDER + API */}
            <div className="flex items-center gap-3 w-full">

              {/* PROVIDER */}
              <Select
                value={provider}
                onValueChange={(v) =>
                  setProvider(v as "turbovip" | "byse" | "rpmshare" | "streamp2p" | "seekstreaming" | "player4me" | 'upnshare')
                }
              >
                <SelectTrigger className="w-[140px] shrink-0 bg-white text-black border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black text-white border-gray-700">
                  <SelectItem value="turbovip">TurboVip</SelectItem>
                  <SelectItem value="byse">BYSE</SelectItem>
                  <SelectItem value="rpmshare">RPMShare</SelectItem>
                  <SelectItem value="streamp2p">StreamP2P</SelectItem>
                  <SelectItem value="seekstreaming">SeekStreaming</SelectItem>
                  <SelectItem value="player4me">Player4Me</SelectItem>
                  <SelectItem value="upnshare">UPnShare</SelectItem>
                </SelectContent>
              </Select>
              {/* API KEY INPUT (AUTO WIDTH / CLIP) */}
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="API Key"
                  value={isEditingApiKey ? turbovipKey : maskApiKey(turbovipKey)}
                  onFocus={() => setIsEditingApiKey(true)}
                  onBlur={() => setIsEditingApiKey(false)}
                  onChange={(e) => {
                    const value = e.target.value;

                    setTurbovipKey(value);

                    setCookie(`api_${provider}`, value);
                  }}
                  className="w-full bg-black text-white border-gray-700"
                />
              </div>
              {/* SYNC BUTTON */}
              <Button
                onClick={handleTurboSync}
                disabled={syncLoading || !turbovipKey}
                className="shrink-0 bg-white text-black hover:bg-gray-500"
              >
                {syncLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {syncLoading ? "" : "Sync"}
              </Button>

            </div>
            {/* TITLE */}
            <div className="space-y-1">
              <Label className="text-gray-300">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
                className="bg-black text-white border-gray-700"
              />
            </div>
            {/* EMBED */}
            <div className="space-y-1">
              <Label className="text-gray-300">Embed Link *</Label>
              <Input
                value={formData.embedLink}
                onChange={(e) => setFormData(prev => ({ ...prev, embedLink: e.target.value }))}
                placeholder="https://example.com/video.mp4"
                className="bg-black text-white border-gray-700"
              />
            </div>
            {/* THUMBNAIL */}
            <div className="space-y-1">
              <Label className="text-gray-300">Thumbnail Link *</Label>
              <Input
                value={formData.thumbnailLink}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailLink: e.target.value }))}
                placeholder="https://example.com/thumbnail.jpg"
                className="bg-black text-white border-gray-700"
              />
            </div>
            {/* DOWNLOAD */}
            <div className="space-y-1">
              <Label className="text-gray-300">Download Link</Label>
              <Input
                value={formData.downloadLink}
                onChange={(e) => setFormData(prev => ({ ...prev, downloadLink: e.target.value }))}
                placeholder="Optional"
                className="bg-black text-white border-gray-700"
              />
            </div>
            {/* LABELS */}
            <div className="space-y-1">

              <Label className="text-gray-300">Labels</Label>

              <div className="flex gap-2">
                <Input
                  value={formData.newLabel}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLabel: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add label"
                  className="bg-black text-white border-gray-700"
                />

                <Button
                  type="button"
                  onClick={handleAddLabel}
                  className="bg-white text-black hover:bg-gray-500"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* SELECTED LABELS */}
              <div className="flex flex-wrap gap-2">
                {formData.labels.map(label => (
                  <Badge key={label} className="bg-white text-black">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3"/>
                    </button>
                  </Badge>
                ))}
              </div>
              {/* EXISTING LABELS */}
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Existing labels
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredLabels.map(label => {
                    const selected = formData.labels.includes(label)
                    return (
                      <Badge
                        key={label}
                        onClick={() => toggleExistingLabel(label)}
                        className={`cursor-pointer
                          ${
                            selected
                            ? 'bg-gray-800 text-white'
                            : 'bg-white text-black hover:bg-gray-500'
                          }
                        `}
                      >
                        {label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* FOOTER */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-500"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddVideo}
              disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}
              className="bg-white text-black hover:bg-gray-500"
            >
              Add Video
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Video Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] flex flex-col bg-black text-white border border-gray-800"
          zIndex={200}
        >
          {/* HEADER */}
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-800">
            <DialogTitle className="text-lg font-semibold">
              Edit Video
            </DialogTitle>
          </DialogHeader>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            <div className="space-y-1">
              <Label htmlFor="editTitle" className="text-gray-300">Title *</Label>
              <Input
                id="editTitle"
                value={formData.title}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                className="bg-black text-white border-gray-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editEmbedLink" className="text-gray-300">Embed Link *</Label>
              <Input
                id="editEmbedLink"
                value={formData.embedLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, embedLink: e.target.value }))
                }
                className="bg-black text-white border-gray-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editThumbnailLink" className="text-gray-300">Thumbnail Link *</Label>
              <Input
                id="editThumbnailLink"
                value={formData.thumbnailLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, thumbnailLink: e.target.value }))
                }
                className="bg-black text-white border-gray-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editDownloadLink" className="text-gray-300">
                Download Link
              </Label>
              <Input
                id="editDownloadLink"
                value={formData.downloadLink}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, downloadLink: e.target.value }))
                }
                className="bg-black text-white border-gray-700"
              />
            </div>
            {/* LABELS */}
            <div className="space-y-1">
              <Label className="text-gray-300">Labels</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.newLabel}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, newLabel: e.target.value }))
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  placeholder="Add label"
                  className="bg-black text-white border-gray-700"
                />
                <Button
                  type="button"
                  onClick={handleAddLabel}
                  className="bg-white text-black hover:bg-gray-500"
                >
                  <Plus className="h-4 w-4"/>
                </Button>
              </div>

              {/* SELECTED LABELS */}
              <div className="flex flex-wrap gap-2">
                {formData.labels.map(label => (
                  <Badge key={label} className="bg-white text-black">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3"/>
                    </button>
                  </Badge>
                ))}
              </div>
              {/* EXISTING LABELS */}
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Existing labels
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredLabels.map(label => {
                    const selected = formData.labels.includes(label)
                    return (
                      <Badge
                        key={label}
                        onClick={() => toggleExistingLabel(label)}
                        className={`cursor-pointer
                          ${
                            selected
                              ? 'bg-gray-800 text-white'
                              : 'bg-white text-black hover:bg-gray-500'
                          }
                        `}
                      >
                        {label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-500"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditVideo}
              disabled={!formData.title || !formData.embedLink || !formData.thumbnailLink}
              className="bg-white text-black hover:bg-gray-500"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          className="bg-black text-white border border-gray-800"
          zIndex={200}
        >
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to delete this video?
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              className="border-gray-700 text-black hover:bg-gray-500"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-700 text-white hover:bg-red-600"
              onClick={handleDeleteVideo}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-[90] bg-black pointer-events-none"></div>
      )}
      
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (!isAuthenticated) return;
          handlePasswordDialogClose();
        }}
      >
        <DialogContent
          className="bg-black text-white border border-gray-800"
          zIndex={200}
        >
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-800">
            <DialogTitle className="text-lg font-semibold text-center">Enter Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
              ref={inputRef}
              placeholder="Password..."
              className="bg-black text-white border-gray-700"
            />
            {passwordError && (
              <p className="text-sm text-red-500">
                {passwordError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="border-gray-700 text-black hover:bg-gray-500"
                onClick={handlePasswordDialogClose}
              >
                Cancel
              </Button>

              <Button
                onClick={verifyPassword}
                className="bg-white text-black hover:bg-gray-500"
              >
                Authenticate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-md bg-black text-white border border-gray-800">
          
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-800">
            <DialogTitle className="text-lg font-semibold text-center">Settings</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 w-full">
            {/* Sort Button full width */}
            <Button
              onClick={toggleSort}
              className="flex items-center justify-center gap-1 bg-white text-black hover:bg-gray-500 px-2 py-2 w-1/2"
            >
              {sortOptions.find(s => s.key === sort)?.label}
            </Button>

            {/* View Mode Toggle */}
            <Button
              onClick={() => setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))}
              className="flex items-center justify-center gap-1 bg-white text-black text-center hover:bg-gray-500 px-2 py-2 w-1/2"
            >
              {viewMode === 'grid' ? 'Grid View' : 'List View'}
            </Button>

              {/* Grid Columns Selector (only if grid view) */}
              {viewMode === 'grid' && (
                <Select value={gridCols.toString()} onValueChange={(v) => setGridCols(Number(v))}>
                  <SelectTrigger className="w-1/2 text-white text-center bg-black">
                    <SelectValue placeholder="Columns" />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-center text-white">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Columns
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

                <Select
                  value={watchFilter}
                  onValueChange={(v) =>
                    setWatchFilter(v as 'all' | 'watched' | 'unwatched' | 'last')
                  }
                >
                  <SelectTrigger className="w-1/2 text-white text-center bg-black">
                    <SelectValue placeholder="Watch Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white">
                    <SelectItem value="all">All Watch</SelectItem>
                    <SelectItem value="watched">Watched</SelectItem>
                    <SelectItem value="unwatched">Unwatched</SelectItem>
                    <SelectItem value="last">Last Watched</SelectItem>
                  </SelectContent>
                </Select>
              {!isAuthenticated ? (
                <Button
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="flex items-center justify-center gap-1 bg-white text-black hover:bg-gray-500 px-2 py-2 w-1/2"
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsAuthenticated(false);
                    setCookie('admin_pass', '', -1);
                    setIsAddDialogOpen(false);
                    setIsPasswordDialogOpen(true);
                  }}
                  className="flex items-center justify-center gap-1 bg-white text-black hover:bg-gray-500 px-2 py-2 w-1/2"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="bg-black text-white border border-gray-800">

          <DialogHeader>
            <DialogTitle>Edit Labels (Bulk)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* INPUT LABEL BARU */}
            <div className="flex gap-2">
              <Input
                value={bulkNewLabel}
                onChange={(e) => setBulkNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBulkLabel()}
                placeholder="Add label"
                className="bg-black text-white border-gray-700"
              />
              <Button
                onClick={handleAddBulkLabel}
                className="bg-white text-black"
              >
                +
              </Button>
            </div>

            {/* SELECTED LABELS */}
            <div className="flex flex-wrap gap-2">
              {bulkLabels.map(label => (
                <Badge key={label} className="bg-white text-black">
                  {label}
                  <button
                    onClick={() =>
                      setBulkLabels(prev => prev.filter(l => l !== label))
                    }
                    className="ml-1 hover:text-red-500"
                  >
                    ✕
                  </button>
                </Badge>
              ))}
            </div>

            {/* EXISTING LABELS */}
            <div>
              <p className="text-sm text-gray-400 mb-2">
                Existing labels
              </p>

              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {filteredBulkLabels.map(label => {
                  const selected = bulkLabels.includes(label);

                  return (
                    <Badge
                      key={label}
                      onClick={() => toggleBulkLabel(label)}
                      className={`cursor-pointer ${
                        selected
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-black hover:bg-gray-500'
                      }`}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* ACTION */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setIsBulkEditDialogOpen(false)}
                className="bg-white text-black hover:bg-gray-500"
              >
                Cancel
              </Button>

              <Button
                onClick={handleBulkEditLabels}
                className="bg-white text-black hover:bg-gray-500"
              >
                Save
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="bg-black text-white border border-gray-800">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </DialogHeader>

          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-bold">{selectedVideos.size}</span> videos?
            This action cannot be undone.
          </p>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              className="bg-white text-black hover:bg-gray-500"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              className="bg-white text-black hover:bg-gray-500"
              onClick={async () => {
                const saved = getCookie('admin_pass');

                if (!saved) {
                  setActionType('delete');
                  setIsPasswordDialogOpen(true);
                  return;
                }

                try {
                  await Promise.all(
                    Array.from(selectedVideos).map(id =>
                      fetch(`/api/videos/${id}`, {
                        method: 'DELETE',
                        headers: { authorization: saved },
                      })
                    )
                  );

                  showToast('Bulk delete success', 'success');
                  setSelectedVideos(new Set());
                  setIsBulkDeleteDialogOpen(false);

                  fetchMeta();
                  fetchVideos(1, selectedLabel);
                } catch {
                  showToast('Bulk delete failed', 'error');
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[200] px-4 py-2 rounded shadow-lg ${
          toast.type === 'success' ? 'bg-black border-b border-gray-700' : 'bg-black border-b border-gray-700'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}