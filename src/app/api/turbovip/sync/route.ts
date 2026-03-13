import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 })
    }

    // 🔥 ambil semua title yang sudah ada di database
    const existingVideos = await prisma.video.findMany({
      select: { title: true }
    })

    const existingTitles = new Set(existingVideos.map(v => v.title))

    const foldersRes = await fetch(
      `https://api.turboviplay.com/listFolder?keyApi=${apiKey}`
    )

    const foldersData = await foldersRes.json()

    const folders = Array.isArray(foldersData)
      ? foldersData
      : [foldersData]

    let inserted = 0
    let skipped = 0

    for (const folder of folders) {

      let page = 1
      let hasMore = true

      while (hasMore) {

        const listRes = await fetch(
          `https://api.turboviplay.com/listFile?keyApi=${apiKey}&page=${page}&perPage=500&folder=${encodeURIComponent(
            folder.nameFolder
          )}`
        )

        const listData = await listRes.json()

        const files = listData.file || []

        if (files.length === 0) {
          hasMore = false
          break
        }

        for (const file of files) {

          // 🔧 label tanpa JSON
          const labels = file.folder
            ? file.folder.split(",").map((f: string) => f.trim()).join(",")
            : ""

          // 🔥 cek duplikat pakai memory (super cepat)
          if (existingTitles.has(file.title)) {
            skipped++
            continue
          }

          await prisma.video.create({
            data: {
              title: file.title,
              embedLink: file.embedLink,
              thumbnailLink: file.poster,
              downloadLink: "",
              labels: labels
            }
          })

          existingTitles.add(file.title)
          inserted++
        }

        page++
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