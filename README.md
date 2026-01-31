# Docult

Project ini dibuat sebagai playground + production-ready app menggunakan stack modern.

---

## 🚀 Tech Stack

* **Next.js (App Router)**
* **TypeScript**
* **Bun** (runtime & package manager)
* **Prisma ORM**
* **Supabase** (Postgres + Auth)
* **Tailwind CSS + shadcn/ui**

---

## ✨ Features

* 🔐 Authentication (Supabase)
* 📁 Video management
* 🏷 Label filtering (alphabetical)
* 📱 Responsive (desktop + mobile)
* ➕ CRUD content
* 🔍 Search & filter
* 🌙 Modern UI

---

## 📦 Installation

Clone repository:

```bash
git clone https://github.com/USERNAME/REPO.git
cd Docult
```

Install dependencies:

```bash
bun install
```

---

## ⚙️ Environment Setup

Create `.env`:

```env
DATABASE_URL="postgresql://..."
ADMIN_PASSWORD="..."
NODE_ENV="development"
```

---

## 🧱 Prisma Setup

```bash
bunx prisma generate
bunx prisma migrate dev
```

---

## ▶️ Run Locally

```bash
bun run dev
```

Open:

```
http://localhost:3000
```

---

## 🏗 Build Production

```bash
bun run build
bun run start
```

---

## 📂 Project Structure

```
src/
 ├ app/        # Next app router
 ├ components/
 ├ lib/
 └ prisma/
```

---

## 🧠 Notes

* Jangan lupa clear `.next` kalau error build:

```bash
rmdir /s /q .next
```

* Kalau font error: pastikan pakai Google font valid

---

## 📌 Roadmap

* [ ] Playlist
* [ ] Favorite video
* [ ] Admin dashboard
* [ ] Analytics
