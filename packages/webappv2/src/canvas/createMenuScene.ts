import type { Engine } from '@babylonjs/core/Engines/engine'
import type { Scene } from '@babylonjs/core/scene'
import { ScenePerformancePriority } from '@babylonjs/core/scene'
import { Color3, Quaternion, Vector3 } from '@babylonjs/core/Maths/math'
import type { AbstractMesh, ArcRotateCamera, InstancedMesh, Mesh, Nullable } from '@babylonjs/core'
import { ActionManager, Animation, CreateCapsule, CreatePolyhedron, CubeTexture, EasingFunction, ExecuteCodeAction, GlowLayer, HemisphericLight, MeshBuilder, PBRMaterial, QuadraticEase, ReflectionProbe, SceneOptimizer, Sprite, SpriteManager, StandardMaterial, Texture, TransformNode } from '@babylonjs/core'
import type {
  FocusToTileEvent,
  RemovePlayerEvent,
  SpawnPlayerEvent,
  Tile,
  TileClickEvent,
  TilesSyncedEvent,
  UpdateTileEvent,
} from '@firegroup-culture/shared'
import {
  EventNames__FocusOnGame,
  EventNames__FocusOnMenu,
  EventNames__FocusOnPrize,
  EventNames__FocusToTile,
  EventNames__MenuClicked,
  EventNames__RemovePlayer,
  EventNames__RenderTiles,
  EventNames__SpawnPlayer,
  EventNames__TileClicked,
  EventNames__UpdateTile,
} from '@firegroup-culture/shared'
import { socket } from '../socket/service.ts'
import { showBallName } from './showBallActions.ts'
import { createScene } from './fns/createScene.ts'
import { createCamera } from './fns/createCamera.ts'
import { getGlobalUI } from './getGlobalUI.ts'

const ballDiameter = 10
const isLandSize = 40

function createSkybox(scene: Scene): Nullable<Mesh> {
  const hdrTexture = CubeTexture.CreateFromPrefilteredData('/textures/environment.dds', scene)
  return scene.createDefaultSkybox(hdrTexture, true, 10000)
}

function createStar(name: string, scene: Scene): Mesh {
  const options = {
    type: 1, // type 1 creates a dodecahedron which looks like a star
    size: 0.7,
  }
  const star = CreatePolyhedron(name, options, scene)
  const material = new PBRMaterial('starMaterial', scene)
  // color #e3232b
  material.albedoColor = new Color3(0.6, 0.5, 0)
  material.emissiveColor = new Color3(0.6, 0.5, 0)
  material.roughness = 0.1
  material.metallic = 0.5

  const glowLayer = new GlowLayer('glow', scene)
  glowLayer.addIncludedOnlyMesh(star)
  glowLayer.intensity = 0.3

  material.freeze()
  star.material = material
  star.isPickable = false
  star.freezeWorldMatrix()

  return star
}

let originalStar: Mesh
function injectStars(starCount: number, parentSphere: Mesh | InstancedMesh, scene: Scene, radius: number) {
  if (!originalStar) {
    originalStar = createStar(`star`, scene)
    originalStar.isVisible = false
  }

  const computedRadius = radius - (1 - starCount * 0.05) // Increase the radius for each star

  for (let i = 0; i < starCount; i++) {
    let x, z
    // If it's the first star, position it at the center
    if (i === 0) {
      x = 0
      z = 0
    }
    else {
    // Calculate the position of the star
      const angle = (i / (starCount - 1)) * 2 * Math.PI
      x = computedRadius * Math.cos(angle) // use the adjusted radius
      z = computedRadius * Math.sin(angle) // use the adjusted radius
    }
    // Clone the star and position it at the calculated position
    const clonedStar = originalStar.createInstance(`star${i}`)
    // random rotation
    clonedStar.rotation.y = Math.random() * 2 * Math.PI
    clonedStar.rotation.x = Math.random() * 2 * Math.PI
    clonedStar.rotation.z = Math.random() * 2 * Math.PI
    clonedStar.parent = parentSphere
    clonedStar.position.set(x, 0, z) // Position the star on the surface of the sphere
  }
}

