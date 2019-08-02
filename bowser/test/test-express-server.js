const express = require('express')
const app = express()
const port = 31337

app.get('/', (req, res) => {
  res.json({
    headers: req.headers
  })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
