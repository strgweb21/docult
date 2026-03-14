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

    // ambil video yang sudah ada
    const existingVideos = await prisma.video.findMany({
      select: { embedLink: true }
    })

    const existingLinks = new Set(
      existingVideos.map(v => v.embedLink)
    )

    // ambil folder
    const folderRes = await fetch(
      `https://rpmshare.com/api/folder/list?key=${apiKey}&fld_id=0&files=1`
    )

    const folderData = await folderRes.json()

    const folders = folderData.result.folders || []

    let inserted = 0
    let skipped = 0

    for (const folder of folders) {

      const fileRes = await fetch(
        `https://rpmshare.com/api/file/list?key=${apiKey}&fld_id=${folder.fld_id}`
      )

      const fileData = await fileRes.json()

      const files = fileData.result.files || []

      const videosToInsert: any[] = []

      for (const file of files) {

        const embed = `https://dclt.rpmvid.com/#${file.file_code}`

        if (existingLinks.has(embed)) {
          skipped++
          continue
        }

        videosToInsert.push({
          title: file.title,
          embedLink: embed,
          thumbnailLink: file.thumbnail,
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