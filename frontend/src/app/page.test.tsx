import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Home page', () => {
  it('renders without crashing', () => {
    render(<Home />)
    expect(screen.getByText(/Welcome to the Finance App/i)).toBeInTheDocument()
  })
})
