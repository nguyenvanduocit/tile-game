import { AdvancedDynamicTexture } from '@babylonjs/gui'

let advancedTexture: AdvancedDynamicTexture

export function getGlobalUI() {
  if (!advancedTexture)
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI')
  return advancedTexture
}
