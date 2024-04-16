import type { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'

export function createScene(engine: Engine): Scene {
  const scene = new Scene(engine)
  scene.autoClear = false // Color buffer
  scene.autoClearDepthAndStencil = false // Depth and stencil, obviously
  return scene
}
