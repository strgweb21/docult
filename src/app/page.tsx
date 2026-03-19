'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Play, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  embedLink: string;
  thumbnailLink: string;
  downloadLink: string;
  labels: string[];
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
  const [labelCounts, setLabelCounts] = useState<Map<string, number>>(new Map());
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [totalVideos, setTotalVideos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoWidth, setVideoWidth] = useState<500 | 820 | 960>(820);
  const [showInfo, setShowInfo] = useState(true);

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<string>('created_desc');
  const [searchInput, setSearchInput] = useState('');
  const [gridCols, setGridCols] = useState(4);
  
  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/videos/meta', { cache: 'no-store' });
      if (!res.ok) throw new Error();

      const data = await res.json();

      const counts = new Map<string, number>();
      data.labels.forEach((l: { label: string; count: number }) => counts.set(l.label, l.count));

      setLabelCounts(counts);
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
    fetchVideos(1, selectedLabel, '');
  }, [sort, selectedLabel]);

  useEffect(() => {
    fetchMeta();
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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLabelFilter = (label: string) => {
    setSelectedLabel(label);
    setCurrentPage(1);
    setHasMore(true);
    setVideos([]);
    fetchVideos(1, label, searchInput, false);
  };

  const openSettingsDialog = () => setIsSettingsDialogOpen(true);

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
                  <SelectContent className="text-white bg-black" onKeyDown={handleLabelKeyDown}>
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

                {/* Settings */}
                <Button
                  onClick={openSettingsDialog}
                  className="bg-white text-black hover:bg-gray-500 flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                </Button>
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
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2">
        <div className="max-w-8xl mx-auto">
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
              {videos.map(video => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
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
          {/* 🔧 Tombol Toggle Info */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
          >
            {showInfo ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <div className="flex flex-col lg:flex-row items-center gap-6 max-w-full max-h-[90vh]">
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

            {/* Video Info and Actions */}
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

                  {/* Width buttons hanya tampil di desktop */}
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

                  {/* Tombol Close tetap tampil */}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
