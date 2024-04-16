import { Engine } from '@babylonjs/core/Engines/engine'
import { createMenuScene } from './createMenuScene.ts'

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.position = 'fixed'
  canvas.id = 'gameCanvas'
  document.body.appendChild(canvas)
  return canvas
}

function handleWindowResize(canvas: HTMLCanvasElement, engine: Engine) {
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    engine.resize()
  })
}

function createFpsContainer() {
  const fpsDisplay = document.createElement('div')
  fpsDisplay.style.position = 'absolute'
  fpsDisplay.style.top = '10px'
  fpsDisplay.style.left = '10px'
  fpsDisplay.style.color = 'white'
  document.body.appendChild(fpsDisplay)

  return function updateFps(fps: number) {
    fpsDisplay.textContent = `FPS: ${fps.toFixed()}`
  }
}

export function renderCanvas() {
  const canvas = createCanvas()
  const engine = new Engine(canvas)
  handleWindowResize(canvas, engine)

  const updateFps = createFpsContainer()
  const menuScene = createMenuScene(engine)

  engine.runRenderLoop(() => {
    updateFps(engine.getFps())
    menuScene.render()
  })
}
