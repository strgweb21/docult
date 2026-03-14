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

    const existingVideos = await prisma.video.findMany({
      select: { embedLink: true }
    })

    const existingLinks = new Set(
      existingVideos.map(v => v.embedLink)
    )

    // ambil folder
    const folderRes = await fetch(
      "https://seekstreaming.com/api/v1/video/folder",
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
        `https://seekstreaming.com/api/v1/video/folder/${folder.id}`,
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

        const embed = `https://dclt.embedseek.com/#${video.id}`

        if (existingLinks.has(embed)) {
          skipped++
          continue
        }

        videosToInsert.push({
          title: video.name,
          embedLink: embed,
          thumbnailLink: video.poster,
          downloadLink: "",
          labels: folder.name
        })

        existingLinks.add(embed)

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