import React from 'react'
import { Button } from './components/ui/button'
import { Routes,Route } from 'react-router'
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/about" element={<div>About</div>} />
    </Routes>
  )
}

export default App