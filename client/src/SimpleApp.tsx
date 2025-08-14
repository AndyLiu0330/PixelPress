import { useState } from 'react'

function SimpleApp() {
  const [message] = useState('PixelPress is working!')

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 text-blue-400">
          {message}
        </h1>
        <p className="text-lg text-gray-300">
          This is a simplified version to test if React and Tailwind are working.
        </p>
        <div className="mt-8 p-4 bg-blue-500 rounded-lg">
          <p>If you can see this blue box with rounded corners, Tailwind CSS is working!</p>
        </div>
      </div>
    </div>
  )
}

export default SimpleApp