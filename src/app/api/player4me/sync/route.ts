import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 400 }
      )
    }

    // Ambil semua judul yang sudah ada di database
    const existingVideos = await prisma.video.findMany({
      select: { title: true }
    })
    const existingTitles = new Set(existingVideos.map(v => v.title))

    // Ambil folder dari API
    const folderRes = await fetch(
      "https://player4me.com/api/v1/video/folder",
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "api-token": apiKey
        }
      }
    )

    const folders = await folderRes.json()

    let inserted = 0
    let skipped = 0

    for (const folder of folders) {
      const videoRes = await fetch(
        `https://player4me.com/api/v1/video/folder/${folder.id}`,
        {
          method: "GET",
          headers: {
            "accept": "application/json",
            "api-token": apiKey
          }
        }
      )

      const videoData = await videoRes.json()
      const videos = videoData.data || []

      const videosToInsert: any[] = []

      for (const video of videos) {
        // Cek duplikat berdasarkan judul
        if (existingTitles.has(video.name)) {
          skipped++
          continue
        }

        const embed = `https://dclt.embed4me.com/#${video.id}`

        videosToInsert.push({
          title: video.name,
          embedLink: embed,
          thumbnailLink: video.poster,
          downloadLink: "",
          labels: folder.name
        })

        // Tambahkan judul ke Set agar dalam batch yang sama juga tidak duplikat
        existingTitles.add(video.name)
      }

      if (videosToInsert.length > 0) {
        await prisma.video.createMany({
          data: videosToInsert
        })
        inserted += videosToInsert.length
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}