function createDragonBall(id: string, name: string, scene: Scene): Mesh {
  const sphere = MeshBuilder.CreateSphere(name, { diameter: ballDiameter, segments: 16 }, scene)
  sphere.id = id
  const material = new PBRMaterial('dragonballmetal', scene)
  material.albedoColor = new Color3(1, 0.6, 0)
  material.alpha = 0.6
  material.roughness = 0.4
  material.metallic = 1
  material.emissiveColor = new Color3(1, 0.6, 0)
  material.emissiveIntensity = 0.0

  const glowLayer = new GlowLayer('glow', scene)
  glowLayer.addIncludedOnlyMesh(sphere)
  glowLayer.intensity = 0.2

  sphere.material = material
  return sphere
}

function addToRenderList(probe: ReflectionProbe, ...items: any[]) {
  items.forEach((item) => {
    if (!probe.renderList)
      throw new Error('probe.renderList is null')

    probe.renderList.push(item)
    item.reflectionTexture = probe.cubeTexture
  })
}

interface BallInfo {
  name: string
  id: string
}

const ballInfo: BallInfo[] = [
  {
    name: 'Giải đố',
    id: 'game',
  },
  {
    name: 'Leader Board',
    id: 'leaderboard',
  },
  {
    name: 'Settings',
    id: 'settings',
  },
  {
    name: 'Phần thưởng',
    id: 'prizes',
  },
  {
    name: 'Giúp đỡ',
    id: 'help',
  },
  {
    name: 'Profile',
    id: 'profile',
  },
  {
    name: 'Lobby',
    id: 'prizes',
  },
  {
    name: 'Xem thông điệp',
    id: 'game',
  },
]

function getJumpingAnimation(uid: string, player: Player) {
  // Define the running animation
  const frameRate = Math.random() * 2 + 4
  const runningAnimation = new Animation(`runningAnimation${uid}`, 'position.y', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)

  const keyFrames = []

  keyFrames.push({
    frame: 0,
    value: player.playerParent.position.y,
  })

  keyFrames.push({
    frame: 2,
    value: player.playerParent.position.y + 0.5 + Math.random() * 1,
  })

  keyFrames.push({
    frame: 3,
    value: player.playerParent.position.y,
  })

  keyFrames.push({
    frame: 4,
    value: player.playerParent.position.y,
  })

  runningAnimation.setKeys(keyFrames)

  // Create an easing function
  const easingFunction = new QuadraticEase()

  // Set the easing function to EASEINOUT mode
  easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)

  // Apply the easing function to the animation
  runningAnimation.setEasingFunction(easingFunction)

  return runningAnimation
}

let playerBaseMesh: Mesh
function getPlayerMess(name: string) {
  if (!playerBaseMesh)
    playerBaseMesh = CreateCapsule('playerBase', { height: 2, radius: 0.7 })

  return playerBaseMesh.clone(`playerMess${name}`)
}

let _playerHeadBase: Mesh
function getPlayerHeadBase(uid: string) {
  if (!_playerHeadBase) {
    _playerHeadBase = MeshBuilder.CreateBox('playerHeadBase', { width: 2, height: 2, depth: 2 })
    // create black material
    const playerHeadMaterial = new StandardMaterial('playerHeadMaterial')
    playerHeadMaterial.diffuseColor = Color3.Black()
    playerHeadMaterial.alpha = 1
    playerHeadMaterial.roughness = 0.4
    playerHeadMaterial.freeze()
    _playerHeadBase.material = playerHeadMaterial
  }
  return _playerHeadBase.clone(`playerHead${uid}`)
}

