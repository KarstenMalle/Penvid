'use client'

import React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [data, setData] = useState<string>('')

  const fetchData = () => {
    fetch('http://localhost:8080/api/data', {
      headers: {
        Authorization: 'Basic ' + btoa('user:password'),
      },
    })
      .then((response) => response.text())
      .then((text) => setData(text))
      .catch((error) => console.error('Error fetching data:', error))
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Welcome to the Finance App!</h1>
        <p>Data from backend: {data}</p>
        <Button onClick={fetchData}>Fetch Data</Button>
        {/* Existing content here */}
      </main>
      {/* Rest of the existing component */}
    </div>
  )
}
