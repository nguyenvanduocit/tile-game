import type { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core'
import { Vector3 } from '@babylonjs/core/Maths/math'

export function createCamera(canvas: HTMLCanvasElement, scene: Scene): ArcRotateCamera {
  // Parameters: alpha (rotation around the target in radians), beta (viewing angle from above in radians), radius (distance from the target), target (the target of the camera), scene
  const defaultTarget = new Vector3(0, 0, 0) // Default target is the origin
  const camera = new ArcRotateCamera('camera1', 0, Math.PI / 3, 160, defaultTarget, scene)
  camera.allowUpsideDown = false
  camera.panningSensibility = 40
  camera.lowerRadiusLimit = 10
  camera.upperRadiusLimit = 250

  camera.attachControl(canvas, true) // This will attach the camera to the canvas
  return camera
}
