import React from 'react'

const Navbar = () => {
  return (
    <nav>
    <ul className='flex justify-between' >
      <li><a href="/">Home</a></li>
      <li><a href="/fruits/new">Create a New Fruit</a></li>
    </ul>
  </nav>
  )
}

export default Navbar