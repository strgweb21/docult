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

    // Ambil folder
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
        // Cek duplikat berdasarkan judul
        if (existingTitles.has(file.title)) {
          skipped++
          continue
        }

        const embed = `https://dclt.rpmvid.com/#${file.file_code}`

        videosToInsert.push({
          title: file.title,
          embedLink: embed,
          thumbnailLink: file.thumbnail,
          downloadLink: "",
          labels: folder.name
        })

        // Tambahkan judul ke Set agar dalam folder yang sama tidak duplikat
        existingTitles.add(file.title)
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