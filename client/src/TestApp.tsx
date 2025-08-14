function TestApp() {
  return (
    <div style={{ backgroundColor: 'red', color: 'white', padding: '20px' }}>
      <h1>Test App - If you see this, React is working!</h1>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  )
}

export default TestApp