function spawnPlayer(scene: Scene, uid: string, name: string, picture: string, island: AbstractMesh) {
  const playerMaterial = new StandardMaterial(`playerMaterial${name}`)
  playerMaterial.diffuseColor = Color3.Random()
  playerMaterial.alpha = 1
  playerMaterial.roughness = 0.4
  playerMaterial.freeze()

  const playerParent = new TransformNode(`playerParent${uid}`)
  playerParent.parent = island
  // rotate randomly
  playerParent.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.random() * 2 * Math.PI, 0)

  const playerMesh = getPlayerMess(`player${name}`)
  playerMesh.material = playerMaterial
  playerMesh.parent = playerParent

  playerParent.position.set(getRandomPlayerCoordinate(), (isLandSize / 2) + 0.7, getRandomPlayerCoordinate())

  // update mat 1
  const playerHead = getPlayerHeadBase(uid)

  // create a face mesh
  const faceMesh = MeshBuilder.CreatePlane('face', { size: 2 }, scene)
  faceMesh.parent = playerHead
  faceMesh.position.set(0, 0, 1.01)
  faceMesh.rotationQuaternion = Quaternion.FromEulerAngles(Math.PI, 0, 0)
  const faceTexture = new Texture(picture, scene)
  const faceMaterial = new StandardMaterial('faceMaterial', scene)
  faceMaterial.diffuseTexture = faceTexture
  // rotate the face to face the camera
  faceMaterial.freeze()
  // rotate 90 degree
  faceMesh.rotation.y = Math.PI / 2
  faceMesh.material = faceMaterial

  playerHead.parent = playerParent
  playerHead.rotation.y = Math.PI / 2
  playerHead.position.set(0, 1.5, 0)

  const jumpAnimation = getJumpingAnimation(uid, { playerParent, headMesh: playerHead, faceMesh })
  playerParent.animations.push(jumpAnimation)
  scene.beginAnimation(playerParent, 0, 6, true)

  return {
    playerParent,
    headMesh: playerHead,
    faceMesh,
  }
}

