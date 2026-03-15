import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Headers that mimic a typical browser request
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': new URL(url).origin, // use the video's own origin as referer
      'Connection': 'keep-alive',
    };

    // Helper to perform a fetch with timeout
    const fetchWithTimeout = async (
      fetchUrl: string,
      options: RequestInit,
      timeoutMs = 5000
    ) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(fetchUrl, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    // 1. Try HEAD first (fastest)
    let response = await fetchWithTimeout(
      url,
      { method: 'HEAD', headers },
      5000
    ).catch(() => null);

    // 2. If HEAD fails (network error or 403/405), try GET with Range (only first byte)
    if (!response || response.status === 403 || response.status === 405) {
      const getResponse = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            ...headers,
            Range: 'bytes=0-0', // ask for just the first byte
          },
        },
        5000
      ).catch(() => null);

      if (getResponse) {
        // A 206 Partial Content or 200 OK with a video MIME type usually means the video is accessible
        const contentType = getResponse.headers.get('content-type') || '';
        if (
          getResponse.status === 206 ||
          (getResponse.status === 200 && contentType.startsWith('video/')) ||
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegurl')
        ) {
          return NextResponse.json({
            ok: true,
            status: getResponse.status,
            statusText: getResponse.statusText,
            url: getResponse.url,
          });
        }
        // If we got a 200 but content-type is not video, it might be an error page
        // Fall through to treat as broken
      }
    }

    // 3. Evaluate the response we have (either from HEAD or failed GET)
    if (response) {
      // If status is in the 2xx range, consider it OK
      if (response.ok) {
        return NextResponse.json({
          ok: true,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        });
      }

      // Special case: 403 might be a false positive – but we already tried GET with Range above
      // If we reach here, it's likely truly broken
      return NextResponse.json({
        ok: false,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
    }

    // No response at all – completely broken
    return NextResponse.json(
      { error: 'Failed to fetch the link', ok: false, status: 0 },
      { status: 200 } // We still return 200 to the client with ok=false
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check link', ok: false, status: 0 },
      { status: 500 }
    );
  }
}