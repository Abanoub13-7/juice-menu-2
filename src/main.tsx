import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { storeConfig } from './config/store'

document.title = `${storeConfig.nameAr} | ${storeConfig.nameEn} - المنيو`
const description = document.querySelector('meta[name="description"]')
description?.setAttribute('content', storeConfig.description)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