function createDragonBalls(radius: number, ballInfo: BallInfo[], scene: Scene, island: Mesh) {
  const ringBalls = []
  let index = 0
  let firstBall: Mesh | undefined
  for (const info of ballInfo) {
    let x: number
    let angle: number
    let z: number

    if (index === 0) {
      x = 0
      z = 0
      angle = 0
    }
    else {
      angle = (index / (ballInfo.length - 1)) * 2 * Math.PI
      x = radius * Math.cos(angle)
      z = radius * Math.sin(angle)
    }

    if (firstBall === undefined) {
      firstBall = createDragonBall(info.id, info.name, scene)
      firstBall.parent = island
      injectStars(index + 1, firstBall, scene, 8 / 2)
      firstBall.position.set(x, (isLandSize / 2 + ballDiameter), z)
      ringBalls.push(firstBall)
    }
    else {
      const sphere = firstBall.createInstance(info.name)
      sphere.id = info.id
      sphere.parent = island
      injectStars(index + 1, sphere, scene, 8 / 2)
      sphere.position.set(x, (isLandSize / 2 + ballDiameter), z)
      ringBalls.push(sphere)
    }
    index++
  }

  for (const ball of ringBalls) {
    const animation = new Animation('rotationAnimation', 'rotation.y', 10, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
    const keys = [
      { frame: 0, value: 0 },
      { frame: 30, value: Math.PI },
      { frame: 60, value: 2 * Math.PI },
    ]
    animation.setKeys(keys)
    ball.animations.push(animation)
    scene.beginAnimation(ball, 0, 60, true) // Start the animation
  }

  return ringBalls
}

function createLight(scene: Scene) {
  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  const light = new HemisphericLight('light', new Vector3(10, 70, 10), scene)
  light.intensity = 0.7
}

const tileMarginTop = 6
function renderTiles(scene: Scene, island: Mesh | InstancedMesh, tileData: Tile[]) {
  const totalTiles = tileData.length
  const columns = 20
  const gap = 0.1
  const maxWidth = Math.floor((70 - (19 * gap)) / 20)

  const totalWidth = (maxWidth + gap) * columns - gap // total width of all tiles and gaps
  const totalDepth = (maxWidth + gap) * Math.ceil(totalTiles / columns) - gap // total depth of all tiles and gaps
  const offsetX = totalDepth / 2 - maxWidth / 2 + tileMarginTop
  const offsetZ = totalWidth / 2 - maxWidth / 2

  const tiles = []
  let originalTile: Mesh | undefined
  for (let i = 0; i < totalTiles; i++) {
    const tileHeight = 2
    let tile: Mesh
    const tileName = tileData[i].name
    if (!originalTile) {
      tile = MeshBuilder.CreateBox(tileName, {
        height: tileHeight,
        width: maxWidth,
        depth: maxWidth,
      }, scene)
      originalTile = tile
    }
    else {
      tile = originalTile.clone(tileName)
      if (!tile)
        throw new Error('Failed to clone tile')
    }

    tile.actionManager = new ActionManager(scene)
    tile.actionManager.registerAction(
      new ExecuteCodeAction(
        ActionManager.OnPickTrigger,
        () => {
          socket.emit(EventNames__TileClicked, { tileName } satisfies TileClickEvent)
        },
      ),
    )

    const tileTexture = new Texture(tileData[i].coverImageUrl, scene)
    // Tạo một material mới và gán texture cho nó
    const tileMaterial = new StandardMaterial(`tileMaterial${i}`, scene)
    tileMaterial.diffuseTexture = tileTexture
    // Gán material cho tile
    tile.material = tileMaterial

    tile.parent = island
    const columnIndex = i % columns
    const rowIndex = Math.floor(i / columns)
    const y = isLandSize / 2 + tileHeight / 2
    // Adjust the x position to include the gap between each tile, except for the first tile of each row
    const z = (columnIndex * (maxWidth + gap)) - offsetZ
    const x = (rowIndex * (maxWidth + gap)) - offsetX
    tile.position.set(x, y, z)
    tiles.push(tile)
  }

  return null
}

function createBootSprite(scene: Scene, firstPlaceBox: AbstractMesh, spritePath: string, size: any) {
  // boot sprite
  const spriteManager = new SpriteManager('spriteBootManager', spritePath, 1, size, scene)
  const sprite = new Sprite('spriteBoot', spriteManager)
  const firstBoxAbsolutePosition = firstPlaceBox.getAbsolutePosition()
  sprite.width = size.width / 18
  sprite.height = size.height / 18
  sprite.position.set(firstBoxAbsolutePosition.x, firstBoxAbsolutePosition.y + firstPlaceBox.scaling.y / 2 + sprite.height / 1.1, firstBoxAbsolutePosition.z)
}

function renderLeaderboard(scene: Scene, island: Mesh | InstancedMesh) {
  const boxHeight = 10
  const boxWidth = 10

  const material = new PBRMaterial(`LeaderBoardMaterial`, scene)
  material.albedoColor = new Color3(1, 1, 1)
  material.freeze()
  material.roughness = 0.2

  // Create boxes for 1st, 2nd, and 3rd places
  const firstPlaceBox = MeshBuilder.CreateBox('firstPlace', { height: boxHeight, width: boxWidth, depth: boxWidth }, scene)
  // Create materials with colors
  const firstPlaceMaterial = material.clone('firstPlaceMaterial')
  firstPlaceMaterial.freeze()
  firstPlaceBox.material = firstPlaceMaterial

  const secondPlaceBox = firstPlaceBox.createInstance('secondPlace')
  const thirdPlaceBox = firstPlaceBox.createInstance('thirdPlace')
  const fourthPlaceBox = firstPlaceBox.createInstance('fourthPlace')

  // Assign materials to boxes

  // Position the boxes
  firstPlaceBox.position.set(0, isLandSize / 2 + boxHeight / 2, 0)
  secondPlaceBox.position.set(-boxWidth - 8, isLandSize / 2 + (boxHeight) / 2, -boxWidth - 4)
  thirdPlaceBox.position.set(boxWidth + 8, isLandSize / 2 + boxHeight / 2, -boxWidth - 4)
  fourthPlaceBox.position.set(0, isLandSize / 2 + boxHeight / 2, -boxWidth - 13)

  firstPlaceBox.parent = island
  secondPlaceBox.parent = island
  thirdPlaceBox.parent = island
  fourthPlaceBox.parent = island

  createBootSprite(scene, firstPlaceBox, '/sprites/giai-nhat.png', { width: 400, height: 170 })
  createBootSprite(scene, secondPlaceBox, '/sprites/giai-nhi.png', { width: 149, height: 170 })
  createBootSprite(scene, thirdPlaceBox, '/sprites/giai-ba.png', { width: 170, height: 170 })
  createBootSprite(scene, fourthPlaceBox, '/sprites/giai-tu.png', { width: 202, height: 170 })
}

function renderIsland(name: string, scene: Scene) {
  const island = MeshBuilder.CreateBox(name, {
    height: isLandSize,
    width: 70,
    depth: 70,
  }, scene)
  island.position.y = 0

  const material = new PBRMaterial(`${name}Material`, scene)
  material.albedoColor = new Color3(1, 1, 1)
  material.freeze()
  island.material = material
  material.roughness = 0.2

  island.visibility = 0.7
  island.freezeWorldMatrix()

  return island
}

const frames_per_second = 24
const total_frames = 0.5 * frames_per_second

function retargetCamera(scene: Scene, camera: ArcRotateCamera, newTarget: Vector3, radius: number = 70) {
  // Animate target
  const current_target = camera.target.clone()
  const target_position = newTarget.clone()
  const delta_position = target_position.subtract(current_target)
  const delta_distance = delta_position.length()
  const delta_speed = delta_distance / total_frames
  const delta_direction = delta_position.normalize()
  const target_animation = new Animation('camera_target_animation', 'target', frames_per_second, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
  const target_keys = []
  for (let i = 0; i < total_frames; i++) {
    target_keys.push({
      frame: i,
      value: current_target.add(delta_direction.scale(delta_speed * i)),
    })
  }
  target_animation.setKeys(target_keys)
  camera.animations.push(target_animation)

  // Animate radius
  const current_radius = camera.radius
  const delta_radius = radius - current_radius
  const radius_animation = new Animation('camera_radius_animation', 'radius', frames_per_second, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT)
  const radius_keys = []
  for (let i = 0; i < total_frames; i++) {
    radius_keys.push({
      frame: i,
      value: current_radius + delta_radius * (i / total_frames),
    })
  }
  radius_animation.setKeys(radius_keys)
  camera.animations.push(radius_animation)

  // Start animations
  scene.beginAnimation(camera, 0, total_frames, false)
}

let currentActiveIsland: string = 'menu'
let isTileRendered = false

interface Player {
  playerParent: TransformNode
  faceMesh: Mesh
  headMesh: Mesh
}

function getRandomPlayerCoordinate() {
  return Math.random() * 68 - 34 // Math.random() returns a number between 0 and 1, so we multiply by 68 (the range we want) and then subtract 34 to shift the range from 0-68 to -34-34.
}

const players: Map<string, Player> = new Map()
// handle server events

interface Destination {
  uid: string
  position: Vector3
}

const playerDestinations: Destination[] = []

// Function to set a new destination for a player
function setNewDestination(uid: string, position: Vector3) {
  const destination = playerDestinations.find(dest => dest.uid === uid)
  if (destination)
    destination.position = position
  else
    playerDestinations.push({ uid, position })
}

// Function to get a player's destination
function getDestination(uid: string): Vector3 | undefined {
  const destination = playerDestinations.find(dest => dest.uid === uid)
  return destination ? destination.position : undefined
}

// Function to move a player towards their destination
function movePlayer(player: Player, speed: number) {
  let destination = getDestination(player.playerParent.name)
  if (!destination) {
    destination = selectNewDestination()
    setNewDestination(player.playerParent.name, destination)
    return
  }

  const direction = destination.subtract(player.playerParent.position).normalize()
  if (player.playerParent.position.subtract(destination).length() < 0.2) {
    setNewDestination(player.playerParent.name, selectNewDestination())
    return
  }

  if (player.playerParent.position.y > isLandSize / 2 + 0.8)
    player.playerParent.position.addInPlace(direction.scale(speed))
}

function selectNewDestination(): Vector3 {
  // Define the range of possible positions for the new destination
  const minX = -34
  const maxX = 34
  const minZ = -34
  const maxZ = 34

  // Generate a random position within the range
  const x = Math.random() * (maxX - minX) + minX
  const y = isLandSize / 2 + 0.6
  const z = Math.random() * (maxZ - minZ) + minZ

  // Return the new position as a Vector3
  return new Vector3(x, y, z)
}

const blinkAnimation = new Animation('blink', 'visibility', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT)

export function createMenuScene(engine: Engine) {
  // setup global components
  const scene = createScene(engine)
  scene.performancePriority = ScenePerformancePriority.BackwardCompatible
  scene.blockfreeActiveMeshesAndRenderingGroups = true

  createLight(scene)
  createSkybox(scene)

  const probe = new ReflectionProbe('main', 512, scene)
  probe.refreshRate = 3
  if (!probe.renderList)
    throw new Error('probe.renderList is null')

  // setup menu island

  const menuIsland = renderIsland('menu island', scene)
  addToRenderList(probe, menuIsland)
  menuIsland.actionManager = new ActionManager(scene)
  menuIsland.actionManager.registerAction(
    new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => {
        socket.emit(EventNames__MenuClicked, { menuId: 'menu' })
      },
    ),
  )

  const gameIsland = menuIsland.createInstance('game island')
  gameIsland.position.set(-200, 0, 190)
  gameIsland.rotation.y = -Math.PI / 2
  addToRenderList(probe, gameIsland)
  gameIsland.actionManager = new ActionManager(scene)
  gameIsland.actionManager.registerAction(
    new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => {
        socket.emit(EventNames__MenuClicked, { menuId: 'game' })
      },
    ),
  )
  const gameIsLandLight = new HemisphericLight('gameIsLandLight', new Vector3(gameIsland.position.x + 10, gameIsland.position.y + 60, gameIsland.position.z + 10), scene)
  gameIsLandLight.intensity = 0.5

  // setup prize island
  const prizeIsland = menuIsland.createInstance('prize island')
  prizeIsland.position.set(-200, 0, -190)
  addToRenderList(probe, prizeIsland)
  prizeIsland.actionManager = new ActionManager(scene)
  prizeIsland.actionManager.registerAction(
    new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => {
        socket.emit(EventNames__MenuClicked, { menuId: 'prizes' })
      },
    ),
  )
  const prizeIsLandLight = new HemisphericLight('prizeIsLandLight', new Vector3(prizeIsland.position.x + 10, prizeIsland.position.y + 60, prizeIsland.position.z + 10), scene)
  prizeIsLandLight.intensity = 0.5

  renderLeaderboard(scene, prizeIsland)

  const balls = createDragonBalls(20, ballInfo, scene, menuIsland)
  addToRenderList(probe, ...balls)

  const advancedTexture = getGlobalUI()
  for (const ball of balls) {
    ball.actionManager = new ActionManager(ball.getScene())
    ball.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnPointerOverTrigger,
        },
        () => {
          showBallName(ball, advancedTexture)
        },
      ),
    )
    // hide the ball name when the pointer is out
    ball.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnPointerOutTrigger,
        },
        () => {
          advancedTexture.clear()
        },
      ),
    )
    ball.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnPickTrigger,
        },
        () => {
          console.log(ball.id)
          socket.emit(EventNames__MenuClicked, { menuId: ball.id })
        },
      ),
    )
  }

  socket.on(EventNames__SpawnPlayer, (evt: SpawnPlayerEvent) => {
    if (players.has(evt.uid))
      return
    // max 10 players, if more than 10, remove the first one
    if (players.size > 10)
      return

    players.set(evt.uid, spawnPlayer(scene, evt.uid, evt.name, evt.picture, prizeIsland))
  })

  socket.on(EventNames__RemovePlayer, (_evt: RemovePlayerEvent) => {
    // not know how to remove player
  })

  socket.on(EventNames__RenderTiles, (evt: TilesSyncedEvent) => {
    if (isTileRendered)
      return
    renderTiles(scene, gameIsland, evt.tiles)
    isTileRendered = true
  })

  socket.on(EventNames__UpdateTile, (evt: UpdateTileEvent) => {
    const tile = scene.getMeshByName(evt.tileName)
    if (!tile)
      throw new Error(`Tile ${evt.tileName} not found`)

    const tileTexture = new Texture(evt.coverImageUrl, scene)
    const tileMaterial = new StandardMaterial(`tileMaterial${evt.tileName}`, scene)
    tileMaterial.diffuseTexture = tileTexture
    // destroy old material
    tile.material?.dispose()
    tile.material = tileMaterial

    if (!tile.animations.some(animation => animation.name === 'blink')) {
      const keys = []
      const values = [0, 1, 0, 1]
      for (let i = 0; i < values.length; i++) {
        keys.push({
          frame: i * 10,
          value: values[i],
        })
      }
      blinkAnimation.setKeys(keys)
      tile.animations.push(blinkAnimation)
    }

    scene.beginAnimation(tile, 0, 30, false)
  })

  const renderingCanvas = engine.getRenderingCanvas()
  if (!renderingCanvas)
    throw new Error('renderingCanvas is null')

  // setup camera
  const camera = createCamera(renderingCanvas, scene)
  scene.blockfreeActiveMeshesAndRenderingGroups = false

  socket.on(EventNames__FocusToTile, (evt: FocusToTileEvent) => {
  // find tile by name
    const tile = scene.getMeshByName(evt.tileName)
    if (!tile)
      throw new Error(`Tile ${evt.tileName} not found`)
    // show quiz form
    // get tile position in global coordinates
    const globalTilePosition = tile.getAbsolutePosition()

    const target = new Vector3(globalTilePosition.x, globalTilePosition.y, globalTilePosition.z)

    retargetCamera(scene, camera, target, 40)
  })

  const menuCameraAnchor = new Vector3(balls[0].position.x, balls[0].position.y + 10, balls[0].position.z)
  function focusOnMenu() {
    if (currentActiveIsland === 'menu')
      return
    currentActiveIsland = 'menu'
    retargetCamera(scene, camera, menuCameraAnchor)
  }

  const gameCameraAnchor = new Vector3(gameIsland.position.x, gameIsland.position.y + 40, gameIsland.position.z)
  function focusOnGame() {
    console.log(currentActiveIsland)
    if (currentActiveIsland === 'game')
      return

    currentActiveIsland = 'game'
    console.log('currentActiveIsland')

    retargetCamera(scene, camera, gameCameraAnchor)
  }

  function focusOnPrize() {
    if (currentActiveIsland === 'prizes')
      return

    currentActiveIsland = 'prizes'
    retargetCamera(scene, camera, new Vector3(prizeIsland.position.x, prizeIsland.position.y + 40, prizeIsland.position.z))
  }

  socket.on(EventNames__FocusOnMenu, focusOnMenu)
  socket.on(EventNames__FocusOnGame, focusOnGame)
  socket.on(EventNames__FocusOnPrize, focusOnPrize)

  // handle actions
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(
    new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      (evt) => {
        const pickInfo = evt.sourceEvent
        if (pickInfo.hit && pickInfo.pickedMesh)
          console.log(`Tile ${pickInfo.pickedMesh.name} was clicked`)
      },
    ),
  )

  SceneOptimizer.OptimizeAsync(scene)

  scene.actionManager.registerAction( // This will trigger when the user clicks on the island
    new ExecuteCodeAction(
      ActionManager.OnPickTrigger,
      () => {
        console.log('abc')
      },
    ),
  )

  scene.onBeforeRenderObservable.add(() => {
    const speed = 0.05 * scene.getAnimationRatio()
    players.forEach((player, _uid) => {
      movePlayer(player, speed)
    })
  })

  return scene
}
